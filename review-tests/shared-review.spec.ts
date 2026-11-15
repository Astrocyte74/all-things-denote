import { openHuntMenu, openChecklist, openGallery, openMoreOptions, openSharingMenu } from '../tests/hunt-controls';
import { test, expect, type Page, type Browser } from '@playwright/test';
import QRCode from 'qrcode';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import type { StoredPhoto } from '../src/lib/photoStorage';

const API = 'http://127.0.0.1:8788';
async function storedPhotos(page: Page): Promise<StoredPhoto[]> {
  return page.evaluate(() => new Promise(resolve => {
    const req = indexedDB.open('ScavengerHuntPhotos');
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('photos'); tx.objectStore('photos').getAll().onsuccess = event => resolve((event.target as IDBRequest).result); tx.oncomplete = () => db.close(); };
  }));
}
async function capture(page: Page, color: string, name: string) {
  await page.goto('./');
  await page.getByRole('button', { name: /Play on this device/ }).click();
  await page.getByRole('button', { name:'Christmas', exact:true }).click();
  await page.getByRole('button', { name:'Start the hunt', exact:true }).click();
  await page.getByRole('textbox', { name:/Team name/ }).fill(name);
  await page.getByRole('button', { name:/Path A/ }).first().click();
  await page.getByRole('button', { name:"Let's go on Path A" }).click();
  await page.getByRole('button', { name:'Start the hunt on Path A' }).click();
  await page.locator('input[type=file]').setInputFiles({ name:'scene.svg', mimeType:'image/svg+xml', buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480"><rect width="720" height="480" fill="${color}"/><circle cx="550" cy="100" r="64" fill="#ffeaa0"/><path d="M0 480V350L180 180L390 480M240 480L490 230L720 480" fill="#5d8a72"/></svg>`) });
  await expect.poll(async () => (await storedPhotos(page)).length).toBe(1);
  await expect(page.getByRole('button',{name:'Take photo for this challenge',exact:true})).toBeEnabled();
  await openHuntMenu(page);await expect(page.getByRole('menuitem',{name:'Photo gallery',exact:true})).toContainText('1');await page.keyboard.press('Escape');
}
async function makeLeader(browser: Browser, baseURL: string, title: string) {
  const context = await browser.newContext({ baseURL, viewport:{width:1280,height:900}, isMobile:false, hasTouch:false, deviceScaleFactor:1 });
  const page = await context.newPage();
  // Each fixture is a separate event creator. Keep the production five-per-IP
  // limit intact; the API suite tests that limit independently.
  const creator = `browser-test-${crypto.randomUUID()}`;
  await page.route(`${API}/events`, route => route.continue({headers:{...route.request().headers(),'CF-Connecting-IP':creator}}));
  await page.goto('./');
  await page.getByRole('button', {name:'Start an event',exact:true}).click();
  await page.getByRole('radio',{name:/Christmas/}).locator('..').click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('textbox',{name:'Event name',exact:true}).fill(title);
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('switch',{name:'Send photos as we go',exact:true}).click(); // Explicit manual-send fixture.
  await page.getByRole('button',{name:'Create event & show QR',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByText('View invite link',{exact:true}).click();
  const invite = await page.getByRole('textbox',{name:'Team invite link'}).inputValue();
  const leader = page.url();
  expect(new URL(invite).hash).toContain('join=');
  expect(new URL(invite).hash).not.toContain('leader=');
  return {context,page,invite,leader};
}
async function join(page: Page, invite: string, name: string, path = 'A') {
  await page.goto(invite);
  await page.getByRole('button',{name:'Use my own name',exact:true}).click();
  await page.getByRole('textbox',{name:/Your own name/}).fill(name);
  await page.getByRole('button',{name:'Join & start hunt',exact:true}).click();
  await expect(page.getByRole('button',{name:`Start the hunt on Path ${path}`,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back to event',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Choose photos to send'})).toBeVisible();
}
async function refreshLeader(page: Page) {
  await page.getByRole('button',{name:/^Updated /}).click();
  await expect(page.getByRole('button',{name:/^Updated /})).toBeVisible();
}
async function snapshot(page: Page) {
  const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
  const response = await page.request.get(`${API}/events/${params.get('event')}`,{headers:{Authorization:`Bearer ${params.get('leader') || params.get('team')}`}});
  expect(response.ok()).toBeTruthy(); return response.json();
}

test('two team phones upload to one leader; private QR, clue comparison, presentation and ZIP work', async ({page,browser,baseURL},info) => {
  const errors: string[] = []; page.on('pageerror',error=>errors.push(error.message));
  await capture(page,'#c5e7d7','Lost Sheep');
  const local = (await storedPhotos(page))[0];
  const leader = await makeLeader(browser,baseURL!,`Friday discoveries ${info.project.name}`);
  leader.page.on('pageerror',error=>errors.push(error.message));
  // Verify the rendered QR's module matrix against the team invite, not the leader link.
  const qr = leader.page.getByRole('img',{name:/QR code to join/});
  await expect(qr).toBeVisible();
  const expected = QRCode.create(leader.invite,{errorCorrectionLevel:'M'}).modules;
  const actual = await qr.evaluate((image, size) => {
    const canvas=document.createElement('canvas'); const img=image as HTMLImageElement;
    canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d')!; ctx.drawImage(img,0,0); const out:number[]=[];
    const scale=canvas.width/(size+8);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) out.push(ctx.getImageData(Math.floor((x+4.5)*scale),Math.floor((y+4.5)*scale),1,1).data[0]<128?1:0);
    return out;
  },expected.size);
  expect(actual).toEqual(Array.from(expected.data));
  await join(page,leader.invite,'Lost Sheep');
  await expect(page.getByRole('button',{name:'Send 1 photo',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Send 1 photo',exact:true}).click();
  await expect(page.getByText('All 1 sent. The leader can see them now.')).toBeVisible();
  expect((await storedPhotos(page))[0].imageData).toBe(local.imageData);
  await page.screenshot({path:info.outputPath('team-upload-phone.png'),fullPage:true});
  const team2Context = await browser.newContext({baseURL,viewport:{width:390,height:844}});
  const team2 = await team2Context.newPage();
  await capture(team2,'#d6c9f1','Trailblazers');
  await join(team2,leader.invite,'Trailblazers','B');
  await team2.getByRole('button',{name:'Send 1 photo',exact:true}).click();
  await expect(team2.getByText('All 1 sent. The leader can see them now.')).toBeVisible();
  await refreshLeader(leader.page);
  const grid=leader.page.getByRole('list',{name:'Team photos for clue 1'});
  await expect(grid.getByRole('button',{name:/full screen/})).toHaveCount(2);
  await expect(grid).toContainText('Lost Sheep'); await expect(grid).toContainText('Trailblazers');
  await expect(grid.locator('img')).toHaveCount(2);
  await expect.poll(async()=>grid.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await leader.page.screenshot({path:info.outputPath('leader-desktop.png'),fullPage:true});
  await leader.page.getByRole('button',{name:'Show discussion question',exact:true}).click();
  await expect(leader.page.getByText(/star helped guide the wise men/)).toBeVisible();
  await leader.page.getByRole('button',{name:'Present',exact:true}).click();
  await expect(leader.page.getByRole('dialog',{name:'Presenting clue 1',exact:true})).toBeVisible();
  await leader.page.screenshot({path:info.outputPath('presentation-desktop.png'),animations:'disabled'});
  await leader.page.getByRole('button',{name:'Exit presentation'}).click();
  await grid.getByRole('button',{name:'View Lost Sheep, clue 1 full screen'}).click();
  const viewer=leader.page.getByRole('dialog',{name:/Lost Sheep, clue 1:/});
  await expect(viewer).toBeVisible();
  const oneDownload=leader.page.waitForEvent('download');
  await viewer.getByRole('button',{name:'Download',exact:true}).click();
  expect((await oneDownload).suggestedFilename()).toContain('lost-sheep');
  await leader.page.getByRole('button',{name:'Close photo',exact:true}).click();
  await leader.page.getByText('Leader tools',{exact:true}).click();
  const download=leader.page.waitForEvent('download');
  await leader.page.getByRole('button',{name:'Download ZIP (2)'}).click();
  const archive=unzipSync(await readFile((await(await download).path())!));
  expect(Object.keys(archive)).toHaveLength(2);
  expect(Object.keys(archive).every(name=>name.startsWith('01-'))).toBe(true);
  expect(Object.keys(archive).some(name=>name.includes('lost-sheep'))).toBe(true);
  expect(Object.keys(archive).some(name=>name.includes('trailblazers'))).toBe(true);
  expect(Object.values(archive).some(bytes=>Buffer.from(bytes).equals(Buffer.from(local.imageData.split(',')[1],'base64')))).toBe(true);
  // Open the private leader link on a separate phone, as a real leader would.
  const leaderPhoneContext=await browser.newContext({baseURL,viewport:{width:390,height:844}});
  const leaderPhone=await leaderPhoneContext.newPage();
  await leaderPhone.goto(leader.leader);
  await expect(leaderPhone.getByRole('heading',{name:'Compare by clue'})).toBeVisible();
  const phonePhotos = leaderPhone.getByRole('list',{name:'Team photos for clue 1'}).locator('img');
  await expect(phonePhotos).toHaveCount(2);
  await expect.poll(()=>phonePhotos.evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect.poll(()=>leaderPhone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await leaderPhone.screenshot({path:info.outputPath('leader-phone.png'),fullPage:true});
  // A leader's removal must reconcile on a team's next refresh, without
  // deleting its local original or leaving a stale "Sent" state.
  await grid.getByRole('button',{name:'View Lost Sheep, clue 1 full screen'}).click();
  await leader.page.getByRole('button',{name:'Remove photo from event',exact:true}).click();
  await leader.page.getByRole('alertdialog',{name:'Remove this photo from the event?'}).getByRole('button',{name:'Remove',exact:true}).click();
  await expect(grid.getByRole('button',{name:/full screen/})).toHaveCount(1);
  await page.getByRole('button',{name:'Refresh sent status'}).click();
  await expect(page.getByRole('button',{name:'#1 A star or a guiding sign',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Select all',exact:true}).click();
  await page.getByRole('button',{name:'Send 1 photo',exact:true}).click();
  await expect(page.getByText('All 1 sent. The leader can see them now.')).toBeVisible();
  await expect.poll(async()=>(await snapshot(leader.page)).photos.length).toBe(2);
  await page.goto(leader.invite);
  await expect(page.getByRole('button',{name:'Continue as your team'})).toBeVisible();
  await page.getByRole('button',{name:'Continue as your team'}).click();
  expect((await snapshot(leader.page)).teams).toHaveLength(2);
  // Closing/reopening applies across devices; deleting removes server copies only.
  await leader.page.getByRole('button',{name:'Close uploads',exact:true}).click();
  await page.getByRole('button',{name:'Refresh sent status'}).click();
  await expect(page.getByText(/The leader closed uploads/)).toBeVisible();
  await leader.page.getByRole('button',{name:'Reopen uploads',exact:true}).click();
  await leader.page.getByRole('button',{name:'Delete event…',exact:true}).click();
  await leader.page.getByRole('button',{name:'Delete for everyone',exact:true}).click();
  await expect(leader.page.getByRole('heading',{name:'Group events'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:/This link doesn’t work|This event has ended/})).toBeVisible();
  expect((await storedPhotos(page))[0].imageData).toBe(local.imageData);
  expect(errors).toEqual([]);
  await team2Context.close(); await leaderPhoneContext.close(); await leader.context.close();
});

test('lost upload response retries safely; offline reload, saved sessions and link validation recover', async ({page,browser,baseURL},info) => {
  await capture(page,'#ffd8d0','Retry Team');
  // Two distinct photos, generated through the real capture pipeline.
  await page.locator('input[type=file]').setInputFiles({name:'second.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="320" height="480" fill="gold"/></svg>')});
  await expect.poll(async()=>(await storedPhotos(page)).length).toBe(2);
  const leader=await makeLeader(browser,baseURL!,`Retry session ${info.project.name}`);
  await join(page,leader.invite,'Retry Team');
  // Simulate losing the first success response after the real server commits.
  // WebKit's service-worker-controlled XHR bypasses Playwright page.route, so
  // inject the failure at the response callback instead of mocking the API.
  await page.evaluate(()=>{
    const send=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send=function(body){
      if(body instanceof FormData && body.has('photo')){
        XMLHttpRequest.prototype.send=send;
        this.onload=()=>this.onerror?.call(this,new ProgressEvent('error'));
      }
      return send.call(this,body);
    };
  });
  await page.getByRole('button',{name:'Send 2 photos',exact:true}).click();
  await expect(page.getByRole('button',{name:'Retry 1',exact:true})).toBeVisible();
  await expect(page.getByText('Not sent',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Retry 1',exact:true}).click();
  await expect(page.getByText('All 1 sent. The leader can see them now.')).toBeVisible();
  await expect.poll(async()=>(await snapshot(leader.page)).photos.length).toBe(2);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.context().setOffline(true); await page.reload();
  await expect(page.getByText(/You seem to be offline/)).toBeVisible();
  expect((await storedPhotos(page))).toHaveLength(2);
  await page.context().setOffline(false);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByText('Everything on this phone has been sent.')).toBeVisible();
  await page.getByRole('button',{name:'All events',exact:true}).click();
  await page.getByRole('button',{name:'Join an event',exact:true}).click();
  await page.getByRole('textbox',{name:'Or paste the link they sent',exact:true}).fill('https://unrelated.example/#event=11111111-1111-4111-8111-111111111111&leader='+'A'.repeat(43));
  await page.getByRole('button',{name:'Open link',exact:true}).click();
  await expect(page.getByText(/doesn’t look like a group event link/)).toBeVisible();
  await page.getByRole('button',{name:`Open Retry session ${info.project.name}`,exact:true}).click();
  await expect(page.getByText('Everything on this phone has been sent.')).toBeVisible();
  await page.getByRole('button',{name:'All events',exact:true}).click();
  await page.getByRole('button',{name:'Back to games',exact:true}).click();
  await expect(page.locator('.gl-card')).toHaveCount(4);
  await page.goBack(); await expect(page.getByRole('heading',{name:'Group events'})).toBeVisible();
  await leader.context.close();
});

test('teams delete single or all cloud copies, including from another device after uploads close', async ({page,browser,baseURL},info) => {
  await capture(page,'#c5e7d7','Cloud cleanup');
  for (const color of ['gold','plum']) {
    await page.locator('input[type=file]').setInputFiles({name:'extra.svg',mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="320" height="480" fill="${color}"/></svg>`)});
    await expect(page.getByRole('button',{name:'Take photo for this challenge',exact:true})).toBeEnabled();
  }
  await expect.poll(async()=>(await storedPhotos(page)).length).toBe(3);
  const originals = await storedPhotos(page);
  const leader = await makeLeader(browser,baseURL!,`Cloud deletion ${info.project.name}`);
  await join(page,leader.invite,'Cloud cleanup');
  await page.getByRole('button',{name:'Send 3 photos',exact:true}).click();
  await expect(page.getByText('All 3 sent. The leader can see them now.')).toBeVisible();
  const teamLink = page.url();
  const otherContext = await browser.newContext({baseURL});
  const other = await otherContext.newPage();
  await capture(other,'#d6c9f1','Keep my photo');
  await join(other,leader.invite,'Keep my photo','B');
  await other.getByRole('button',{name:'Send 1 photo',exact:true}).click();
  await expect(other.getByText('All 1 sent. The leader can see them now.')).toBeVisible();

  await page.getByRole('button',{name:'Delete cloud copy',exact:true}).first().click();
  let dialog = page.getByRole('alertdialog',{name:'Delete this cloud photo?'});
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  expect((await snapshot(leader.page)).photos).toHaveLength(4);
  await page.getByRole('button',{name:'Delete cloud copy',exact:true}).first().click();
  await dialog.getByRole('button',{name:'Delete cloud photo',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async()=>(await snapshot(page)).photos.length).toBe(2);
  await expect(page.getByRole('button',{name:'Send photos',exact:true})).toBeDisabled();
  expect((await storedPhotos(page)).map(photo=>photo.imageData)).toEqual(originals.map(photo=>photo.imageData));

  await leader.page.getByText('Leader tools',{exact:true}).click();
  await leader.page.getByRole('button',{name:'Close uploads',exact:true}).click();
  await expect(leader.page.getByRole('button',{name:'Reopen uploads',exact:true})).toBeVisible();
  const remoteContext = await browser.newContext({baseURL,viewport:{width:390,height:844}});
  const remote = await remoteContext.newPage();
  await remote.goto(teamLink);
  await expect(remote.getByText(/No Christmas photos on this phone yet/)).toBeVisible();
  const cloud = remote.getByRole('region',{name:'Your uploaded photos'});
  await cloud.getByText('View uploaded photos',{exact:true}).click();
  await expect(cloud.locator('img')).toHaveCount(2);
  await expect.poll(()=>cloud.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  // One deletion succeeds; the next loses connectivity. Retry must finish
  // without re-uploading originals or touching the other team's photo.
  await remote.evaluate(()=>{
    const original = window.fetch; let deletes = 0;
    window.fetch = async (...args) => {
      if (args[1]?.method === 'DELETE' && ++deletes === 2) {
        window.fetch = original;
        throw new TypeError('Synthetic network failure');
      }
      return original(...args);
    };
  });
  await cloud.getByRole('button',{name:'Delete all my uploads',exact:true}).click();
  dialog = remote.getByRole('alertdialog',{name:'Delete your 2 cloud photos?'});
  await dialog.getByRole('button',{name:'Delete cloud photos',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('1 deleted.');
  await expect(dialog.getByRole('button',{name:'Delete cloud photos',exact:true})).toBeEnabled();
  await dialog.getByRole('button',{name:'Delete cloud photos',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(cloud.getByText('You have no photos stored in this event.')).toBeVisible();
  const remaining = (await snapshot(leader.page)).photos;
  expect(remaining).toHaveLength(1);
  expect(remaining[0].teamName).toBe('Keep my photo');
  expect((await storedPhotos(page)).map(photo=>photo.imageData)).toEqual(originals.map(photo=>photo.imageData));
  await leader.page.getByRole('button',{name:'Delete event…',exact:true}).click();
  await leader.page.getByRole('button',{name:'Delete for everyone',exact:true}).click();
  await expect(leader.page.getByRole('heading',{name:'Group events'})).toBeVisible();
  await remoteContext.close(); await otherContext.close(); await leader.context.close();
});

test('joining sets up an isolated team hunt and returns directly to its event', async ({page,browser,baseURL}, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  // A previous local hunt of this same theme must survive joining an event.
  await capture(page, '#ffe18b', 'Old local team');
  const oldPhoto = (await storedPhotos(page))[0];
  const oldProgress = await page.evaluate(() => localStorage.getItem('completedChallenges:christmas'));
  const leader = await makeLeader(browser, baseURL!, `Joined hunt ${info.project.name}`);
  await join(page, leader.invite, 'Scripture Scouts', 'A');
  const teamLink = page.url();
  const team = (await snapshot(page)).team;
  const eventId = new URL(teamLink).hash.match(/event=([^&]+)/)![1];
  await expect(page.getByRole('region', {name:'Your event hunt'})).toContainText('Christmas · Scripture Scouts · Path A');
  await page.getByRole('button', {name:'Open team hunt',exact:true}).click();
  await expect(page.getByRole('textbox', {name:/Team name/})).toHaveCount(0);
  await page.getByRole('button', {name:'Start the hunt on Path A',exact:true}).click();
  await expect(page.getByRole('status', {name:'0 of 12 challenges done'})).toBeAttached();
  await page.locator('input[type=file]').setInputFiles({name:'event.svg', mimeType:'image/svg+xml', buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="skyblue"/></svg>')});
  await expect.poll(async () => (await storedPhotos(page)).length).toBe(2);
  const eventPhoto = (await storedPhotos(page)).find(photo => photo.id !== oldPhoto.id)!;
  expect(eventPhoto.packId).toBe('christmas');
  expect(eventPhoto.teamName).toBe('Scripture Scouts');
  expect(eventPhoto.pathId).toBe('A');
  expect(eventPhoto.huntId).toBe(`event:${eventId}:${team.id}`);
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:christmas'))).toBe(oldProgress);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teamNameByPack')!).christmas)).toBe('Old local team');
  await page.reload();
  await expect(page.getByRole('status', {name:'1 of 12 challenges done'})).toBeAttached();
  await openChecklist(page);
  await openGallery(page);
  await expect(page.getByRole('button', {name:/View photo for #.*full screen/})).toHaveCount(1);
  await page.getByRole('button', {name:'Close photo gallery',exact:true}).click();
  await openSharingMenu(page);await page.getByRole('button', {name:/Back to event · send photos/}).click();
  expect(page.url()).toBe(teamLink);
  await expect(page.getByRole('region', {name:'Your event hunt'})).toBeVisible();
  await page.screenshot({path:info.outputPath('event-team-ready.png'),fullPage:true});
  // Re-scanning the invitation reuses the existing team, without duplicate entry.
  await page.goto(leader.invite);
  await page.getByRole('button', {name:'Continue as your team',exact:true}).click();
  await page.getByRole('button', {name:'Open team hunt',exact:true}).click();
  await expect(page.getByRole('status', {name:'1 of 12 challenges done'})).toBeAttached();
  expect((await snapshot(leader.page)).teams).toHaveLength(1);
  // A second team on the phone has its own fresh progress and photo collection.
  await page.goto(leader.invite);
  await page.getByRole('button', {name:'Join as a different team on this phone',exact:true}).click();
  await page.getByRole('button', {name:'Use my own name',exact:true}).click();
  await page.getByRole('textbox', {name:/Your own name/}).fill('New team');
  await page.getByRole('button', {name:'Join & start hunt',exact:true}).click();
  await page.getByRole('button', {name:'Start the hunt on Path B',exact:true}).click();
  await expect(page.getByRole('status', {name:'0 of 12 challenges done'})).toBeAttached();
  await expect(page.getByRole('button', {name:'Hunt menu',exact:true})).toBeVisible();
  expect(await storedPhotos(page)).toHaveLength(2);
  await page.goto(teamLink);
  await page.getByRole('button', {name:'Open team hunt',exact:true}).click();
  await expect(page.getByRole('status', {name:'1 of 12 challenges done'})).toBeAttached();
  await page.screenshot({path:info.outputPath('event-hunt-phone.png')});
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('status', {name:'1 of 12 challenges done'})).toBeAttached();
  await openChecklist(page);
  await openMoreOptions(page);
  await page.getByRole('menuitem', {name:'Back to home'}).click();await page.getByRole('button',{name:'Go to home',exact:true}).click();
  // Opening a local game must not make the saved event hunt disappear.
  await page.getByRole('button', {name:'Christmas',exact:true}).click();
  await page.getByRole('button', {name:'All games',exact:true}).click();
  await page.getByText('Saved team hunts on this device (2)', {exact:true}).click();
  await page.getByRole('button', {name:'Continue Scripture Scouts',exact:true}).click();
  await expect(page.getByRole('status', {name:'1 of 12 challenges done'})).toBeAttached();
  await openChecklist(page);
  await openMoreOptions(page);
  await page.getByRole('menuitem', {name:'Start over',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toContainText('Scripture Scouts');
  await page.getByRole('button', {name:/^Start fresh/}).click();
  await page.getByRole('button', {name:'Delete & start fresh',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Start the hunt on Path A',exact:true})).toBeVisible();
  expect((await storedPhotos(page)).map(photo => photo.id)).toEqual([oldPhoto.id]);
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:christmas'))).toBe(oldProgress);
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
  await leader.context.close();
});
