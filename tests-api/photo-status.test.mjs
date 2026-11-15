import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewServer } from '../scripts/review-test-server.mjs';
let mf, db, source = 0;
before(async () => { ({ mf, db } = await createReviewServer()); });
after(async () => { await mf?.dispose(); });
const url = a => `/events/${a.eventId}`;
const call = (path, access, method = 'GET', body) => mf.dispatchFetch(`https://review.test${path}`, {
  method, headers: { ...(access ? { Authorization: `Bearer ${access.token}` } : { 'CF-Connecting-IP': `photo-status-${++source}` }), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
});
async function fixture() {
  const e = await (await call('/events', null, 'POST', { title: 'Photo reports', packId: 'christmas', autoUploadDefault: true })).json();
  const invite = { eventId: e.access.eventId, token: e.snapshot.joinToken };
  const join = async name => (await call(`${url(invite)}/teams`, invite, 'POST', { name, token: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url') })).json();
  return { ...e, invite, team: await join('Reporting team'), other: await join('Other team') };
}
const report = (a, body) => call(`${url(a)}/photo-status`, a, 'POST', { autoSend: true, queuedUploads: 2, pendingDeletes: 1, hasError: false, clientUpdatedAt: Date.now(), ...body });
const state = async a => (await call(url(a), a)).json();

test('photo status is unknown until reported and private to the team and leader', async () => {
  const e = await fixture();
  assert.equal(e.team.snapshot.team.photoStatus, undefined);
  for (const a of [e.access, e.invite]) assert.equal((await report(a)).status, 403);
  assert.equal((await report(e.team.access)).status, 200);
  const s = await state(e.access), own = await state(e.team.access), invite = await state(e.invite), other = await state(e.other.access);
  const status = s.teams.find(t => t.id === own.team.id).photoStatus;
  assert.equal(status.autoSend, true); assert.equal(status.queuedUploads, 2); assert.equal(status.pendingDeletes, 1);
  assert(status.updatedAt > 0); assert.deepEqual(own.team.photoStatus, status);
  assert.equal(other.teams.length, 1); assert.equal(other.team.photoStatus, undefined);
  assert.equal(invite.team, undefined); assert.deepEqual(invite.teams, []);
  assert.deepEqual(s.photos, []); assert.equal(own.team.progress, undefined);
});
test('status retries cannot revert a newer opt-out; closed events still accept reports', async () => {
  const e = await fixture(), now = Date.now();
  await report(e.team.access, { clientUpdatedAt: now });
  await call(url(e.access), e.access, 'PATCH', { closed: true });
  assert.equal((await report(e.team.access, { autoSend: false, queuedUploads: 0, pendingDeletes: 1, hasError: true, clientUpdatedAt: now + 2 })).status, 200);
  const expected = (await state(e.team.access)).team.photoStatus;
  await report(e.team.access, { clientUpdatedAt: now }); await report(e.team.access, { clientUpdatedAt: now + 2 });
  assert.deepEqual((await state(e.team.access)).team.photoStatus, expected);
  assert.equal(expected.autoSend, false); assert.equal(expected.queuedUploads, 0); assert.equal(expected.pendingDeletes, 1); assert.equal(expected.hasError, true);
  await db.prepare('UPDATE events SET expires_at = ? WHERE id = ?').bind(Date.now() - 1, e.access.eventId).run();
  assert.equal((await report(e.team.access)).status, 410);
});
test('invalid or spoofed status fields never change the saved report', async () => {
  const e = await fixture(); await report(e.team.access);
  const expected = (await state(e.team.access)).team.photoStatus;
  for (const invalid of [{ autoSend: 'yes' }, { hasError: 1 }, { queuedUploads: -1 }, { queuedUploads: 1.5 }, { pendingDeletes: 10001 }, { clientUpdatedAt: 0 }, { clientUpdatedAt: Date.now() + 172800000 }, { teamId: e.other.snapshot.team.id }, { imageData: 'private' }]) {
    assert.equal((await report(e.team.access, invalid)).status, 400, JSON.stringify(invalid));
  }
  assert.deepEqual((await state(e.team.access)).team.photoStatus, expected);
});
