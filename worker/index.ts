import { PACKS } from '../src/data/packs';
import { availableTeamNames, DEFAULT_TEAM_NAMING, MAX_NAME_POOL, teamNameKey, type TeamNamingSettings } from '../src/lib/teamNaming';

interface Env { DB: D1Database; PHOTOS: R2Bucket; ALLOWED_ORIGINS: string }
interface EventRow {
  id: string; title: string; pack_id: string; leader_hash: string; join_token: string;
  created_at: number; expires_at: number; closed: number; deleted: number;
  photo_count: number; photo_bytes: number;
  team_naming: string | null;
  settings_revision: number; auto_upload_default: number;
}
interface TeamRow { id: string; event_id: string; token_hash: string; name: string; path_id: string | null; joined_at: number; completed_challenges: string | null; progress_updated_at: number | null; progress_client_at: number | null; photo_status: string | null; photo_status_updated_at: number | null; photo_status_client_at: number | null }
interface PhotoRow {
  id: string; event_id: string; team_id: string; local_photo_id: string;
  challenge_id: string; challenge_number: number; challenge_title: string;
  team_name: string | null; path_id: string | null; captured_at: number; uploaded_at: number;
  bytes: number; digest: string; ready: number;
}
interface Auth { event: EventRow; role: 'leader' | 'join' | 'team'; team?: TeamRow }
class HttpError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
const DAY = 86_400_000;
const MAX_FILE = 5 * 1024 * 1024;
const MAX_EVENT_BYTES = 100 * 1024 * 1024;
const MAX_TEAMS = 20;
const MAX_PHOTOS = 300;
const MAX_ACTIVE_EVENTS = 20;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const ID = /^[a-f0-9-]{36}$/;

