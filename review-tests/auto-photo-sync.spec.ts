import { openGallery, openSharingMenu } from '../tests/hunt-controls';
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
const API='http://127.0.0.1:8788';
type Access={eventId:string;token:string};let created:Access[]=[];
test.beforeEach(()=>{created=[];});test.afterEach(async({request})=>{for(const a of created)await request.delete(`${API}/events/${a.eventId}`,{headers:{Authorization:`Bearer ${a.token}`}});});
async function make(request:APIRequestContext,baseURL:string,autoUploadDefault=true){const r=await request.post(`${API}/events`,{headers:{'CF-Connecting-IP':crypto.randomUUID()},data:{title:'Discoveries live',packId:'christmas',autoUploadDefault}});expect(r.status()).toBe(201);const e=await r.json();created.push(e.access);return {...e,invite:`${baseURL}#event=${e.access.eventId}&join=${e.snapshot.joinToken}`,leader:`${baseURL}#event=${e.access.eventId}&leader=${e.access.token}`};}
async function state(request:APIRequestContext,a:Access){const r=await request.get(`${API}/events/${a.eventId}`,{headers:{Authorization:`Bearer ${a.token}`}});expect(r.ok()).toBeTruthy();return r.json();}
async function openSharing(page:Page){if(!await page.getByRole('dialog',{name:'Photo sharing',exact:true}).isVisible())await openSharingMenu(page);}
async function closeSharing(page:Page){if(await page.getByRole('button',{name:'Close photo sharing',exact:true}).isVisible())await page.getByRole('button',{name:'Close photo sharing',exact:true}).click();}
const sharing=(page:Page)=>page.getByRole('switch',{name:'Send photos as we go',exact:true});
async function join(page:Page,invite:string,off=false){await page.goto(invite);await expect(sharing(page)).toBeChecked();if(off)await sharing(page).click();await page.getByRole('button',{name:'Use my own name',exact:true}).click();await page.getByRole('textbox',{name:/Your own name/}).fill('Discovery team');await page.getByRole('button',{name:'Join & start hunt',exact:true}).click();await expect(page.getByRole('button',{name:'Start the hunt on Path A',exact:true})).toBeVisible();await page.getByRole('button',{name:'Start the hunt on Path A',exact:true}).click();await expect(page.getByRole('button',{name:'Hunt menu',exact:true})).toBeVisible();}
const image=(color='gold')=>({name:'test.svg',mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><rect width="360" height="480" fill="${color}"/></svg>`)});
async function dbRows(page:Page,store='photos'):Promise<Array<{id:string;attempts?:number;error?:string}>>{return page.evaluate(store=>new Promise((resolve,reject)=>{const r=indexedDB.open('ScavengerHuntPhotos');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(store);const q=tx.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);tx.oncomplete=()=>db.close();};}),store);}
async function capture(page:Page,color='gold'){await closeSharing(page);const before=(await dbRows(page)).length;await page.getByLabel('Take photo',{exact:true}).setInputFiles(image(color));await expect.poll(async()=>(await dbRows(page)).length).toBe(before+1);}
const refresh=(page:Page)=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
async function openViewer(page:Page){await openGallery(page);await page.getByRole('button',{name:/View photo for .*full screen/}).first().click();}

test('automatic captures, retakes and offline deletions update the leader while device copies remain local',async({page,browser,request,baseURL},info)=>{
 const e=await make(request,baseURL!);const ctx=await browser.newContext({baseURL,viewport:{width:1280,height:900}}),leader=await ctx.newPage();
 try{
  await join(page,e.invite);await capture(page);await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(1);const first=(await state(request,e.access)).photos[0];expect((await dbRows(page)).length).toBe(1);
  await leader.goto(e.leader);await expect(leader.getByRole('list',{name:'Teams',exact:true})).toContainText('1 photo');
  await page.screenshot({path:info.outputPath('auto-send-hunt-phone.png')});
  await openViewer(page);
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<typeof put>){const r=put.apply(this,args);if(this.name==='photos'){IDBObjectStore.prototype.put=put;r.addEventListener('success',()=>this.transaction.abort());}return r;};});
  await page.getByRole('button',{name:'Retake photo',exact:true}).click();await page.getByLabel('Retake photo file',{exact:true}).setInputFiles(image('red'));await expect(page.getByText('Couldn’t save the retake. Your previous photo is still here. Try again.')).toBeVisible();expect((await dbRows(page))[0].id).toBe(first.localPhotoId);expect((await state(request,e.access)).photos[0].id).toBe(first.id);expect((await dbRows(page,'photoSyncJobs')).length).toBe(0);
  await page.getByRole('button',{name:'Retake photo',exact:true}).click();await page.getByLabel('Retake photo file',{exact:true}).setInputFiles(image('skyblue'));
  await expect.poll(async()=>(await dbRows(page))[0]?.id).not.toBe(first.localPhotoId);await expect.poll(async()=>{const s=await state(request,e.access);return s.photos.length===1&&s.photos[0].localPhotoId!==first.localPhotoId;}).toBe(true);expect((await dbRows(page)).length).toBe(1);
  // Delete from the gallery while offline; the queued deletion survives a reload.
  await page.getByRole('button',{name:/View photo for .*full screen/}).first().click();await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await page.getByRole('button',{name:'Delete photo',exact:true}).click();await expect(page.getByText(/also removes the leader’s cloud copy/)).toBeVisible();await page.getByRole('button',{name:'Delete',exact:true}).click();await expect.poll(async()=>(await dbRows(page)).length).toBe(0);expect((await state(request,e.access)).photos.length).toBe(1);await page.reload();await page.context().setOffline(false);
  await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(0);await expect.poll(async()=>(await dbRows(page,'photoSyncJobs')).length).toBe(0);
  await refresh(leader);await expect(leader.getByRole('list',{name:'Teams',exact:true})).toContainText('0 photos');
 }finally{await page.context().setOffline(false);await ctx.close();}
});

test('team override, new captures only, queued upload cancellation and event-default edits preserve the choice',async({page,request,baseURL})=>{
 const e=await make(request,baseURL!);await join(page,e.invite,true);await capture(page);expect((await state(request,e.access)).photos.length).toBe(0);
 await openSharing(page);await sharing(page).click();await expect(sharing(page)).toBeChecked();expect((await dbRows(page,'photoSyncJobs')).length).toBe(0);await capture(page,'pink');await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(1);expect((await dbRows(page)).length).toBe(2);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.context().setOffline(true);await capture(page,'green');await expect.poll(async()=>(await dbRows(page,'photoSyncJobs')).length).toBe(1);await openSharing(page);await sharing(page).click();await expect.poll(async()=>(await dbRows(page,'photoSyncJobs')).length).toBe(0);await page.reload();await openSharing(page);await expect(sharing(page)).not.toBeChecked();await page.context().setOffline(false);expect((await state(request,e.access)).photos.length).toBe(1);
 await page.getByRole('button',{name:/Back to event · send photos/}).click();await expect(sharing(page)).not.toBeChecked();await page.getByRole('button',{name:'Send 2 photos',exact:true}).click();await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(3);
 await page.goto(e.leader);await page.getByRole('button',{name:'Edit event',exact:true}).first().click();await sharing(page).click();await page.getByRole('button',{name:'Save changes',exact:true}).click();expect((await state(request,e.access)).event.autoUploadDefault).toBe(false);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sharedReviews:v1')!));const team=saved.find((entry:{access:Access&{role:string}})=>entry.access.role==='team').access;await page.goto(`${baseURL}#event=${team.eventId}&team=${team.token}`);await expect(sharing(page)).not.toBeChecked();
});

