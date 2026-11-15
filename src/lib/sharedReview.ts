import type { StoredPhoto } from './photoStorage';
import type { TeamNamingSettings } from './teamNaming';

export interface ReviewEvent {
  id: string;
  title: string;
  packId: string;
  createdAt: number;
  expiresAt: number;
  closed: boolean;
  maxTeams: number;
  maxPhotos: number;
  teamNaming?: TeamNamingSettings;
  settingsRevision: number;
  autoUploadDefault?: boolean;
}
export interface ReviewProgress { completedChallengeIds: string[]; updatedAt: number; clientUpdatedAt: number }
export interface ReviewPhotoStatus {
  autoSend: boolean;
  queuedUploads: number;
  pendingDeletes: number;
  hasError: boolean;
  updatedAt: number;
  clientUpdatedAt: number;
}
export interface ReviewTeam { id: string; name: string; pathId?: string; joinedAt: number; progress?: ReviewProgress; photoStatus?: ReviewPhotoStatus }
export interface ReviewPhoto {
  id: string;
  teamId: string;
  localPhotoId: string;
  challengeId: string;
  challengeNumber: number;
  challengeTitle: string;
  teamName?: string;
  pathId?: string;
  capturedAt: number;
  uploadedAt: number;
  bytes: number;
}
export interface EventAccess { eventId: string; token: string; role: 'leader' | 'team' | 'join' }
export interface ReviewSnapshot {
  event: ReviewEvent;
  role: EventAccess['role'];
  team?: ReviewTeam;
  teams: ReviewTeam[];
  photos: ReviewPhoto[];
  /** Only returned with leader access. Never put this in a leader link. */
  joinToken?: string;
  /** Available choices only. Invite holders never receive team records or photos. */
  joinOptions?: { names: string[]; spotsRemaining: number };
}
export interface SavedReview { access: EventAccess; title: string; packId: string; expiresAt: number }
export type ReviewRoute = { screen: 'home'; packId?: string; intent?: 'create' | 'join' } | { screen: 'event'; access: EventAccess };
const STORAGE_KEY = 'sharedReviews:v1';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const EVENT_ID = /^[a-f0-9-]{36}$/;

const API_BASE = (import.meta.env.VITE_REVIEW_API_URL || '').replace(/\/$/, '');
export const reviewConfigured = Boolean(API_BASE);

export class ReviewError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.name = 'ReviewError'; this.status = status; this.code = code; }
}

async function request<T>(path: string, access?: EventAccess, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new ReviewError('Group events are not connected yet. Your hunt and photos still work on this device.', 503);
  const headers = new Headers(options.headers);
  if (access) headers.set('Authorization', `Bearer ${access.token}`);
  if (typeof options.body === 'string') headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, signal: options.signal ?? AbortSignal.timeout(20000), headers, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch { throw new ReviewError('Could not connect. Check your connection and retry; your photos are still on this device.', 0); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ReviewError(body.error || 'The request could not be completed. Please retry.', response.status, body.code);
  }
  return response.json() as Promise<T>;
}

function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function getSavedReviews(): SavedReview[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is SavedReview => Boolean(entry && EVENT_ID.test(entry.access?.eventId) && TOKEN.test(entry.access?.token) && ['leader', 'team'].includes(entry.access.role) && typeof entry.title === 'string' && typeof entry.packId === 'string' && entry.expiresAt > Date.now()));
  } catch { return []; }
}

export function rememberReview(access: EventAccess, event: ReviewEvent) {
  if (access.role === 'join') return;
  const saved = getSavedReviews().filter(item => !(item.access.eventId === access.eventId && item.access.role === access.role));
  saved.unshift({ access, title: event.title, packId: event.packId, expiresAt: event.expiresAt });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 30))); } catch { /* The current private link still works. */ }
}

export function forgetReview(eventId: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSavedReviews().filter(item => item.access.eventId !== eventId)));
}

export function readReviewRoute(): ReviewRoute | null {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('review') === 'home') return { screen: 'home', packId: hash.get('game') || undefined, intent: hash.get('action') === 'create' ? 'create' : hash.get('action') === 'join' ? 'join' : undefined };
  const access = parseReviewLink(location.href);
  return access ? { screen: 'event', access } : null;
}

export function parseReviewLink(value: string): EventAccess | null {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  const base = new URL(import.meta.env.BASE_URL, location.origin);
  if (url.origin !== base.origin || url.pathname.replace(/\/$/, '') !== base.pathname.replace(/\/$/, '')) return null;
  const hash = new URLSearchParams(url.hash.slice(1));
  const eventId = hash.get('event');
  if (!eventId || !EVENT_ID.test(eventId)) return null;
  for (const role of ['leader', 'team', 'join'] as const) {
    const token = hash.get(role);
    if (token && TOKEN.test(token)) return { eventId, token, role };
  }
  return null;
}

export function reviewLink(access: EventAccess): string {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  url.hash = new URLSearchParams({ event: access.eventId, [access.role]: access.token }).toString();
  return url.href;
}

export function openReviewHome(packId?: string, intent?: 'create' | 'join') {
  location.hash = new URLSearchParams({ review: 'home', ...(intent ? { action: intent } : {}), ...(packId ? { game: packId } : {}) }).toString();
}

export function openReview(access: EventAccess) {
  location.hash = new URL(reviewLink(access)).hash;
}

export async function createReview(title: string, packId: string, teamNaming?: TeamNamingSettings, autoUploadDefault = true): Promise<{ access: EventAccess; snapshot: ReviewSnapshot }> {
  const result = await request<{ access: EventAccess; snapshot: ReviewSnapshot }>('/events', undefined, { method: 'POST', body: JSON.stringify({ title, packId, teamNaming, autoUploadDefault }) });
  rememberReview(result.access, result.snapshot.event);
  return result;
}

