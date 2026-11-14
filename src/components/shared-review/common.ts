import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ReviewError, fetchReviewPhoto, type EventAccess } from '@/lib/sharedReview';
import { getPackById } from '@/data/packs';
import type { Category, Challenge } from '@/types';

/** Same colors as the path cards and the baked photo pills. */
export const PATH_COLORS: Record<string, string> = {
  A: '#FFB020', B: '#FF6B6B', C: '#38B6FF', D: '#2FBF71', E: '#7A6CF0', F: '#FF9DE2',
};

/** Plain-language message for any shared-review failure. */
export function describeError(error: unknown): string {
  if (error instanceof ReviewError) {
    switch (error.status) {
      case 0: return 'You seem to be offline. Your photos are safe on this device. Reconnect and try again.';
      case 401: return 'This link isn’t valid. Ask the leader to send it again, and copy the whole link.';
      case 404:
      case 410: return 'This event has ended or was deleted.';
      case 503: return error.message || 'Group events are temporarily unavailable. Your hunt and photos still work on this device.';
      default: return error.message || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export function errorStatus(error: unknown): number | null {
  return error instanceof ReviewError ? error.status : null;
}

/** Network-level or link-level failures stop an upload queue; per-photo ones don't. */
export function isFatalUploadError(error: unknown): boolean {
  const status = errorStatus(error);
  return status === null || [0, 401, 403, 404, 409, 410, 503].includes(status);
}

const expiryFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function formatExpiry(expiresAt: number) {
  return expiryFormat.format(new Date(expiresAt));
}

export function relativeTime(at: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
}

export interface Clue { challenge: Challenge; category: Category }

/** Every clue in the event's game, in canonical number order (never path order). */
export function packClues(packId: string): Clue[] {
  return getPackById(packId).categories
    .flatMap(category => category.challenges.map(challenge => ({ challenge, category })))
    .sort((a, b) => a.challenge.number - b.challenge.number);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Toasts that never block taps on the controls under them. */
export const notify = {
  success: (message: string) => toast.success(message, { style: { pointerEvents: 'none' } }),
  error: (message: string) => toast.error(message),
};

export async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(`${label} copied`);
    return true;
  } catch {
    notify.error('Couldn’t copy automatically. Select the link and copy it.');
    return false;
  }
}

// ── Photo blobs ────────────────────────────────────────────────────────────
// Photos are fetched with the bearer token in a header (never in an image
// URL), cached briefly as Blobs, and shown through object URLs that each
// component revokes when it unmounts.

const CACHE_LIMIT = 12;
const blobCache = new Map<string, Promise<Blob>>();

export function loadReviewPhoto(access: EventAccess, photoId: string): Promise<Blob> {
  const key = `${access.eventId}:${photoId}:${access.token}`;
  const cached = blobCache.get(key);
  if (cached) {
    blobCache.delete(key);
    blobCache.set(key, cached); // refresh LRU position
    return cached;
  }
  const pending = fetchReviewPhoto(access, photoId);
  pending.catch(() => blobCache.delete(key));
  blobCache.set(key, pending);
  while (blobCache.size > CACHE_LIMIT) blobCache.delete(blobCache.keys().next().value!);
  return pending;
}

export function forgetReviewPhoto(eventId: string, photoId: string) {
  for (const key of blobCache.keys()) {
    if (key.startsWith(`${eventId}:${photoId}:`)) blobCache.delete(key);
  }
}

/** Object URL for one shared photo. Key the calling component by photo id. */
export function useReviewPhotoUrl(access: EventAccess, photoId: string) {
  const [result, setResult] = useState<{ url?: string; failed?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    loadReviewPhoto(access, photoId)
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setResult({ url });
      })
      .catch(() => { if (!cancelled) setResult({ failed: true }); });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [access, photoId, attempt]);
  return { ...result, retry: () => { setResult({}); setAttempt(n => n + 1); } };
}

/** Read the device's saved team name / path for a game, to prefill joining. */
export function savedTeamDefaults(packId: string): { name: string; pathId: string } {
  const read = (key: string) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '{}');
      return value && typeof value === 'object' ? (value as Record<string, string>)[packId] ?? '' : '';
    } catch { return ''; }
  };
  return { name: read('teamNameByPack'), pathId: read('pathByPack') };
}
