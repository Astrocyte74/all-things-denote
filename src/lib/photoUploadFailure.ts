import { ReviewError } from './sharedReview';

export type PhotoFailureScope = 'photo' | 'connection' | 'uploads' | 'event';

const uploadLimits = new Set(['UPLOADS_CLOSED', 'TEAM_PHOTO_LIMIT', 'EVENT_PHOTO_LIMIT', 'EVENT_STORAGE_LIMIT']);

/** A pause for the event's uploads must still allow deletions to free space. */
export function photoFailureScope(error: unknown): PhotoFailureScope {
  if (!(error instanceof ReviewError)) return 'photo';
  if (error.status === 0) return 'connection';
  if (uploadLimits.has(error.code ?? '')) return 'uploads';
  if ([401, 403, 404, 410, 429].includes(error.status) || error.status >= 500) return 'event';
  return 'photo';
}
