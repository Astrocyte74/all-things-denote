import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewServer } from '../scripts/review-test-server.mjs';

let mf, db;
before(async () => { ({ mf, db } = await createReviewServer()); });
after(async () => { await mf?.dispose(); });
const randomToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16, 1, 2, 3, 255, 217]);
let source = 0;
async function call(path, access, method = 'GET', body, headers = {}) {
  const request = new Request(`https://review.test${path}`, { method, headers: { ...(access ? { Authorization: `Bearer ${access.token}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return mf.dispatchFetch(request.url, { method, headers: Object.fromEntries(request.headers), body: request.body ? await request.arrayBuffer() : undefined });
}
async function create(packId = 'christmas') {
  const response = await call('/events', null, 'POST', { title: 'Youth night', packId }, { 'CF-Connecting-IP': `test-${++source}` });
  assert.equal(response.status, 201, await response.clone().text());
  const result = await response.json();
  return { ...result, invite: { eventId: result.access.eventId, token: result.snapshot.joinToken, role: 'join' } };
}
async function join(event, name = 'Lost Sheep', credential = randomToken()) {
  const response = await call(`/events/${event.access.eventId}/teams`, event.invite, 'POST', { name, pathId: 'A', token: credential });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function upload(access, overrides = {}, bytes = jpeg, type = 'image/jpeg') {
  const form = new FormData();
  form.set('metadata', JSON.stringify({ localPhotoId: 'local-photo-1', packId: 'christmas', challengeId: 'christmas:star', capturedAt: Date.now(), teamName: 'Captured name', pathId: 'B', ...overrides }));
  form.set('photo', new Blob([bytes], { type }), 'photo.jpg');
  return call(`/events/${access.eventId}/photos`, access, 'POST', form);
}

test('private roles: invite sees no photos or team identities; unauthenticated access fails', async () => {
  const event = await create();
  assert.notEqual(event.access.token, event.invite.token);
  assert.equal(event.snapshot.event.expiresAt - event.snapshot.event.createdAt, 7 * 86400000);
  assert.equal((await call(`/events/${event.access.eventId}`)).status, 401);
  assert.equal((await call(`/events/${event.access.eventId}`, { token: randomToken() })).status, 401);
  const invited = await (await call(`/events/${event.access.eventId}`, event.invite)).json();
  assert.deepEqual(invited.teams, []); assert.deepEqual(invited.photos, []);
  assert.equal(invited.joinToken, undefined);
  assert.equal(JSON.stringify(invited).includes(event.access.token), false);
  assert.equal((await call(`/events/${event.access.eventId}`, event.invite, 'PATCH', { closed: true })).status, 403);
});

test('team registration is idempotent; simultaneous retries store one labeled photo', async () => {
  const event = await create(); const teamToken = randomToken();
  const a = await join(event, 'Same name', teamToken), b = await join(event, 'Same name', teamToken);
  assert.equal(a.snapshot.team.id, b.snapshot.team.id);
  const responses = await Promise.all([upload(a.access), upload(a.access)]);
  assert(responses.some(response => response.status === 201), await responses[0].clone().text());
  assert(responses.every(response => [200, 201, 409].includes(response.status)));
  const retry = await upload(a.access); assert.equal(retry.status, 200, await retry.clone().text());
  const photo = (await retry.json()).photo;
  assert.equal(photo.challengeNumber, 1); assert.equal(photo.teamName, 'Captured name'); assert.equal(photo.pathId, 'B');
  const state = await (await call(`/events/${event.access.eventId}`, event.access)).json();
  assert.equal(state.photos.length, 1); assert.equal(state.teams.length, 1);
  const image = await call(`/events/${event.access.eventId}/photos/${photo.id}`, event.access);
  assert.equal(image.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), jpeg);
  assert.equal((await upload(a.access, {}, new Uint8Array([255,216,255,2,255,217]))).status, 409);
});

test('team and event isolation apply to downloads, deletes, and canonical clues', async () => {
  const event = await create(), otherEvent = await create();
  const team = await join(event), other = await join(event, 'Same path, different team');
  const response = await upload(team.access); assert.equal(response.status, 201, await response.clone().text());
  const photo = (await response.json()).photo;
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, event.invite)).status, 403);
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, other.access)).status, 404);
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, other.access, 'DELETE')).status, 404);
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, otherEvent.access)).status, 401);
  assert.equal((await upload(team.access, { localPhotoId: 'wrong-game', packId: 'scavenger' })).status, 400);
  assert.equal((await upload(team.access, { localPhotoId: 'wrong-clue', challengeId: 'fake' })).status, 400);
  assert.equal((await (await call(`/events/${event.access.eventId}`, other.access)).json()).photos.length, 0);
});

test('closed events stop joining and uploading, and reopen without losing photos', async () => {
  const event = await create(), team = await join(event);
  assert.equal((await upload(team.access)).status, 201);
  assert.equal((await call(`/events/${event.access.eventId}`, event.access, 'PATCH', { closed: true })).status, 200);
  assert.equal((await upload(team.access, { localPhotoId: 'new' })).status, 409);
  assert.equal((await call(`/events/${event.access.eventId}/teams`, event.invite, 'POST', { name:'Late team', token:randomToken() })).status, 409);
  assert.equal((await (await call(`/events/${event.access.eventId}`, event.access)).json()).photos.length, 1);
  await call(`/events/${event.access.eventId}`, event.access, 'PATCH', { closed: false });
  assert.equal((await upload(team.access, { localPhotoId: 'new' })).status, 201);
});

test('type, size, paths, and metadata are checked before reserving storage', async () => {
  const event = await create(), team = await join(event);
  assert.equal((await upload(team.access, {}, new TextEncoder().encode('<svg/>'), 'image/svg+xml')).status, 415);
  assert.equal((await upload(team.access, {}, new TextEncoder().encode('not a photo'))).status, 415);
  assert.equal((await upload(team.access, {}, new Uint8Array(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await upload(team.access, { pathId: 'Z' })).status, 400);
  assert.equal((await upload(team.access, { capturedAt: 'yesterday' })).status, 400);
  const row = await db.prepare('SELECT photo_count, photo_bytes FROM events WHERE id = ?').bind(event.access.eventId).first();
  assert.equal(row.photo_count, 0); assert.equal(row.photo_bytes, 0);
});

test('event and team capacities are enforced in the reservation transaction', async () => {
  const event = await create(), team = await join(event);
  await db.prepare('UPDATE events SET photo_bytes = ? WHERE id = ?').bind(100 * 1024 * 1024 - jpeg.length, event.access.eventId).run();
  const [a, b] = await Promise.all([upload(team.access, { localPhotoId:'limit-a' }), upload(team.access, { localPhotoId:'limit-b' })]);
  assert.deepEqual([a.status, b.status].sort(), [201,409]);
  for (let i = 1; i < 20; i++) await join(event, `Team ${i}`);
  assert.equal((await call(`/events/${event.access.eventId}/teams`, event.invite, 'POST', { name:'One too many',token:randomToken() })).status, 409);
});

test('expiry revokes every role and scheduled cleanup removes stored objects', async () => {
  const event = await create(), team = await join(event);
  const response = await upload(team.access); assert.equal(response.status, 201);
  await db.prepare('UPDATE events SET expires_at = ? WHERE id = ?').bind(Date.now() - 1000, event.access.eventId).run();
  for (const access of [event.access,event.invite,team.access]) assert.equal((await call(`/events/${event.access.eventId}`, access)).status, 410);
  const worker = await mf.getWorker(); await worker.scheduled({ cron: '17 * * * *' });
  const bucket = await mf.getR2Bucket('PHOTOS');
  assert.equal((await bucket.list({ prefix:`events/${event.access.eventId}/` })).objects.length, 0);
});

test('leader delete revokes links and removes only that event; team delete cannot remove another team photo', async () => {
  const event = await create(), other = await create();
  const team = await join(event); const photo = (await (await upload(team.access)).json()).photo;
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, team.access, 'DELETE')).status, 200);
  assert.equal((await call(`/events/${event.access.eventId}/photos/${photo.id}`, event.access)).status, 404);
  assert.equal((await upload(team.access)).status, 201);
  assert.equal((await call(`/events/${event.access.eventId}`, team.access, 'DELETE')).status, 403);
  assert.equal((await call(`/events/${event.access.eventId}`, event.access, 'DELETE')).status, 200);
  assert([401,410].includes((await call(`/events/${event.access.eventId}`, team.access)).status));
  assert.equal((await call(`/events/${event.access.eventId}`, event.access, 'DELETE')).status, 200);
  assert.equal((await call(`/events/${other.access.eventId}`, other.access)).status, 200);
  assert.equal((await (await mf.getR2Bucket('PHOTOS')).list({prefix:`events/${event.access.eventId}/`})).objects.length, 0);
});

test('interrupted upload reservations can be retried without losing completed photos', async () => {
  const event = await create(), team = await join(event);
  const response = await upload(team.access); assert.equal(response.status, 201);
  const first = (await response.json()).photo;
  await db.prepare('UPDATE photos SET ready = 0, uploaded_at = ? WHERE id = ?').bind(Date.now() - 121000, first.id).run();
  const retry = await upload(team.access); assert.equal(retry.status, 201, await retry.clone().text());
  const photo = (await retry.json()).photo;
  assert.notEqual(photo.id, first.id);
  const state = await (await call(`/events/${event.access.eventId}`, event.access)).json();
  assert.equal(state.photos.length, 1);
  const count = await db.prepare('SELECT photo_count, photo_bytes FROM events WHERE id = ?').bind(event.access.eventId).first();
  assert.equal(count.photo_count, 1); assert.equal(count.photo_bytes, jpeg.length);
});

test('creation rate limits and CORS reject unrelated sites without disclosing credentials', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call('/events', null, 'POST', {title:'Rate test',packId:'christmas'}, {'CF-Connecting-IP':'rate-test'})).status, 201);
  assert.equal((await call('/events', null, 'POST', {title:'Rate test',packId:'christmas'}, {'CF-Connecting-IP':'rate-test'})).status, 429);
  const denied = await call('/events', null, 'POST', {title:'Nope',packId:'christmas'}, {Origin:'https://unrelated.example'});
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  const allowed = await call('/events', null, 'OPTIONS', undefined, {Origin:'https://astrocyte74.github.io'});
  assert.equal(allowed.status, 204); assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://astrocyte74.github.io');
});

test('a full expiry batch and interrupted uploads clean up within the D1 Free request budget', async () => {
  const isolated = await createReviewServer();
  try {
    const database = isolated.db, bucket = await isolated.mf.getR2Bucket('PHOTOS');
    const now = Date.now(), old = now - 9 * 86400000;
    const addEvent = (id, expires) => database.prepare('INSERT INTO events (id,title,pack_id,leader_hash,join_token,created_at,expires_at) VALUES (?,?,?,?,?,?,?)')
      .bind(id, 'Cleanup fixture', 'christmas', 'hash', 'invite', old, expires);
    const expiredIds = Array.from({length:20}, () => crypto.randomUUID());
    const active = crypto.randomUUID(), team = crypto.randomUUID();
    await database.batch([...expiredIds.map(id => addEvent(id, old)), addEvent(active, now + 86400000)]);
    await database.prepare('INSERT INTO teams (id,event_id,token_hash,name,joined_at) VALUES (?,?,?,?,?)').bind(team,active,'team-hash','Active team',now).run();
    const staleIds = Array.from({length:100}, () => crypto.randomUUID());
    const keptId = crypto.randomUUID();
    await database.batch([...staleIds,keptId].map(id => database.prepare('INSERT INTO photos (id,event_id,team_id,local_photo_id,challenge_id,challenge_number,challenge_title,captured_at,uploaded_at,bytes,digest,ready) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,active,team,id,'christmas:star',1,'Star',old,old,jpeg.length,'digest',id===keptId?1:0)));
    for (const id of expiredIds) await bucket.put(`events/${id}/expired.jpg`,jpeg);
    for (const id of [...staleIds,keptId]) await bucket.put(`events/${active}/${id}.jpg`,jpeg);

    // Enforce the documented production request budget around real D1 storage.
    // Local Miniflare alone does not enforce account-plan quotas.
    let requests = 0;
    const count = () => assert(++requests <= 50, 'D1 Free request budget exceeded');
    const statements = new WeakMap();
    const wrap = statement => {
      const proxy = new Proxy(statement, {get(target,key) {
        if (key === 'bind') return (...values) => wrap(target.bind(...values));
        if (['run','first','all','raw'].includes(key)) return (...args) => { count(); return target[key](...args); };
        return Reflect.get(target,key);
      }});
      statements.set(proxy,statement); return proxy;
    };
    const limitedDB = {prepare: sql => wrap(database.prepare(sql)), batch: values => { count(); return database.batch(values.map(value=>statements.get(value))); }};
    const {default: worker} = await import('../.wrangler/review-build/index.js');
    await worker.scheduled({}, {DB:limitedDB,PHOTOS:bucket});
    assert(requests <= 50);
    assert.equal((await database.prepare('SELECT COUNT(*) AS total FROM events').first()).total,1);
    assert.equal((await database.prepare('SELECT COUNT(*) AS total FROM photos').first()).total,1);
    assert.deepEqual((await bucket.list()).objects.map(object=>object.key),[`events/${active}/${keptId}.jpg`]);
    const counters = await database.prepare('SELECT photo_count,photo_bytes FROM events WHERE id = ?').bind(active).first();
    assert.deepEqual(counters,{photo_count:1,photo_bytes:jpeg.length});
  } finally { await isolated.mf.dispose(); }
});
