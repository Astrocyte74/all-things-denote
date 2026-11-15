export type PhotoSharingState = {
  ready: boolean;
  enabled: boolean;
  pending: number;
  uploading: boolean;
  offline: boolean;
  error: string | null;
};

/** Shared wording for the menu and the full photo-sharing controls. Offline
 * queueing is normal; failed sends and settings errors need attention. */
export function photoSharingStatus(state: PhotoSharingState, action: 'switching' | 'retrying' | null = null): { tone: 'idle' | 'ok' | 'busy' | 'wait' | 'error'; text: string } {
  if (action === 'switching') return { tone: 'busy', text: state.enabled ? 'Turning off…' : 'Turning on…' };
  if (action === 'retrying') return { tone: 'busy', text: 'Retrying…' };
  if (state.error) return { tone: 'error', text: 'Needs attention' };
  if (!state.ready) return { tone: 'busy', text: 'Checking…' };
  if (!state.enabled) return state.pending > 0 ? { tone: 'wait', text: `Off · ${state.pending} removal${state.pending === 1 ? '' : 's'} waiting` } : { tone: 'idle', text: 'Off · you choose what to send' };
  if (state.uploading) return { tone: 'busy', text: 'Sending to your leader…' };
  if (state.pending > 0) return { tone: 'wait', text: `${state.offline ? 'Offline · ' : ''}${state.pending} photo update${state.pending === 1 ? '' : 's'} waiting` };
  return { tone: 'ok', text: 'On · all caught up' };
}