test('lost upload reply and leader deletion never resurrect a photo; closing uploads pauses sending but permits deletion',async({page,request,baseURL})=>{
 const e=await make(request,baseURL!);await join(page,e.invite);
 // WebKit service-worker XHR bypasses page.route; lose the real success callback.
 await page.evaluate(()=>{const send=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(body){if(body instanceof FormData&&body.has('photo')){XMLHttpRequest.prototype.send=send;this.onload=()=>this.onerror?.call(this,new ProgressEvent('error'));}return send.call(this,body);};});
 await capture(page);await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(1);await expect.poll(async()=>(await dbRows(page,'photoSyncJobs'))[0]?.attempts).toBe(1);
 const photo=(await state(request,e.access)).photos[0];await request.delete(`${API}/events/${e.access.eventId}/photos/${photo.id}`,{headers:{Authorization:`Bearer ${e.access.token}`}});
 await openSharing(page);await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await dbRows(page,'photoSyncJobs')).length).toBe(0);expect((await state(request,e.access)).photos.length).toBe(0);expect((await dbRows(page)).length).toBe(1);
 await request.patch(`${API}/events/${e.access.eventId}`,{headers:{Authorization:`Bearer ${e.access.token}`},data:{closed:true}});await capture(page,'purple');await expect.poll(async()=>(await dbRows(page,'photoSyncJobs'))[0]?.error).toContain('closed');
 await request.patch(`${API}/events/${e.access.eventId}`,{headers:{Authorization:`Bearer ${e.access.token}`},data:{closed:false}});await openSharing(page);await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await state(request,e.access)).photos.length).toBe(1);
});

test('wizard defaults on and a failed join-time opt-out never becomes an automatic opt-in',async({page,request,baseURL})=>{
 await page.goto('./');await page.getByRole('button',{name:'Start an event',exact:true}).click();await page.getByRole('radio',{name:/Christmas/}).locator('..').click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('textbox',{name:'Event name',exact:true}).fill('Wizard default');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(sharing(page)).toBeChecked();
 const e=await make(request,baseURL!);await page.goto(e.invite);await sharing(page).click();await page.getByRole('button',{name:'Use my own name',exact:true}).click();await page.getByRole('textbox',{name:/Your own name/}).fill('Opt-out team');
 // Fail the first settings transaction, not registration or photo storage.
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;let once=true;IDBDatabase.prototype.transaction=function(...args:Parameters<typeof original>){if(once&&String(args[0]).includes('photoSyncSettings')&&args[1]==='readwrite'){once=false;throw new DOMException('Synthetic settings failure','QuotaExceededError');}return original.apply(this,args);};});
 await page.getByRole('button',{name:'Join & start hunt',exact:true}).click();await expect(page.getByRole('alert')).toContainText('You’re in as');expect((await state(request,e.access)).teams.length).toBe(1);await page.getByRole('button',{name:'Start the hunt',exact:true}).click();await expect(sharing(page)).not.toBeChecked();await page.getByRole('button',{name:'Start the hunt on Path A',exact:true}).click();await capture(page);expect((await state(request,e.access)).photos.length).toBe(0);expect((await dbRows(page,'photoSyncJobs')).length).toBe(0);
});