function json(value: unknown, status = 200) { return Response.json(value, { status }); }
function token() { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
async function hash(value: string | ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function text(value: unknown, max: number, required = false): string {
  if (value === undefined || value === null) { if (required) throw new HttpError(400, 'Please enter the required details.'); return ''; }
  if (typeof value !== 'string') throw new HttpError(400, 'Invalid text.');
  // eslint-disable-next-line no-control-regex -- Strip control characters from untrusted labels.
  const result = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (Array.from(result).length > max || (required && !result)) throw new HttpError(400, `Please use between 1 and ${max} characters.`);
  return result;
}
function path(value: unknown) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^[A-F]$/.test(value)) throw new HttpError(400, 'Choose a path from A to F.');
  return value;
}
function namingSettings(value: unknown): TeamNamingSettings {
  if (value === undefined || value === null) return { ...DEFAULT_TEAM_NAMING, names: [] };
  if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Choose valid team-name settings.');
  const input = value as Record<string, unknown>;
  if ((input.pool !== 'all' && input.pool !== 'selected') || (input.assignment !== 'choose' && input.assignment !== 'random') || typeof input.allowCustom !== 'boolean' || !Array.isArray(input.names) || input.names.length > MAX_NAME_POOL) {
    throw new HttpError(400, 'Choose valid team-name settings with at most 50 names.');
  }
  const names = input.names.map(name => text(name, 40, true));
  if (new Set(names.map(teamNameKey)).size !== names.length) throw new HttpError(400, 'Use each team name only once in your list.');
  if (input.pool === 'selected' && !names.length) throw new HttpError(400, 'Choose at least one team name, or allow all names.');
  return { pool: input.pool as TeamNamingSettings['pool'], assignment: input.assignment as TeamNamingSettings['assignment'], names, allowCustom: input.allowCustom };
}
function eventNaming(event: EventRow): TeamNamingSettings {
  return event.team_naming ? namingSettings(JSON.parse(event.team_naming)) : namingSettings(undefined);
}
async function boundedBody(request: Request, maximum: number): Promise<ArrayBuffer> {
  if (Number(request.headers.get('Content-Length')) > maximum) throw new HttpError(413, 'This upload is too large (5 MB per photo).');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > maximum) { await reader.cancel(); throw new HttpError(413, 'This upload is too large (5 MB per photo).'); }
    chunks.push(item.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body.buffer;
}
async function bodyJSON(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, 'Send JSON details.');
  try {
    const value = JSON.parse(new TextDecoder().decode(await boundedBody(request, 16384)));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid details.'); }
}
function eventView(event: EventRow) {
  return { id: event.id, title: event.title, packId: event.pack_id, createdAt: event.created_at, expiresAt: event.expires_at, closed: Boolean(event.closed), maxTeams: MAX_TEAMS, maxPhotos: MAX_PHOTOS, teamNaming: eventNaming(event), settingsRevision: event.settings_revision, autoUploadDefault: Boolean(event.auto_upload_default) };
}
function progressView(team: TeamRow) {
  return team.completed_challenges === null ? undefined : { completedChallengeIds: JSON.parse(team.completed_challenges), updatedAt: team.progress_updated_at!, clientUpdatedAt: team.progress_client_at! };
}
function photoStatusView(team: TeamRow) {
  return team.photo_status === null ? undefined : { ...JSON.parse(team.photo_status), updatedAt: team.photo_status_updated_at!, clientUpdatedAt: team.photo_status_client_at! };
}
function teamView(team: TeamRow) { return { id: team.id, name: team.name, pathId: team.path_id || undefined, joinedAt: team.joined_at, progress: progressView(team), photoStatus: photoStatusView(team) }; }
function photoView(photo: PhotoRow) {
  return { id: photo.id, teamId: photo.team_id, localPhotoId: photo.local_photo_id, challengeId: photo.challenge_id, challengeNumber: photo.challenge_number, challengeTitle: photo.challenge_title, teamName: photo.team_name || undefined, pathId: photo.path_id || undefined, capturedAt: photo.captured_at, uploadedAt: photo.uploaded_at, bytes: photo.bytes };
}
async function authorize(request: Request, env: Env, id: string): Promise<Auth> {
  const credential = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!TOKEN.test(credential) || !ID.test(id)) throw new HttpError(401, 'This private link is not valid. Ask your leader for a new link.');
  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRow>();
  if (!event) throw new HttpError(404, 'This event is no longer available.');
  const digest = await hash(credential);
  let auth: Auth | undefined;
  if (digest === event.leader_hash) auth = { event, role: 'leader' };
  else if (digest === await hash(event.join_token)) auth = { event, role: 'join' };
  else {
    const team = await env.DB.prepare('SELECT * FROM teams WHERE event_id = ? AND token_hash = ?').bind(id, digest).first<TeamRow>();
    if (team) auth = { event, role: 'team', team };
  }
  if (!auth) throw new HttpError(401, 'This private link is not valid. Ask your leader for a new link.');
  const retryLeaderDelete = auth.role === 'leader' && request.method === 'DELETE' && new URL(request.url).pathname === `/events/${id}`;
  if ((event.deleted || event.expires_at <= Date.now()) && !retryLeaderDelete) throw new HttpError(410, 'This event has ended or expired. Photos saved on your device are still there.');
  return auth;
}
function leader(auth: Auth) { if (auth.role !== 'leader') throw new HttpError(403, 'Only the leader can do that.'); }
async function snapshot(env: Env, auth: Auth) {
  const result = { event: eventView(auth.event), role: auth.role, teams: [] as ReturnType<typeof teamView>[], photos: [] as ReturnType<typeof photoView>[], team: auth.team ? teamView(auth.team) : undefined, joinToken: auth.role === 'leader' ? auth.event.join_token : undefined };
  if (auth.role === 'join') {
    const used = (await env.DB.prepare('SELECT name FROM teams WHERE event_id = ?').bind(auth.event.id).all<{ name: string }>()).results;
    const spotsRemaining = Math.max(0, MAX_TEAMS - used.length);
    // Reveal available choices, not joined team records, custom names, paths or photos.
    return { ...result, joinOptions: { names: auth.event.closed || !spotsRemaining ? [] : availableTeamNames(result.event.teamNaming, used.map(team => team.name)), spotsRemaining } };
  }
  const all = auth.role === 'leader';
  const [teams, photos] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM teams WHERE event_id = ?${all ? '' : ' AND id = ?'} ORDER BY joined_at, id`).bind(...(all ? [auth.event.id] : [auth.event.id, auth.team!.id])),
    env.DB.prepare(`SELECT * FROM photos WHERE event_id = ? AND ready = 1${all ? '' : ' AND team_id = ?'} ORDER BY challenge_number, uploaded_at, id`).bind(...(all ? [auth.event.id] : [auth.event.id, auth.team!.id])),
  ]);
  result.teams = (teams.results as unknown as TeamRow[]).map(teamView);
  result.photos = (photos.results as unknown as PhotoRow[]).map(photoView);
  return result;
}

async function createEvent(request: Request, env: Env) {
  const input = await bodyJSON(request);
  const title = text(input.title, 80, true);
  const pack = PACKS.find(pack => pack.id === input.packId);
  if (!pack) throw new HttpError(400, 'Choose a game for this event.');
  const settings = namingSettings(input.teamNaming);
  if (input.autoUploadDefault !== undefined && typeof input.autoUploadDefault !== 'boolean') throw new HttpError(400, 'Choose whether photos send automatically by default.');
  const now = Date.now();
  const rateKey = await hash(`${request.headers.get('CF-Connecting-IP') || 'local'}:${Math.floor(now / 3_600_000)}`);
  const rate = await env.DB.prepare('INSERT INTO rate_limits(key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 5 RETURNING count').bind(rateKey, now + 2 * 3_600_000).first();
  if (!rate) throw new HttpError(429, 'Too many events created recently. Please try again in an hour.');
  const id = crypto.randomUUID();
  const leaderToken = token();
  const joinToken = token();
  const created = await env.DB.prepare('INSERT INTO events(id, title, pack_id, leader_hash, join_token, created_at, expires_at, team_naming, auto_upload_default) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM events WHERE deleted = 0 AND expires_at > ?) < ?')
    .bind(id, title, pack.id, await hash(leaderToken), joinToken, now, now + 7 * DAY, JSON.stringify(settings), input.autoUploadDefault === true ? 1 : 0, now, MAX_ACTIVE_EVENTS).run();
  if (!created.meta.changes) throw new HttpError(503, 'Shared review is at capacity. Please try again later.');
  const event = (await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRow>())!;
  return json({ access: { eventId: id, role: 'leader', token: leaderToken }, snapshot: await snapshot(env, { event, role: 'leader' }) }, 201);
}

async function joinEvent(request: Request, env: Env, auth: Auth) {
  if (auth.role !== 'join') throw new HttpError(403, 'Use the team invite link to join.');
  const input = await bodyJSON(request);
  if (typeof input.token !== 'string' || !TOKEN.test(input.token)) throw new HttpError(400, 'Invalid team credential.');
  const digest = await hash(input.token);
  let team = await env.DB.prepare('SELECT * FROM teams WHERE event_id = ? AND token_hash = ?').bind(auth.event.id, digest).first<TeamRow>();
  // Recover the original name/path on a lost response, even after the event closes.
  if (!team) {
    if (auth.event.closed) throw new HttpError(409, 'Uploads are closed for this event. Ask your leader to reopen them.', 'UPLOADS_CLOSED');
    const settings = eventNaming(auth.event);
    const requestedName = text(input.name, 40);
    const pathId = path(input.pathId); // Older app versions can still supply a valid path.
    if (input.nameSource !== undefined && input.nameSource !== 'suggested' && input.nameSource !== 'custom' && input.nameSource !== 'random') throw new HttpError(400, 'Choose how to name your team.');
    for (let attempt = 0; attempt < 8 && !team; attempt++) {
      const used = (await env.DB.prepare('SELECT * FROM teams WHERE event_id = ?').bind(auth.event.id).all<TeamRow>()).results;
      team = used.find(item => item.token_hash === digest) ?? null;
      if (team) break;
      if (used.length >= MAX_TEAMS) throw new HttpError(409, 'This event has reached its 20-team limit.');
      const available = availableTeamNames(settings, used.map(item => item.name));
      const suggestion = available.find(name => teamNameKey(name) === teamNameKey(requestedName));
      // Legacy clients have no source field. Their supplied names still follow the event policy.
      const source = input.nameSource ?? (settings.assignment === 'random' ? 'random' : suggestion ? 'suggested' : 'custom');
      let name: string;
      if (source === 'random') {
        if (settings.assignment !== 'random') throw new HttpError(400, 'Choose a team name from the available names.');
        name = available[crypto.getRandomValues(new Uint32Array(1))[0] % available.length];
      } else {
        if (!requestedName) throw new HttpError(400, 'Choose a team name.');
        if (used.some(item => teamNameKey(item.name) === teamNameKey(requestedName))) throw new HttpError(409, 'That team name was just taken. Choose another name.');
        if (source === 'suggested') {
          if (settings.assignment !== 'choose') throw new HttpError(400, 'This event assigns team names randomly.');
          if (!suggestion) throw new HttpError(409, 'That name is no longer available. Refresh the choices and pick another.');
          name = suggestion;
        } else {
          if (!settings.allowCustom) throw new HttpError(400, 'This event uses the leader’s name list. Choose an available name.');
          name = requestedName;
        }
      }
      // Path counts are read inside the INSERT, so concurrent joins cannot all
      // choose the same least-used path. A unique index reserves the name too.
      await env.DB.prepare(`WITH routes(path) AS (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F'))
        INSERT INTO teams(id, event_id, token_hash, name, name_key, path_id, joined_at)
        SELECT ?, ?, ?, ?, ?, COALESCE(?, (
          SELECT routes.path FROM routes
          ORDER BY (SELECT COUNT(*) FROM teams WHERE event_id = ? AND path_id = routes.path), routes.path LIMIT 1
        )), ?
        WHERE EXISTS (SELECT 1 FROM events WHERE id = ? AND deleted = 0 AND closed = 0 AND expires_at > ? AND settings_revision = ?)
        AND (SELECT COUNT(*) FROM teams WHERE event_id = ?) < ? ON CONFLICT DO NOTHING`)
        .bind(crypto.randomUUID(), auth.event.id, digest, name, teamNameKey(name), pathId, auth.event.id, Date.now(), auth.event.id, Date.now(), auth.event.settings_revision, auth.event.id, MAX_TEAMS).run();
      team = await env.DB.prepare('SELECT * FROM teams WHERE event_id = ? AND token_hash = ?').bind(auth.event.id, digest).first<TeamRow>();
      if (!team && source !== 'random') throw new HttpError(409, 'That name was taken, or the event is now closed or full. Refresh and try another name.');
    }
    if (!team) throw new HttpError(409, 'Teams are joining quickly, or this event is closed or full. Please retry.');
  }
  return json({ access: { eventId: auth.event.id, role: 'team', token: input.token }, snapshot: await snapshot(env, { event: auth.event, role: 'team', team }) });
}

async function updateEvent(request: Request, env: Env, auth: Auth) {
  const input = await bodyJSON(request);
  const keys = Object.keys(input);
  if (keys.some(key => !['title', 'teamNaming', 'settingsRevision', 'closed', 'autoUploadDefault'].includes(key))) throw new HttpError(400, 'Only the event name, team-name options and upload status can be changed.');
  const editing = 'title' in input || 'teamNaming' in input || 'autoUploadDefault' in input;
  if ('autoUploadDefault' in input && typeof input.autoUploadDefault !== 'boolean') throw new HttpError(400, 'Choose whether photos send automatically by default.');
  if (!editing && !('closed' in input)) throw new HttpError(400, 'Choose event settings to update.');
  if ('closed' in input && typeof input.closed !== 'boolean') throw new HttpError(400, 'Choose whether uploads are open.');
  if (editing && (!Number.isSafeInteger(input.settingsRevision) || (input.settingsRevision as number) < 0)) throw new HttpError(400, 'Reload the event settings before saving.');
  const title = 'title' in input ? text(input.title, 80, true) : null;
  const naming = 'teamNaming' in input ? JSON.stringify(namingSettings(input.teamNaming)) : null;
  const revision = editing ? input.settingsRevision as number : null;
  // One conditional update prevents a second leader from overwriting a newer edit.
  // Omitted fields retain their current values, including an upload toggle in flight.
  const event = await env.DB.prepare(`UPDATE events SET title = COALESCE(?, title), team_naming = COALESCE(?, team_naming),
    closed = COALESCE(?, closed), auto_upload_default = COALESCE(?, auto_upload_default), settings_revision = settings_revision + ?
    WHERE id = ? AND deleted = 0 AND expires_at > ? AND (? IS NULL OR settings_revision = ?) RETURNING *`)
    .bind(title, naming, 'closed' in input ? (input.closed ? 1 : 0) : null, 'autoUploadDefault' in input ? (input.autoUploadDefault ? 1 : 0) : null, editing ? 1 : 0, auth.event.id, Date.now(), revision, revision).first<EventRow>();
  if (!event) throw new HttpError(409, 'Another leader changed this event. Reload the latest settings before saving again.');
  return json(await snapshot(env, { ...auth, event }));
}

async function updateProgress(request: Request, env: Env, auth: Auth) {
  if (auth.role !== 'team') throw new HttpError(403, 'Only a joined team can report its progress.');
  const input = await bodyJSON(request);
  const pack = PACKS.find(pack => pack.id === auth.event.pack_id)!;
  const canonical = pack.categories.flatMap(category => category.challenges.map(clue => clue.id));
  const ids = input.completedChallengeIds;
  if (Object.keys(input).some(key => !['completedChallengeIds', 'clientUpdatedAt'].includes(key)) || !Array.isArray(ids) || ids.length > canonical.length || ids.some(id => typeof id !== 'string' || !canonical.includes(id)) || new Set(ids).size !== ids.length) throw new HttpError(400, 'Send completed clues from this event’s game.');
  const at = input.clientUpdatedAt;
  if (typeof at !== 'number' || !Number.isSafeInteger(at) || at <= 0 || at > Date.now() + DAY) throw new HttpError(400, 'Invalid progress update time.');
  // Keep an offline/slow retry from reverting newer progress. A later empty list
  // is a deliberate reset, so progress is allowed to decrease.
  await env.DB.prepare(`UPDATE teams SET completed_challenges = ?, progress_updated_at = ?, progress_client_at = ?
    WHERE id = ? AND (progress_client_at IS NULL OR progress_client_at < ?)
    AND EXISTS (SELECT 1 FROM events WHERE id = ? AND deleted = 0 AND expires_at > ?)`)
    .bind(JSON.stringify(canonical.filter(id => ids.includes(id))), Date.now(), at, auth.team!.id, at, auth.event.id, Date.now()).run();
  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(auth.team!.id).first<TeamRow>();
  if (!team) throw new HttpError(410, 'This event has ended.');
  return json({ progress: progressView(team) });
}

async function updatePhotoStatus(request: Request, env: Env, auth: Auth) {
  if (auth.role !== 'team') throw new HttpError(403, 'Only a joined team can report its photo status.');
  const input = await bodyJSON(request);
  const { autoSend, queuedUploads, pendingDeletes, hasError, clientUpdatedAt: at } = input;
  const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 10000;
  if (Object.keys(input).some(key => !['autoSend', 'queuedUploads', 'pendingDeletes', 'hasError', 'clientUpdatedAt'].includes(key)) || typeof autoSend !== 'boolean' || typeof hasError !== 'boolean' || !count(queuedUploads) || !count(pendingDeletes)) throw new HttpError(400, 'Invalid photo sharing status.');
  if (typeof at !== 'number' || !Number.isSafeInteger(at) || at <= 0 || at > Date.now() + DAY) throw new HttpError(400, 'Invalid photo status time.');
  // Counts describe this phone's queue when reported, never proof it is online.
  // A delayed/offline retry must not overwrite a newer report or opt-out.
  await env.DB.prepare(`UPDATE teams SET photo_status = ?, photo_status_updated_at = ?, photo_status_client_at = ?
    WHERE id = ? AND (photo_status_client_at IS NULL OR photo_status_client_at < ?)
    AND EXISTS (SELECT 1 FROM events WHERE id = ? AND deleted = 0 AND expires_at > ?)`)
    .bind(JSON.stringify({ autoSend, queuedUploads, pendingDeletes, hasError }), Date.now(), at, auth.team!.id, at, auth.event.id, Date.now()).run();
  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(auth.team!.id).first<TeamRow>();
  if (!team) throw new HttpError(410, 'This event has ended.');
  return json({ photoStatus: photoStatusView(team) });
}

function objectKey(photo: Pick<PhotoRow, 'id' | 'event_id'>) { return `events/${photo.event_id}/${photo.id}.jpg`; }

async function uploadPhoto(request: Request, env: Env, auth: Auth) {
  if (auth.role !== 'team') throw new HttpError(403, 'Join a team before uploading photos.');
  if (auth.event.closed) throw new HttpError(409, 'Uploads are closed for this event. Ask your leader to reopen them.', 'UPLOADS_CLOSED');
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.startsWith('multipart/form-data;')) throw new HttpError(415, 'Send a JPEG photo with its clue details.');
  const data = await boundedBody(request, MAX_FILE + 16384);
  let form: FormData;
  try { form = await new Request('https://upload.invalid', { method: 'POST', headers: { 'Content-Type': contentType }, body: data }).formData(); }
  catch { throw new HttpError(400, 'Could not read this photo.'); }
  const file = form.get('photo');
  const metadata = form.get('metadata');
  if (!file || typeof file === 'string' || typeof metadata !== 'string' || metadata.length > 4096) throw new HttpError(400, 'Missing photo or clue details.');
  if (file.type !== 'image/jpeg') throw new HttpError(415, 'Only labeled JPEG photos from the hunt can be uploaded.');
  if (!file.size || file.size > MAX_FILE) throw new HttpError(413, 'This photo is too large (5 MB maximum).');
  let input: Record<string, unknown>;
  try { input = JSON.parse(metadata); if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error(); }
  catch { throw new HttpError(400, 'Invalid clue details.'); }
  if (input.packId !== auth.event.pack_id) throw new HttpError(400, 'This photo belongs to a different game.');
  const pack = PACKS.find(pack => pack.id === auth.event.pack_id)!;
  const challenge = pack.categories.flatMap(category => category.challenges).find(clue => clue.id === input.challengeId);
  if (!challenge) throw new HttpError(400, 'This clue does not belong to the event game.');
  const localId = text(input.localPhotoId, 150, true);
  const automatic = input.automatic === true;
  if (input.automatic !== undefined && typeof input.automatic !== 'boolean') throw new HttpError(400, 'Invalid photo sending mode.');
  const teamName = text(input.teamName, 40);
  const pathId = path(input.pathId);
  const captured = input.capturedAt;
  if (typeof captured !== 'number' || !Number.isSafeInteger(captured) || captured < 0 || captured > Date.now() + DAY) throw new HttpError(400, 'Invalid photo date.');
  const bytes = await file.arrayBuffer();
  const prefix = new Uint8Array(bytes);
  if (prefix[0] !== 0xff || prefix[1] !== 0xd8 || prefix[2] !== 0xff || prefix[prefix.length - 2] !== 0xff || prefix[prefix.length - 1] !== 0xd9) throw new HttpError(415, 'This file is not a JPEG photo.');
  const digest = await hash(bytes);
  const now = Date.now();
  if (automatic) {
    const removed = await env.DB.prepare('SELECT 1 FROM photo_removals WHERE event_id = ? AND team_id = ? AND local_photo_id = ?').bind(auth.event.id, auth.team!.id, localId).first();
    if (removed) throw new HttpError(409, 'This cloud photo was deleted. It will not be sent again automatically.', 'PHOTO_REMOVED');
  } else {
    // A deliberate manual re-send may restore a deleted cloud copy.
    await env.DB.prepare('DELETE FROM photo_removals WHERE event_id = ? AND team_id = ? AND local_photo_id = ?').bind(auth.event.id, auth.team!.id, localId).run();
  }
  // Release an interrupted reservation only after the old upload's lease expires.
  const existing = await env.DB.prepare('SELECT * FROM photos WHERE event_id = ? AND team_id = ? AND local_photo_id = ?').bind(auth.event.id, auth.team!.id, localId).first<PhotoRow>();
  if (existing) {
    if (existing.digest !== digest || existing.challenge_id !== challenge.id) throw new HttpError(409, 'A different photo already uses this identifier.');
    if (existing.ready) return json({ photo: photoView(existing) });
    if (existing.uploaded_at > now - 120000) throw new HttpError(409, 'This upload is still finishing. Wait a moment, refresh, then retry.');
    const released = await env.DB.prepare('DELETE FROM photos WHERE id = ? AND ready = 0 AND uploaded_at <= ? RETURNING id').bind(existing.id, now - 120000).first();
    if (released) await env.PHOTOS.delete(objectKey(existing));
    else throw new HttpError(409, 'This photo just finished uploading. Refresh to see it.');
  }
  const id = crypto.randomUUID();
  const reserved = await env.DB.prepare(`INSERT INTO photos(id, event_id, team_id, local_photo_id, challenge_id, challenge_number, challenge_title, team_name, path_id, captured_at, uploaded_at, bytes, digest)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM events WHERE id = ? AND deleted = 0 AND closed = 0 AND expires_at > ? AND photo_count < ? AND photo_bytes + ? <= ?)
    AND (SELECT COUNT(*) FROM photos WHERE team_id = ?) < 60
    AND NOT EXISTS (SELECT 1 FROM photo_removals WHERE event_id = ? AND team_id = ? AND local_photo_id = ?)
    ON CONFLICT(event_id, team_id, local_photo_id) DO NOTHING`)
    .bind(id, auth.event.id, auth.team!.id, localId, challenge.id, challenge.number, challenge.title, teamName || null, pathId, captured, now, bytes.byteLength, digest,
      auth.event.id, now, MAX_PHOTOS, bytes.byteLength, MAX_EVENT_BYTES, auth.team!.id, auth.event.id, auth.team!.id, localId).run();
  if (!reserved.meta.changes) throw new HttpError(409, 'This event is closed, an upload is already finishing, or the photo limit has been reached (60 per team, 300 photos / 100 MB per event).');
  const key = objectKey({ id, event_id: auth.event.id });
  try {
    await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'private, no-store' } });
    const committed = await env.DB.prepare('UPDATE photos SET ready = 1 WHERE id = ? AND EXISTS (SELECT 1 FROM events WHERE id = ? AND deleted = 0 AND expires_at > ?) AND NOT EXISTS (SELECT 1 FROM photo_removals WHERE event_id = ? AND team_id = ? AND local_photo_id = ?)')
      .bind(id, auth.event.id, Date.now(), auth.event.id, auth.team!.id, localId).run();
    if (!committed.meta.changes) throw new HttpError(409, 'This photo was removed or the event ended before sending finished.', 'PHOTO_REMOVED');
  } catch (error) {
    await env.PHOTOS.delete(key);
    await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    throw error;
  }
  const photo = (await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(id).first<PhotoRow>())!;
  if (!photo) throw new HttpError(409, 'This photo was removed while sending.', 'PHOTO_REMOVED');
  return json({ photo: photoView(photo) }, 201);
}

/** Record removal before deleting bytes/rows. Late automatic uploads cannot
 * resurrect the image, including when a delete overtakes an in-flight PUT. */
async function removeLocalPhoto(env: Env, eventId: string, teamId: string, localId: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO photo_removals(event_id, team_id, local_photo_id) VALUES (?, ?, ?)').bind(eventId, teamId, localId).run();
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE event_id = ? AND team_id = ? AND local_photo_id = ?').bind(eventId, teamId, localId).first<PhotoRow>();
  if (photo) {
    await env.PHOTOS.delete(objectKey(photo));
    await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photo.id).run();
  }
  return json({ ok: true });
}
async function selectedPhoto(env: Env, auth: Auth, id: string) {
  if (auth.role === 'join') throw new HttpError(403, 'The invite link cannot view photos.');
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ? AND event_id = ? AND ready = 1').bind(id, auth.event.id).first<PhotoRow>();
  if (!photo || (auth.role === 'team' && photo.team_id !== auth.team!.id)) throw new HttpError(404, 'Photo not found.');
  return photo;
}
async function purgeEvent(env: Env, id: string) {
  // Event is already tombstoned. Retain the tombstone for a later sweep in case
  // an upload was in flight when deletion started; access stops immediately.
  let cursor: string | undefined;
  do {
    const list = await env.PHOTOS.list({ prefix: `events/${id}/`, limit: 1000, cursor });
    if (list.objects.length) await env.PHOTOS.delete(list.objects.map(object => object.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM photos WHERE event_id = ?').bind(id),
    env.DB.prepare('DELETE FROM teams WHERE event_id = ?').bind(id),
    env.DB.prepare("UPDATE events SET last_purged_at = ?, title = 'Deleted event', team_naming = NULL WHERE id = ?").bind(Date.now(), id),
  ]);
}
async function cleanup(env: Env) {
  const now = Date.now();
  const expired = await env.DB.prepare('SELECT id FROM events WHERE expires_at <= ? OR deleted = 1 ORDER BY last_purged_at, expires_at LIMIT 20').bind(now).all<{ id: string }>();
  // D1 Free permits 50 requests per invocation; a batch counts as one.
  // Revoke access first, then purge objects before deleting any tombstones.
  if (expired.results.length) await env.DB.batch(expired.results.map(event =>
    env.DB.prepare('UPDATE events SET deleted = 1 WHERE id = ?').bind(event.id)));
  for (const event of expired.results) {
    await purgeEvent(env, event.id);
  }
  await env.DB.prepare('DELETE FROM events WHERE expires_at < ? AND last_purged_at >= ?').bind(now - DAY, now).run();
  const stale = await env.DB.prepare('SELECT * FROM photos WHERE ready = 0 AND uploaded_at < ? LIMIT 100').bind(now - 120000).all<PhotoRow>();
  if (stale.results.length) {
    const released = await env.DB.batch<{ id: string }>(stale.results.map(photo =>
      env.DB.prepare('DELETE FROM photos WHERE id = ? AND ready = 0 RETURNING id').bind(photo.id)));
    const keys = stale.results.filter((_, index) => released[index].results.length > 0).map(objectKey);
    if (keys.length) await env.PHOTOS.delete(keys);
  }
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
}
async function route(request: Request, env: Env) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
  if (url.pathname === '/events' && request.method === 'POST') return createEvent(request, env);
  if (parts[0] !== 'events' || !parts[1] || parts.length > 4) throw new HttpError(404, 'Not found.');
  const auth = await authorize(request, env, parts[1]);
  if (parts.length === 2) {
    if (request.method === 'GET') return json(await snapshot(env, auth));
    leader(auth);
    if (request.method === 'PATCH') return updateEvent(request, env, auth);
    if (request.method === 'DELETE') {
      await env.DB.prepare('UPDATE events SET deleted = 1, closed = 1 WHERE id = ?').bind(auth.event.id).run();
      await purgeEvent(env, auth.event.id);
      return json({ ok: true });
    }
  }
  if (parts[2] === 'teams' && parts.length === 3 && request.method === 'POST') return joinEvent(request, env, auth);
  if (parts[2] === 'photo-status' && parts.length === 3 && request.method === 'POST') return updatePhotoStatus(request, env, auth);
  if (parts[2] === 'progress' && parts.length === 3 && request.method === 'POST') return updateProgress(request, env, auth);
  if (parts[2] === 'local-photos' && parts.length === 4 && request.method === 'DELETE') {
    if (auth.role !== 'team') throw new HttpError(403, 'Only a team can sync its local photo deletions.');
    let localId: string;
    try { localId = text(decodeURIComponent(parts[3]), 150, true); } catch { throw new HttpError(400, 'Invalid photo identifier.'); }
    return removeLocalPhoto(env, auth.event.id, auth.team!.id, localId);
  }
  if (parts[2] === 'photos') {
    if (parts.length === 3 && request.method === 'POST') return uploadPhoto(request, env, auth);
    if (parts.length === 4 && ['GET', 'DELETE'].includes(request.method)) {
      const photo = await selectedPhoto(env, auth, parts[3]);
      if (request.method === 'DELETE') {
        return removeLocalPhoto(env, auth.event.id, photo.team_id, photo.local_photo_id);
      }
      const object = await env.PHOTOS.get(objectKey(photo));
      if (!object) throw new HttpError(404, 'Photo not found. Please refresh.');
      return new Response(object.body, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(object.size), 'Content-Disposition': `inline; filename="clue-${photo.challenge_number}-${photo.id}.jpg"` } });
    }
  }
  throw new HttpError(405, 'This action is not available.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
    const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" });
    if (origin && !allowed.includes(origin)) return new Response('Origin not allowed', { status: 403, headers });
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    let response: Response;
    try { response = await route(request, env); }
    catch (error) {
      response = error instanceof HttpError ? json({ error: error.message, code: error.code }, error.status) : json({ error: 'The service could not finish this request. Please retry; your local photos are safe.' }, 500);
      // No tokens, headers, names, photo bytes, or request URLs in logs.
      if (!(error instanceof HttpError)) console.error('Shared review request failed', error instanceof Error ? error.name : 'unknown');
    }
    headers.forEach((value, key) => response.headers.set(key, value));
    return response;
  },
  async scheduled(_controller: ScheduledController, env: Env) { await cleanup(env); },
} satisfies ExportedHandler<Env>;
