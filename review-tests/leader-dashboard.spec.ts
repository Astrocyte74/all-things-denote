import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
const API='http://127.0.0.1:8788';
type Access={eventId:string;token:string};
type Created={access:Access;snapshot:{joinToken:string;event:{expiresAt:number}}};
let created:Created[]=[];
test.beforeEach(()=>{created=[];});
test.afterEach(async({request})=>{for(const e of created)await request.delete(`${API}/events/${e.access.eventId}`,{headers:{Authorization:`Bearer ${e.access.token}`}});});
async function make(request:APIRequestContext,baseURL:string){
 const r=await request.post(`${API}/events`,{headers:{'CF-Connecting-IP':crypto.randomUUID()},data:{title:'Dashboard test',packId:'christmas'}});expect(r.status()).toBe(201);const e=await r.json();created.push(e);
 return {...e,leader:`${baseURL}#event=${e.access.eventId}&leader=${e.access.token}`,invite:`${baseURL}#event=${e.access.eventId}&join=${e.snapshot.joinToken}`};
}
async function state(request:APIRequestContext,access:Access){const r=await request.get(`${API}/events/${access.eventId}`,{headers:{Authorization:`Bearer ${access.token}`}});expect(r.ok()).toBeTruthy();return r.json();}
async function edit(request:APIRequestContext,access:Access,changes:object){return request.patch(`${API}/events/${access.eventId}`,{headers:{Authorization:`Bearer ${access.token}`},data:changes});}
async function join(page:Page,invite:string,name:string,path='A'){
 await page.goto(invite);await page.getByRole('button',{name:'Use my own name',exact:true}).click();await page.getByRole('textbox',{name:/Your own name/}).fill(name);await page.getByRole('button',{name:'Join & start hunt',exact:true}).click();await expect(page.getByRole('button',{name:`Start the hunt on Path ${path}`,exact:true})).toBeVisible();
}
const refresh=(page:Page)=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
const dialog=(page:Page)=>page.getByRole('dialog',{name:'Edit event',exact:true});
const photo={name:'test.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="gold"/></svg>')};

