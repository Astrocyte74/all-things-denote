import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewServer } from '../scripts/review-test-server.mjs';
let mf,db,source=0;
before(async()=>{({mf,db}=await createReviewServer());});
after(async()=>{await mf?.dispose();});
const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const names={pool:'selected',names:['New Explorers'],assignment:'random',allowCustom:false};
async function call(path,access,method='GET',body){return mf.dispatchFetch(`https://review.test${path}`,{method,headers:{...(access?{Authorization:`Bearer ${access.token}`}:{'CF-Connecting-IP':`dashboard-${++source}`}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
async function create(){const response=await call('/events',null,'POST',{title:'Before edit',packId:'christmas'});assert.equal(response.status,201);const event=await response.json();return {...event,invite:{eventId:event.access.eventId,token:event.snapshot.joinToken}};}
const url=a=>`/events/${a.eventId}`;
const state=async a=>(await call(url(a),a)).json();
async function join(event,name='Original team'){const r=await call(`${url(event.access)}/teams`,event.invite,'POST',{name,token:token()});assert.equal(r.status,200,await r.clone().text());return r.json();}
const edit=(event,changes)=>call(url(event.access),event.access,'PATCH',changes);
const report=(access,ids,at=Date.now())=>call(`${url(access)}/progress`,access,'POST',{completedChallengeIds:ids,clientUpdatedAt:at});

test('editing title and naming preserves links, game, expiry, joined teams and their photos',async()=>{
 const event=await create(),team=await join(event);
 const form=new FormData();form.set('photo',new Blob([new Uint8Array([255,216,255,0,255,217])],{type:'image/jpeg'}),'test.jpg');form.set('metadata',JSON.stringify({localPhotoId:'one',packId:'christmas',challengeId:'christmas:star',capturedAt:Date.now(),teamName:'Original team',pathId:'A'}));
 const request=new Request(`https://review.test${url(team.access)}/photos`,{method:'POST',headers:{Authorization:`Bearer ${team.access.token}`},body:form});
 const upload=await mf.dispatchFetch(request.url,{method:'POST',headers:Object.fromEntries(request.headers),body:await request.arrayBuffer()});assert.equal(upload.status,201,await upload.clone().text());
 const before=await state(event.access);
 const response=await edit(event,{title:'After edit',teamNaming:names,settingsRevision:0});assert.equal(response.status,200);
 const updated=await response.json();assert.equal(updated.event.title,'After edit');assert.deepEqual(updated.event.teamNaming,names);assert.equal(updated.event.settingsRevision,1);
 for(const key of ['id','packId','createdAt','expiresAt'])assert.equal(updated.event[key],before.event[key]);
 assert.equal(updated.joinToken,before.joinToken);assert.deepEqual(updated.teams,before.teams);assert.deepEqual(updated.photos,before.photos);
 assert.equal((await state(event.invite)).event.title,'After edit');assert.equal((await state(team.access)).team.name,'Original team');
 const joined=await join(event);assert.equal(joined.snapshot.team.name,'New Explorers');assert.equal(joined.snapshot.team.pathId,'B');
});

test('only leaders edit settings, immutable fields and invalid settings leave the event unchanged',async()=>{
 const event=await create(),team=await join(event);
 for(const access of [event.invite,team.access])assert.equal((await call(url(access),access,'PATCH',{title:'No',settingsRevision:0})).status,403);
 for(const body of [{title:'' ,settingsRevision:0},{title:'No revision'},{title:'Bad revision',settingsRevision:-1},{packId:'creation',settingsRevision:0},{expiresAt:Date.now()+999999},{teamNaming:{...names,names:[]},settingsRevision:0},{closed:'yes'},{}])assert.equal((await edit(event,body)).status,400,JSON.stringify(body));
 assert.equal((await state(event.access)).event.title,'Before edit');assert.equal((await state(event.access)).event.settingsRevision,0);
});

test('simultaneous leader edits conflict safely and close/open does not overwrite settings',async()=>{
 const event=await create();
 const results=await Promise.all([edit(event,{title:'Leader one',settingsRevision:0}),edit(event,{title:'Leader two',settingsRevision:0}),edit(event,{closed:true})]);
 assert.deepEqual(results.slice(0,2).map(r=>r.status).sort(),[200,409]);assert.equal(results[2].status,200);
 const snapshot=await state(event.access);assert.equal(snapshot.event.closed,true);assert.equal(snapshot.event.settingsRevision,1);
 assert.equal((await edit(event,{title:'Stale overwrite',settingsRevision:0})).status,409);
 assert.equal((await edit(event,{title:'Latest edit',settingsRevision:1})).status,200);
 assert.equal((await edit(event,{closed:false})).status,200);
 const latest=await state(event.access);assert.equal(latest.event.title,'Latest edit');assert.equal(latest.event.settingsRevision,2);assert.equal(latest.event.closed,false);
});

test('progress is private, canonical, independent of photos, and unknown until first report',async()=>{
 const event=await create(),team=await join(event),other=await join(event,'Other team');
 assert.equal(team.snapshot.team.progress,undefined);
 for(const access of [event.access,event.invite])assert.equal((await report(access,[])).status,403);
 const result=await report(team.access,['christmas:cloth','christmas:star']);assert.equal(result.status,200);
 const progress=(await result.json()).progress;assert.deepEqual(progress.completedChallengeIds,['christmas:star','christmas:cloth']);assert(progress.updatedAt>0);
 const owner=await state(event.access);assert.deepEqual(owner.teams.find(t=>t.id===team.snapshot.team.id).progress,progress);assert.equal(owner.photos.length,0);
 assert.deepEqual((await state(team.access)).team.progress,progress);assert.equal((await state(other.access)).teams.length,1);assert.equal((await state(other.access)).team.progress,undefined);
 const invited=await state(event.invite);assert.deepEqual(invited.teams,[]);assert(!JSON.stringify(invited).includes('completedChallengeIds'));
});

test('retries and older reports do not revert newer progress, while a later reset can decrease it',async()=>{
 const event=await create(),team=await join(event),at=Date.now();
 await report(team.access,['christmas:star'],at);
 await report(team.access,['christmas:star','christmas:cloth'],at+1);
 const newer=(await state(team.access)).team.progress;
 await report(team.access,[],at);await report(team.access,['christmas:star','christmas:cloth'],at+1);
 assert.deepEqual((await state(team.access)).team.progress,newer);
 await edit(event,{closed:true});assert.equal((await report(team.access,[],at+2)).status,200);
 assert.deepEqual((await state(team.access)).team.progress.completedChallengeIds,[]);
 await call(url(event.access),event.access,'DELETE');assert.equal((await report(team.access,['christmas:star'],at+3)).status,401);
 assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE event_id=?').bind(event.access.eventId).first('n'),0);
});

test('invalid progress cannot introduce other-game clues, duplicates, arbitrary fields or future timestamps',async()=>{
 const event=await create(),team=await join(event);
 for(const body of [{completedChallengeIds:['made-up'],clientUpdatedAt:Date.now()},{completedChallengeIds:['christmas:star','christmas:star'],clientUpdatedAt:Date.now()},{completedChallengeIds:'all',clientUpdatedAt:Date.now()},{completedChallengeIds:[],clientUpdatedAt:Date.now()+2*86400000},{completedChallengeIds:[],clientUpdatedAt:0},{completedChallengeIds:[],clientUpdatedAt:Date.now(),teamId:'another-team'}])assert.equal((await call(`${url(team.access)}/progress`,team.access,'POST',body)).status,400);
 assert.equal((await state(team.access)).team.progress,undefined);
});
