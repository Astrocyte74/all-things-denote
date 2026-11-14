import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewServer} from '../scripts/review-test-server.mjs';
let mf,db,n=0;before(async()=>{({mf,db}=await createReviewServer());});after(async()=>{await mf?.dispose();});
const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const url=a=>`/events/${a.eventId}`;
const call=(path,a,method='GET',body)=>mf.dispatchFetch(`https://review.test${path}`,{method,headers:{...(a?{Authorization:`Bearer ${a.token}`}:{'CF-Connecting-IP':`auto-${++n}`}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
async function create(extra={}){const r=await call('/events',null,'POST',{title:'Live discoveries',packId:'christmas',...extra});assert.equal(r.status,201,await r.clone().text());const e=await r.json();return {...e,invite:{eventId:e.access.eventId,token:e.snapshot.joinToken}};}
async function join(e,name='Team'){const r=await call(`${url(e.access)}/teams`,e.invite,'POST',{name,token:token()});assert.equal(r.status,200);return r.json();}
async function upload(a,id,automatic=true){const form=new FormData();form.set('photo',new Blob([new Uint8Array([255,216,255,0,255,217])],{type:'image/jpeg'}),'photo.jpg');form.set('metadata',JSON.stringify({localPhotoId:id,packId:'christmas',challengeId:'christmas:star',capturedAt:Date.now(),automatic}));const r=new Request(`https://review.test${url(a)}/photos`,{method:'POST',headers:{Authorization:`Bearer ${a.token}`},body:form});return mf.dispatchFetch(r.url,{method:'POST',headers:Object.fromEntries(r.headers),body:await r.arrayBuffer()});}
const remove=(a,id)=>call(`${url(a)}/local-photos/${encodeURIComponent(id)}`,a,'DELETE');
const state=async a=>(await call(url(a),a)).json();

test('leader default is explicit, editable with revision, and absent old-client choice stays manual',async()=>{
 const old=await create(),e=await create({autoUploadDefault:true}),t=await join(e);assert.equal(old.snapshot.event.autoUploadDefault,false);assert.equal(e.snapshot.event.autoUploadDefault,true);assert.equal(t.snapshot.event.autoUploadDefault,true);
 assert.equal((await call(url(e.access),e.access,'PATCH',{autoUploadDefault:false,settingsRevision:0})).status,200);
 assert.equal((await state(e.invite)).event.autoUploadDefault,false);assert.equal((await state(e.access)).event.settingsRevision,1);
 assert.equal((await call(url(e.access),t.access,'PATCH',{autoUploadDefault:true,settingsRevision:1})).status,403);
 assert.equal((await call(url(e.access),e.access,'PATCH',{autoUploadDefault:true,settingsRevision:0})).status,409);
 assert.equal((await call(url(e.access),e.access,'PATCH',{autoUploadDefault:'yes',settingsRevision:1})).status,400);
});
test('local deletion is private and idempotent, and blocks late automatic uploads before and after sending',async()=>{
 const e=await create(),t=await join(e),other=await join(e,'Other');
 assert.equal((await remove(t.access,'not-sent-yet')).status,200);assert.equal((await remove(t.access,'not-sent-yet')).status,200);
 const late=await upload(t.access,'not-sent-yet');assert.equal(late.status,409);assert.equal((await late.json()).code,'PHOTO_REMOVED');
 assert.equal((await upload(other.access,'not-sent-yet')).status,201);
 const sent=await upload(t.access,'sent');assert.equal(sent.status,201);const photo=(await sent.json()).photo;
 assert.equal((await remove(e.invite,'sent')).status,403);assert.equal((await remove(e.access,'sent')).status,403);
 assert.equal((await remove(other.access,'sent')).status,200);assert.equal((await state(t.access)).photos.length,1);
 assert.equal((await remove(t.access,'sent')).status,200);assert.equal((await upload(t.access,'sent')).status,409);
 assert.equal((await call(`${url(e.access)}/photos/${photo.id}`,e.access)).status,404);
 assert.equal((await state(t.access)).photos.length,0);
});
test('leader cloud deletion suppresses automatic retry, while deliberate manual resend can restore it',async()=>{
 const e=await create(),t=await join(e);const r=await upload(t.access,'original');const p=(await r.json()).photo;
 assert.equal((await call(`${url(e.access)}/photos/${p.id}`,e.access,'DELETE')).status,200);
 assert.equal((await upload(t.access,'original')).status,409);
 assert.equal((await upload(t.access,'original',false)).status,201);
 assert.equal((await state(e.access)).photos.length,1);
});
test('automatic duplicates are idempotent; retake replacement and closed-event deletion leave correct counts',async()=>{
 const e=await create(),t=await join(e);const first=await upload(t.access,'one');const original=(await first.json()).photo;
 const retry=await upload(t.access,'one');assert.equal(retry.status,200);assert.equal((await retry.json()).photo.id,original.id);
 await remove(t.access,'one');assert.equal((await upload(t.access,'replacement')).status,201);
 let s=await state(e.access);assert.equal(s.photos.length,1);assert.equal(s.photos[0].localPhotoId,'replacement');
 await call(url(e.access),e.access,'PATCH',{closed:true});const closed=await upload(t.access,'later');assert.equal(closed.status,409);assert.equal((await closed.json()).code,'UPLOADS_CLOSED');
 assert.equal((await remove(t.access,'replacement')).status,200);s=await state(e.access);assert.equal(s.photos.length,0);
 const row=await db.prepare('SELECT photo_count,photo_bytes FROM events WHERE id=?').bind(e.access.eventId).first();assert.equal(row.photo_count,0);assert.equal(row.photo_bytes,0);
});
test('removing an unfinished reservation prevents its later completion and expiry cleanup removes removal markers',async()=>{
 const e=await create(),t=await join(e);await upload(t.access,'pending');const p=(await state(t.access)).photos[0];
 await db.prepare('UPDATE photos SET ready=0 WHERE id=?').bind(p.id).run();await remove(t.access,'pending');
 const committed=await db.prepare('UPDATE photos SET ready=1 WHERE id=?').bind(p.id).run();assert.equal(committed.meta.changes,0);assert.equal((await upload(t.access,'pending')).status,409);
 assert((await db.prepare('SELECT COUNT(*) n FROM photo_removals WHERE event_id=?').bind(e.access.eventId).first()).n>0);
 await call(url(e.access),e.access,'DELETE');assert.equal((await db.prepare('SELECT COUNT(*) n FROM photo_removals WHERE event_id=?').bind(e.access.eventId).first()).n,0);
});