test('leader edits title and future team options; an already-open invite refreshes the changed policy',async({page,browser,request,baseURL},info)=>{
 const e=await make(request,baseURL!);const ctx=await browser.newContext({baseURL});const team=await ctx.newPage();
 try{
  await join(team,e.invite,'Keep our identity');const original=(await state(request,e.access)).teams[0];
  await team.goto(e.invite);await team.getByRole('button',{name:'Join as a different team on this phone',exact:true}).click();await team.getByRole('button',{name:'Use my own name',exact:true}).click();await team.getByRole('textbox',{name:/Your own name/}).fill('Stale custom choice');
  await page.goto(e.leader);await expect(page.getByRole('heading',{name:'Team progress',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit event',exact:true}).first().click();await dialog(page).getByRole('textbox',{name:'Event name',exact:true}).fill('Discard this draft');await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();expect((await state(request,e.access)).event.title).toBe('Dashboard test');
  await page.getByRole('button',{name:'Edit event',exact:true}).first().click();const form=dialog(page);await form.getByRole('textbox',{name:'Event name',exact:true}).fill('New event title');
  await form.getByRole('radio',{name:/^Customize/}).locator('..').click();await form.getByRole('radio',{name:'Random',exact:true}).locator('..').click();await form.getByRole('radio',{name:'Only names I pick',exact:true}).locator('..').click();await form.getByRole('button',{name:'Bright Sparks',exact:true}).click();
  await expect(form.getByRole('switch',{name:'Teams can type their own name'})).not.toBeChecked();
  await page.screenshot({path:info.outputPath('edit-event-phone.png')});
  await form.getByRole('button',{name:'Save changes',exact:true}).click();await expect(form).toHaveCount(0);await expect(page.getByRole('heading',{name:'New event title',exact:true})).toBeVisible();
  const changed=await state(request,e.access);expect(changed.teams[0]).toEqual(original);expect(changed.joinToken).toBe(e.snapshot.joinToken);expect(changed.event.expiresAt).toBe(e.snapshot.event.expiresAt);
  await team.getByRole('button',{name:'Join & start hunt',exact:true}).click();await expect(team.getByRole('alert')).toContainText('updated the team-name options');await expect(team.getByRole('textbox',{name:/Your own name/})).toHaveCount(0);await expect(team.getByText('Your team name is a surprise')).toBeVisible();
  await team.getByRole('button',{name:'Join & start hunt',exact:true}).click();await expect(team.getByRole('button',{name:'Start the hunt on Path B',exact:true})).toBeVisible();expect((await state(request,e.access)).teams[1].name).toBe('Bright Sparks');
 }finally{await ctx.close();}
});

test('stale leader edits preserve the draft and require an explicit conflict choice',async({page,request,baseURL},info)=>{
 const e=await make(request,baseURL!);await page.goto(e.leader);await page.getByRole('button',{name:'Edit event',exact:true}).first().click();const form=dialog(page);const title=form.getByRole('textbox',{name:'Event name',exact:true});
 await title.fill('My unsaved edit');expect((await edit(request,e.access,{title:'Another leader edit',settingsRevision:0})).status()).toBe(200);
 await form.getByRole('button',{name:'Save changes',exact:true}).click();await expect(form.getByRole('alert')).toContainText('Another leader changed');await expect(title).toHaveValue('My unsaved edit');await expect(form.getByRole('button',{name:'Save changes',exact:true})).toBeDisabled();
 await page.screenshot({path:info.outputPath('settings-conflict-phone.png')});
 await form.getByRole('button',{name:'Load their latest settings',exact:true}).click();await expect(title).toHaveValue('Another leader edit');await title.fill('Agreed final name');
 // A background refresh must not replace an unsaved draft.
 await refresh(page);await expect(title).toHaveValue('Agreed final name');
 await form.getByRole('button',{name:'Save changes',exact:true}).click();await expect(form).toHaveCount(0);expect((await state(request,e.access)).event.title).toBe('Agreed final name');
 await page.getByRole('button',{name:'Edit event',exact:true}).first().click();await dialog(page).getByRole('textbox',{name:'Event name',exact:true}).fill('Explicit override');
 await edit(request,e.access,{title:'New remote title',settingsRevision:2});await refresh(page);await expect(dialog(page).getByRole('alert')).toContainText('Another leader changed');await dialog(page).getByRole('button',{name:'Keep mine (Save replaces theirs)',exact:true}).click();await dialog(page).getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog(page)).toHaveCount(0);expect((await state(request,e.access)).event.title).toBe('Explicit override');
});

test('dashboard separates clue progress from photos, catches up after offline reload, and reflects resets',async({page,browser,request,baseURL},info)=>{
 const e=await make(request,baseURL!);const ctx=await browser.newContext({baseURL,viewport:{width:1280,height:900}}),leader=await ctx.newPage();
 try{
  await join(page,e.invite,'Progress team');let photoUploads=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/photos'))photoUploads++;});
  const waiting=await request.post(`${API}/events/${e.access.eventId}/teams`,{headers:{Authorization:`Bearer ${e.snapshot.joinToken}`},data:{name:'Waiting team',nameSource:'custom',token:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')}});expect(waiting.ok()).toBeTruthy();
  await leader.goto(e.leader);await expect(leader.getByRole('list',{name:'Teams',exact:true})).toContainText('Waiting for first progress');await expect(leader.getByRole('progressbar',{name:/Progress team/})).toHaveCount(0);
  await page.getByRole('button',{name:'Start the hunt on Path A',exact:true}).click();await expect.poll(async()=>(await state(request,e.access)).teams[0].progress?.completedChallengeIds.length).toBe(0);
  await page.getByRole('button',{name:'Mark as done',exact:true}).click();await expect.poll(async()=>(await state(request,e.access)).teams[0].progress?.completedChallengeIds.length).toBe(1);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.getByRole('button',{name:'Next challenge',exact:true}).last().click();await page.locator('input[type=file]').setInputFiles(photo);await expect(page.getByText('Nailed it!',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Next challenge',exact:true}).last().click();await page.getByRole('button',{name:'Mark as done',exact:true}).click();await page.reload();await expect(page.getByRole('status',{name:'3 of 12 challenges done'})).toBeAttached();expect((await state(request,e.access)).teams[0].progress.completedChallengeIds).toHaveLength(1);
  await page.context().setOffline(false);await expect.poll(async()=>(await state(request,e.access)).teams[0].progress?.completedChallengeIds.length).toBe(3);expect(photoUploads).toBe(0);
  await refresh(leader);await expect(leader.getByRole('progressbar',{name:'Progress team: 3 of 12 clues completed'})).toHaveAttribute('aria-valuenow','3');await expect(leader.getByRole('list',{name:'Teams',exact:true})).toContainText('0 photos');await leader.getByRole('button',{name:'Show clue-by-clue grid',exact:true}).click();await leader.screenshot({path:info.outputPath('dashboard-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:/Back to event · send photos/}).click();await page.getByRole('button',{name:'Send 1 photo',exact:true}).click();await expect(page.getByText('All 1 sent. The leader can see them now.')).toBeVisible();await refresh(leader);await expect(leader.getByRole('list',{name:'Teams',exact:true})).toContainText('1 photo');expect((await state(request,e.access)).teams[0].progress.completedChallengeIds).toHaveLength(3);
  await page.getByRole('button',{name:'Open team hunt',exact:true}).click();await page.getByRole('button',{name:'Back to all tasks overview'}).click();await page.getByRole('button',{name:'More hunt options'}).click();await page.getByRole('menuitem',{name:'Start over',exact:true}).click();await page.getByRole('button',{name:/^Reset progress/}).click();await expect.poll(async()=>(await state(request,e.access)).teams[0].progress?.completedChallengeIds.length).toBe(0);expect((await state(request,e.access)).photos).toHaveLength(1);
  await page.goto(e.leader);await expect(page.getByRole('progressbar',{name:'Progress team: 0 of 12 clues completed'})).toBeVisible();await page.getByRole('button',{name:'Show clue-by-clue grid',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('dashboard-phone.png'),fullPage:true});
 }finally{await page.context().setOffline(false);await ctx.close();}
});

test('a lost progress response retries after reload without duplicating or changing its recorded update',async({page,request,baseURL})=>{
 const e=await make(request,baseURL!);await join(page,e.invite,'Retry team');
 await page.evaluate(()=>{const original=window.fetch;window.fetch=async(...args)=>{const result=await original(...args);if(String(args[0]).endsWith('/progress')){window.fetch=original;throw new TypeError('Synthetic lost response');}return result;};});
 await page.getByRole('button',{name:'Start the hunt on Path A',exact:true}).click();await expect.poll(async()=>(await state(request,e.access)).teams[0].progress?.completedChallengeIds.length).toBe(0);const before=(await state(request,e.access)).teams[0].progress;
 await page.reload();await expect.poll(()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('eventProgress:v1')||'{}')).every(v=>(v as {synced:boolean}).synced))).toBe(true);expect((await state(request,e.access)).teams[0].progress).toEqual(before);
});
