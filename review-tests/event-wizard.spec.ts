import { test, expect, type Page } from '@playwright/test';
import { PACKS } from '../src/data/packs';
import { eventNameSuggestions, shuffledSuggestions } from '../src/lib/eventNames';
import { TEAM_NAME_IDEAS, teamNameKey } from '../src/lib/teamNaming';

const API = 'http://127.0.0.1:8788';
type EventFixture = {access:{eventId:string;token:string};snapshot:{joinToken:string;event:{title:string}}};
let created: EventFixture[], errors: string[];
test.beforeEach(({page}) => {created=[];errors=[];page.on('pageerror',e=>errors.push(e.message));});
test.afterEach(async ({request}) => {
  for(const event of created) await request.delete(`${API}/events/${event.access.eventId}`,{headers:{Authorization:`Bearer ${event.access.token}`}});
  expect(errors).toEqual([]);
});
const submitJoin = (page:Page) => page.getByRole('button',{name:/^Join (as |&|event)/}).last();
async function eventFor(page:Page, baseURL:string, teamNaming?:unknown) {
  const response=await page.request.post(`${API}/events`,{headers:{'CF-Connecting-IP':`wizard-${crypto.randomUUID()}`},data:{title:'Quick event',packId:'christmas',teamNaming}});
  expect(response.status()).toBe(201);
  const event=await response.json();created.push(event);
  return {event,invite:`${baseURL}#event=${event.access.eventId}&join=${event.snapshot.joinToken}`};
}
async function state(page:Page,event:EventFixture) {
  const response=await page.request.get(`${API}/events/${event.access.eventId}`,{headers:{Authorization:`Bearer ${event.access.token}`}});
  expect(response.ok()).toBe(true);return response.json();
}
const noOverflow = (page:Page) => expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