export async function fetchReview(access: EventAccess): Promise<ReviewSnapshot> {
  const snapshot = await request<ReviewSnapshot>(`/events/${access.eventId}`, access);
  rememberReview(access, snapshot.event);
  return snapshot;
}

export async function joinReview(access: EventAccess, name: string, pathId?: string, nameSource?: 'suggested' | 'custom' | 'random'): Promise<{ access: EventAccess; snapshot: ReviewSnapshot }> {
  // Keep the same credential across network retries, so one team is never registered twice.
  const key = `reviewJoinPending:${access.eventId}`;
  let token = sessionStorage.getItem(key);
  if (!token || !TOKEN.test(token)) { token = randomToken(); sessionStorage.setItem(key, token); }
  const result = await request<{ access: EventAccess; snapshot: ReviewSnapshot }>(`/events/${access.eventId}/teams`, access, { method: 'POST', body: JSON.stringify({ name, pathId, token, nameSource }) });
  rememberReview(result.access, result.snapshot.event);
  sessionStorage.removeItem(key);
  return result;
}

export async function uploadReviewPhoto(access: EventAccess, photo: StoredPhoto, onProgress?: (percent: number) => void, options: { automatic?: boolean; signal?: AbortSignal } = {}): Promise<ReviewPhoto> {
  if (!API_BASE) throw new ReviewError('Group events are not connected yet.', 503);
  const body = new FormData();
  const bytes = atob(photo.imageData.split(',')[1] || '');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new ReviewError('This photo is too large to upload (5 MB maximum).', 413);
  body.set('photo', new Blob([Uint8Array.from(bytes, char => char.charCodeAt(0))], { type: 'image/jpeg' }), 'photo.jpg');
  body.set('metadata', JSON.stringify({ localPhotoId: photo.id, packId: photo.packId || 'scavenger', challengeId: photo.challengeId, teamName: photo.teamName, pathId: photo.pathId, capturedAt: photo.timestamp, automatic: options.automatic === true }));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/events/${access.eventId}/photos`);
    xhr.setRequestHeader('Authorization', `Bearer ${access.token}`);
    xhr.timeout = 90000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      let result;
      try { result = JSON.parse(xhr.responseText); } catch { reject(new ReviewError('Upload did not finish. Please retry.', xhr.status)); return; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(result.photo);
      else reject(new ReviewError(result.error || 'Upload failed. Please retry.', xhr.status, result.code));
    };
    xhr.onerror = xhr.ontimeout = () => reject(new ReviewError('Upload interrupted. Your photo is still on this device; reconnect and retry.', 0));
    const abort = () => xhr.abort();
    xhr.onabort = () => reject(new ReviewError('Photo sending paused.', 0, 'ABORTED'));
    xhr.onloadend = () => options.signal?.removeEventListener('abort', abort);
    if (options.signal?.aborted) { reject(new ReviewError('Photo sending paused.', 0, 'ABORTED')); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.send(body);
  });
}

/** Caller owns the returned Blob and should revoke object URLs when no longer needed. */
export async function fetchReviewPhoto(access: EventAccess, photoId: string): Promise<Blob> {
  if (!API_BASE) throw new ReviewError('Group events are not connected yet.', 503);
  const response = await fetch(`${API_BASE}/events/${access.eventId}/photos/${photoId}`, { headers: { Authorization: `Bearer ${access.token}` }, signal: AbortSignal.timeout(30000), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new ReviewError('Could not load this photo. Refresh and retry.', response.status);
  return response.blob();
}

export async function setReviewClosed(access: EventAccess, closed: boolean) {
  return request<ReviewSnapshot>(`/events/${access.eventId}`, access, { method: 'PATCH', body: JSON.stringify({ closed }) });
}

export async function updateReviewSettings(access: EventAccess, changes: { title: string; teamNaming: TeamNamingSettings; settingsRevision: number; autoUploadDefault?: boolean }) {
  const snapshot = await request<ReviewSnapshot>(`/events/${access.eventId}`, access, { method: 'PATCH', body: JSON.stringify(changes) });
  rememberReview(access, snapshot.event);
  return snapshot;
}

export async function sendReviewPhotoStatus(access: EventAccess, status: Omit<ReviewPhotoStatus, 'updatedAt'>) {
  return request<{ photoStatus: ReviewPhotoStatus }>(`/events/${access.eventId}/photo-status`, access, { method: 'POST', body: JSON.stringify(status) });
}

export async function sendReviewProgress(access: EventAccess, progress: { completedChallengeIds: string[]; clientUpdatedAt: number }) {
  return request<{ progress: ReviewProgress }>(`/events/${access.eventId}/progress`, access, { method: 'POST', body: JSON.stringify(progress) });
}

export async function deleteReviewPhoto(access: EventAccess, photoId: string) {
  return request<{ ok: true }>(`/events/${access.eventId}/photos/${photoId}`, access, { method: 'DELETE' });
}

export async function deleteReview(access: EventAccess) {
  await request<{ ok: true }>(`/events/${access.eventId}`, access, { method: 'DELETE' });
  forgetReview(access.eventId);
}

/** Delete by the original device ID, even if its upload response was lost. */
export function deleteReviewLocalPhoto(access: EventAccess, localPhotoId: string) {
  return request<{ ok: true }>(`/events/${access.eventId}/local-photos/${encodeURIComponent(localPhotoId)}`, access, { method: 'DELETE' });
}
