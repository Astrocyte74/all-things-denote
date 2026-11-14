import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewServer } from '../scripts/review-test-server.mjs';

let mf, db, source = 0;
before(async () => { ({mf, db} = await createReviewServer()); });
after(async () => { await mf?.dispose(); });
const token = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
async function call(path, access, method = 'GET', body) {
  return mf.dispatchFetch(`https://review.test${path}`, {
    method,
    headers: { ...(access ? {Authorization:`Bearer ${access.token}`} : {}), ...(body ? {'Content-Type':'application/json'} : {}), 'CF-Connecting-IP':`naming-${++source}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const settings = (overrides = {}) => ({pool:'all',names:[],assignment:'choose',allowCustom:true,...overrides});
async function create(teamNaming) {
  const response = await call('/events', null, 'POST', {title:'Naming test',packId:'christmas',teamNaming});
  assert.equal(response.status,201,await response.clone().text());
  const event = await response.json();
  return {...event, invite:{eventId:event.access.eventId,token:event.snapshot.joinToken,role:'join'}};
}
const join = (event, body) => call(`/events/${event.access.eventId}/teams`,event.invite,'POST',{token:token(),...body});
const invite = async event => (await call(`/events/${event.access.eventId}`,event.invite)).json();

test('default policy and curated names are returned without exposing joined team identities', async () => {
  const event = await create();
  assert.deepEqual(event.snapshot.event.teamNaming, settings());
  const before = await invite(event);
  assert(before.joinOptions.names.length >= 50);
  assert.equal(new Set(before.joinOptions.names.map(n=>n.toLowerCase())).size,before.joinOptions.names.length);
  assert.equal(before.joinOptions.spotsRemaining,20);
  const response = await join(event,{name:'My private custom identity',nameSource:'custom'});
  assert.equal(response.status,200,await response.clone().text());
  const team = (await response.json()).snapshot.team;
  assert.equal(team.pathId,'A');
  const after = await invite(event);
  assert.equal(after.joinOptions.spotsRemaining,19);
  assert.deepEqual(after.teams,[]); assert.deepEqual(after.photos,[]);
  assert(!JSON.stringify(after).includes(team.name));
  assert(!JSON.stringify(after).includes(team.id));
});

test('selected pools enforce policy and replenish only when exhausted', async () => {
  const event = await create(settings({pool:'selected',names:['Silver Kites'],allowCustom:false}));
  assert.deepEqual((await invite(event)).joinOptions.names,['Silver Kites']);
  assert.equal((await join(event,{name:'Not on the list',nameSource:'custom'})).status,400);
  assert.equal((await join(event,{name:'Not on the list',nameSource:'suggested'})).status,409);
  assert.equal((await join(event,{name:'',nameSource:'random'})).status,400);
  const first = await join(event,{name:'silver kites',nameSource:'suggested'});
  assert.equal(first.status,200,await first.clone().text());
  assert.equal((await first.json()).snapshot.team.name,'Silver Kites');
  const fresh = await invite(event);
  assert(fresh.joinOptions.names.length >= 50);
  assert(!fresh.joinOptions.names.includes('Silver Kites'));
  const second = await join(event,{name:fresh.joinOptions.names[0],nameSource:'suggested'});
  assert.equal(second.status,200,await second.clone().text());
  assert.equal((await second.json()).snapshot.team.pathId,'B');
});

test('concurrent name claims reserve one normalized name and failed claims can retry', async () => {
  const event = await create();
  const firstToken = token(), secondToken = token();
  const responses = await Promise.all([
    join(event,{name:'Bright Sparks',nameSource:'suggested',token:firstToken}),
    join(event,{name:'  BRIGHT   SPARKS ',nameSource:'suggested',token:secondToken}),
  ]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const failedToken = responses[0].status === 409 ? firstToken : secondToken;
  const retry = await join(event,{name:'A Different Team',nameSource:'custom',token:failedToken});
  assert.equal(retry.status,200,await retry.clone().text());
  const rows = (await db.prepare('SELECT name_key, path_id FROM teams WHERE event_id = ?').bind(event.access.eventId).all()).results;
  assert.equal(rows.length,2); assert.equal(new Set(rows.map(r=>r.name_key)).size,2);
  assert.deepEqual(rows.map(r=>r.path_id).sort(),['A','B']);
  assert.equal((await join(event,{name:'Ｂｒｉｇｈｔ Ｓｐａｒｋｓ',nameSource:'custom'})).status,409);
});

test('twenty simultaneous random joins get unique names and balanced paths even with one selected name', async () => {
  const event = await create(settings({pool:'selected',names:['First Finders'],assignment:'random',allowCustom:false}));
  assert.equal((await join(event,{name:'Chosen instead',nameSource:'custom'})).status,400);
  assert.equal((await join(event,{name:'First Finders',nameSource:'suggested'})).status,400);
  const credentials = Array.from({length:20},token);
  const responses = await Promise.all(credentials.map(credential=>join(event,{name:'',nameSource:'random',token:credential})));
  for(const response of responses) assert.equal(response.status,200,await response.clone().text());
  const teams = await Promise.all(responses.map(async r=>(await r.json()).snapshot.team));
  assert.equal(new Set(teams.map(t=>t.name)).size,20);
  assert(teams.some(t=>t.name==='First Finders'));
  const counts = [...'ABCDEF'].map(path=>teams.filter(t=>t.pathId===path).length);
  assert(Math.max(...counts)-Math.min(...counts)<=1,JSON.stringify(counts));
  assert.deepEqual((await invite(event)).joinOptions,{names:[],spotsRemaining:0});
  assert.equal((await join(event,{name:'',nameSource:'random'})).status,409);
  await call(`/events/${event.access.eventId}`,event.access,'PATCH',{closed:true});
  const retry = await join(event,{name:'Even changed input must recover',nameSource:'custom',pathId:'Z',token:credentials[0]});
  assert.equal(retry.status,200,await retry.clone().text());
  assert.deepEqual((await retry.json()).snapshot.team,teams[0]);
});

test('simultaneous retries of one random join preserve the assigned name and path', async () => {
  const event = await create(settings({assignment:'random',allowCustom:false}));
  const credential = token();
  const responses = await Promise.all(Array.from({length:6},()=>join(event,{name:'',nameSource:'random',token:credential})));
  for(const response of responses) assert.equal(response.status,200,await response.clone().text());
  const teams = await Promise.all(responses.map(async r=>(await r.json()).snapshot.team));
  assert.equal(new Set(teams.map(t=>t.id)).size,1);
  assert.equal(new Set(teams.map(t=>t.name)).size,1);
  assert(teams.every(t=>t.pathId==='A'));
});

test('custom-name option also works with random assignment; old clients retain explicit paths', async () => {
  const event = await create(settings({assignment:'random',allowCustom:true,names:['Extra Idea']}));
  assert((await invite(event)).joinOptions.names.includes('Extra Idea'));
  const response = await join(event,{name:'Our Own Team',nameSource:'custom'});
  assert.equal(response.status,200); assert.equal((await response.json()).snapshot.team.name,'Our Own Team');
  const legacy = await create();
  assert.equal((await join(legacy,{name:'Old client',pathId:'Z'})).status,400);
  const old = await join(legacy,{name:'Old client',pathId:'C'});
  assert.equal(old.status,200); assert.equal((await old.json()).snapshot.team.pathId,'C');
  const auto = await join(legacy,{name:'New client'});
  assert.equal(auto.status,200); assert.equal((await auto.json()).snapshot.team.pathId,'A');
});

test('legacy events and teams survive the additive migration and reserve existing names', async () => {
  const event = await create();
  await db.prepare('UPDATE events SET team_naming = NULL WHERE id = ?').bind(event.access.eventId).run();
  const response = await join(event,{name:'Legacy Owls'});
  assert.equal(response.status,200);
  const original = (await response.json()).snapshot.team;
  await db.prepare('UPDATE teams SET name_key = NULL WHERE id = ?').bind(original.id).run();
  assert.deepEqual((await invite(event)).event.teamNaming,settings());
  assert.equal((await join(event,{name:'legacy owls',nameSource:'custom'})).status,409);
  const state = await (await call(`/events/${event.access.eventId}`,event.access)).json();
  assert.deepEqual(state.teams[0],original);
});

test('invalid naming policies and oversized lists are rejected before creating an event', async () => {
  const bad = [
    [], {}, settings({pool:'bogus'}), settings({pool:['all']}), settings({assignment:['random']}), settings({allowCustom:'yes'}),
    settings({pool:'selected'}), settings({names:['Twice',' TWICE ']}), settings({names:['']}),
    settings({names:[42]}), settings({names:['x'.repeat(41)]}), settings({names:Array.from({length:51},(_,i)=>`Name ${i}`)}),
  ];
  for(const teamNaming of bad) {
    const response = await call('/events',null,'POST',{title:'Bad policy',packId:'christmas',teamNaming});
    assert.equal(response.status,400,JSON.stringify(teamNaming));
  }
  const event = await create();
  assert.equal((await join(event,{name:'Bad source',nameSource:['custom']})).status,400);
});