test('wizard preserves choices, previews games, refreshes ideas, and creates the selected naming policy',async({page},info)=>{
  await page.route(`${API}/events`,route=>route.continue({headers:{...route.request().headers(),'CF-Connecting-IP':`wizard-${crypto.randomUUID()}`}}));
  let creations=0;page.on('request',req=>{if(req.url()===`${API}/events`&&req.method()==='POST')creations++;});
  await page.goto('./');await page.getByRole('button',{name:'Start an event',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Pick a game',exact:true})).toBeFocused();
  await page.getByRole('radio',{name:/Scripture Detectives/}).locator('..').click();
  await expect(page.getByText('12 photo clues',{exact:true})).toBeVisible();
  await expect(page.getByText('Sample clue',{exact:true})).toBeVisible();
  await expect(page.getByText(/Thy word is a lamp/)).toBeVisible();
  await noOverflow(page);await page.screenshot({path:info.outputPath('wizard-game-phone.png'),fullPage:true});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Event name',exact:true});
  const ideas=page.getByRole('list',{name:'Ideas',exact:true});
  const before=await ideas.getByRole('button').allTextContents();
  await ideas.getByRole('button').first().click();const selected=await input.inputValue();
  await page.getByRole('button',{name:'More ideas',exact:true}).click();
  expect(await ideas.getByRole('button').allTextContents()).not.toEqual(before);
  await expect(input).toHaveValue(selected);
  await input.fill('Our own November adventure');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('radio',{name:/Christmas/}).locator('..').click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(input).toHaveValue('Our own November adventure');
  await page.screenshot({path:info.outputPath('wizard-name-phone.png'),fullPage:true});
  await input.press('Enter');await expect(page.getByRole('heading',{name:'Team names',exact:true})).toBeVisible();
  expect(creations).toBe(0);
  await expect(page.getByRole('radio',{name:/^Allow all/})).toBeChecked();
  await page.screenshot({path:info.outputPath('wizard-default-phone.png'),fullPage:true});
  await page.getByRole('radio',{name:/^Customize/}).locator('..').click();
  await page.getByRole('radio',{name:'Random',exact:true}).locator('..').click();
  await expect(page.getByRole('switch',{name:'Teams can type their own name',exact:true})).not.toBeChecked();
  // An explicit permission survives assignment changes and leaving this step.
  await page.getByRole('switch',{name:'Teams can type their own name',exact:true}).click();
  await page.getByRole('radio',{name:'Teams choose',exact:true}).locator('..').click();
  await page.getByRole('radio',{name:'Random',exact:true}).locator('..').click();
  await expect(page.getByRole('switch',{name:'Teams can type their own name',exact:true})).toBeChecked();
  await page.getByRole('radio',{name:'Only names I pick',exact:true}).locator('..').click();
  const create=page.getByRole('button',{name:'Create event & show QR',exact:true});
  await expect(create).toBeDisabled();
  await page.getByRole('button',{name:'Bright Sparks',exact:true}).click();
  await page.getByRole('textbox',{name:'Add your own name',exact:true}).fill('Our Explorers');
  await page.getByRole('textbox',{name:'Add your own name',exact:true}).press('Enter');
  expect(creations).toBe(0);
  await expect(page.getByRole('button',{name:'Remove Our Explorers',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByRole('radio',{name:'Random',exact:true})).toBeChecked();
  await page.getByRole('radio',{name:'Teams choose',exact:true}).locator('..').click();
  await page.getByRole('radio',{name:'Random',exact:true}).locator('..').click();
  await expect(page.getByRole('switch',{name:'Teams can type their own name',exact:true})).toBeChecked();
  await page.getByRole('switch',{name:'Teams can type their own name',exact:true}).click();
  await expect(page.getByRole('button',{name:'Remove Our Explorers',exact:true})).toBeVisible();
  await noOverflow(page);await page.screenshot({path:info.outputPath('wizard-settings-phone.png'),fullPage:true});
  const responsePromise=page.waitForResponse(r=>r.url()===`${API}/events`&&r.request().method()==='POST');
  await create.click();const response=await responsePromise;expect(response.status()).toBe(201);
  const event=await response.json();created.push(event);
  expect(event.snapshot.event.packId).toBe('christmas');
  expect(event.snapshot.event.teamNaming).toEqual({pool:'selected',names:['Bright Sparks','Our Explorers'],assignment:'random',allowCustom:false});
  const inviteDialog = page.getByRole('dialog', {name: 'Invite QR code'});
  await expect(inviteDialog.getByRole('img', {name:/QR code to join/})).toBeInViewport({ratio:1});
  await inviteDialog.getByRole('button', {name:'Close QR code'}).click();
  await expect(page.getByRole('heading',{name:'Our own November adventure',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:/QR code to join/})).toBeVisible();
  expect(creations).toBe(1);
});

test('two phones claiming one name recover with fresh names, automatic paths and direct hunt entry',async({page,browser,baseURL},info)=>{
  const {event,invite}=await eventFor(page,baseURL!,{pool:'selected',names:['Bright Sparks'],assignment:'choose',allowCustom:true});
  const otherContext=await browser.newContext({baseURL,viewport:{width:390,height:844}});
  try{
    const other=await otherContext.newPage();other.on('pageerror',e=>errors.push(e.message));
    await page.goto(invite);await other.goto(invite);
    for(const phone of [page,other]){
      await phone.getByRole('radio',{name:'Bright Sparks',exact:true}).locator('..').click();
      await expect(phone.getByRole('radio',{name:/Path /})).toHaveCount(0);
    }
    await noOverflow(page);await page.screenshot({path:info.outputPath('join-names-phone.png'),fullPage:true});
    await submitJoin(page).click();
    await expect(page.getByRole('button',{name:'Start the hunt on Path A',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Choose photos to send',exact:true})).toHaveCount(0);
    await submitJoin(other).click();
    await expect(other.getByRole('alert')).toContainText('just taken');
    await expect(other.getByRole('radio',{name:'Bright Sparks',exact:true})).toHaveCount(0);
    await expect(other.getByRole('radiogroup',{name:'Team names',exact:true}).getByRole('radio')).toHaveCount(6);
    await other.getByRole('button',{name:'Use my own name',exact:true}).click();
    await other.getByRole('textbox',{name:/Your own name/}).fill('Our Name');
    await submitJoin(other).click();
    await expect(other.getByRole('button',{name:'Start the hunt on Path B',exact:true})).toBeVisible();
    const snapshot=await state(page,event);
    expect(snapshot.teams.map((t:{name:string})=>t.name)).toEqual(['Bright Sparks','Our Name']);
    await page.getByRole('button',{name:'Start the hunt on Path A',exact:true}).click();
    await expect(page.getByRole('status',{name:'0 of 12 clues done'})).toBeAttached();
  }finally{await otherContext.close();}
});

test('random join recovers a lost response after reload without changing team or path',async({page,baseURL},info)=>{
  const {event,invite}=await eventFor(page,baseURL!,{pool:'selected',names:['Only First'],assignment:'random',allowCustom:false});
  await page.goto(invite);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Use my own name',exact:true})).toHaveCount(0);
  await noOverflow(page);await page.screenshot({path:info.outputPath('join-random-phone.png'),fullPage:true});
  await page.evaluate(()=>{
    const original=window.fetch;
    window.fetch=async(...args)=>{
      const response=await original(...args);
      if(String(args[0]).endsWith('/teams')&&args[1]?.method==='POST'){
        window.fetch=original;
        throw new TypeError('Synthetic lost join response');
      }
      return response;
    };
  });
  await submitJoin(page).click();
  await expect(page.getByRole('alert')).toContainText('Reconnect and try again');
  const before=await state(page,event);expect(before.teams).toHaveLength(1);
  expect(before.teams[0].name).toBe('Only First');
  await page.reload();await submitJoin(page).click();
  await expect(page.getByRole('button',{name:'Start the hunt on Path A',exact:true})).toBeVisible();
  expect((await state(page,event)).teams).toEqual(before.teams);
});

test('full and newly closed invites explain why joining is unavailable',async({page,baseURL})=>{
  const {event,invite}=await eventFor(page,baseURL!,{pool:'all',names:[],assignment:'random',allowCustom:false});
  await page.goto(invite);
  await expect(submitJoin(page)).toBeVisible();
  await page.request.patch(`${API}/events/${event.access.eventId}`,{headers:{Authorization:`Bearer ${event.access.token}`},data:{closed:true}});
  await submitJoin(page).click();
  await expect(page.getByRole('status').filter({hasText:'The leader has closed this event'})).toBeVisible();
  await page.request.patch(`${API}/events/${event.access.eventId}`,{headers:{Authorization:`Bearer ${event.access.token}`},data:{closed:false}});
  for(let i=0;i<20;i++){
    const response=await page.request.post(`${API}/events/${event.access.eventId}/teams`,{headers:{Authorization:`Bearer ${event.snapshot.joinToken}`},data:{name:'',nameSource:'random',token:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')}});
    expect(response.status()).toBe(200);
  }
  await page.reload();
  await expect(page.getByText(/20-team limit|event is full/i)).toBeVisible();
  await expect(submitJoin(page)).toHaveCount(0);
});

test('name libraries support all packs, local month ideas and fresh bounded batches',()=>{
  for(const pack of PACKS){
    const names=eventNameSuggestions(pack,new Date(2026,10,14));
    expect(names.length).toBeGreaterThanOrEqual(50);
    expect(names.some(n=>n.includes('November')&&n.includes(pack.title))).toBe(true);
    expect(names.every(n=>Array.from(n).length<=60)).toBe(true);
    const first=shuffledSuggestions(names),second=shuffledSuggestions(names,6,first);
    expect(first).toHaveLength(6);expect(second).toHaveLength(6);
    expect(second.some(n=>first.includes(n))).toBe(false);
  }
  expect(new Set(TEAM_NAME_IDEAS.map(teamNameKey)).size).toBe(TEAM_NAME_IDEAS.length);
  expect(shuffledSuggestions(['One','One','Two'],6,['One'])).toEqual(['Two','One']);
});
