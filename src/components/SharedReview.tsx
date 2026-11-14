import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchReview, forgetReview, openReviewHome, type EventAccess, type ReviewRoute, type ReviewSnapshot } from '@/lib/sharedReview';
import { describeError, errorStatus } from './shared-review/common';
import { Notice, ReviewShell } from './shared-review/ui';
import { ReviewHome } from './shared-review/ReviewHome';
import { LeaderView } from './shared-review/LeaderView';
import { JoinView } from './shared-review/JoinView';
import { TeamView } from './shared-review/TeamView';
import './SharedReview.css';

interface SharedReviewProps {
  route: ReviewRoute;
  /** Leave shared review and return to the game library. */
  onBack: () => void;
  /** Leave shared review and open a game (team has no photos yet). */
  onPlay: (access: EventAccess, snapshot: ReviewSnapshot) => void;
  onJoined: (access: EventAccess, snapshot: ReviewSnapshot) => void;
}

/**
 * Shared review overlay: private event links, team uploads and the
 * clue-by-clue leader comparison. Rendered by App whenever the URL hash
 * holds a review route; normal hunt state stays untouched underneath.
 */
export function SharedReview({ route, onBack, onPlay, onJoined }: SharedReviewProps) {
  const routeKey = route.screen === 'home' ? `home:${route.packId ?? ''}:${route.intent ?? ''}` : `${route.access.eventId}:${route.access.role}:${route.access.token}`;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [routeKey]);

  if (route.screen === 'home') return <ReviewHome key={routeKey} packId={route.packId} intent={route.intent} onBack={onBack} />;
  return <ReviewEvent key={routeKey} access={route.access} onBack={onBack} onPlay={onPlay} onJoined={onJoined} />;
}

function ReviewEvent({ access, onBack, onPlay, onJoined }: { access: EventAccess } & Pick<SharedReviewProps, 'onBack' | 'onPlay' | 'onJoined'>) {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchReview(access);
      setSnapshot(next);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
    }
  }, [access]);
  useEffect(() => { void refresh(); }, [refresh]);

  const backToReviews = () => openReviewHome();
  const status = errorStatus(error);
  const gone = status === 401 || status === 404 || status === 410;

  // First load failed (or the link is dead): full-page state.
  if (!snapshot || gone) {
    return (
      <ReviewShell onBack={onBack}>
        {!error ? (
          <p role="status" className="flex items-center justify-center gap-2 py-24 font-display text-2xl text-ink/70">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={3} aria-hidden="true" /> Opening event…
          </p>
        ) : (
          <div className="sticker-card mx-auto max-w-lg p-5 text-center sm:p-6">
            <h1 className="font-display text-3xl">{gone ? (status === 401 ? 'This link doesn’t work' : 'This event has ended') : 'Couldn’t open the event'}</h1>
            <p className="mt-2 font-semibold text-ink/75">{describeError(error)}</p>
            {gone && <p className="mt-2 text-sm font-semibold text-ink/65">Your photos are still saved on this device.</p>}
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {!gone && (
                <button type="button" onClick={() => void refresh()} disabled={refreshing} className="btn-3d btn-go inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-display text-lg tracking-wide text-ink">
                  {refreshing && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />} Try again
                </button>
              )}
              {gone && access.role !== 'join' && (
                <button type="button" onClick={() => { forgetReview(access.eventId); backToReviews(); }} className="btn-3d btn-white min-h-12 rounded-2xl px-5 font-extrabold text-ink">
                  Remove from this device
                </button>
              )}
              <button type="button" onClick={backToReviews} className="btn-3d btn-white min-h-12 rounded-2xl px-5 font-extrabold text-ink">Group events home</button>
            </div>
          </div>
        )}
      </ReviewShell>
    );
  }

  // Later refreshes that fail keep the last good snapshot on screen.
  const refreshError = error ? describeError(error) : null;
  const shellBack = { onBack: backToReviews, backLabel: 'All events' };

  if (snapshot.role === 'leader') {
    return (
      <ReviewShell {...shellBack} wide>
        <LeaderView access={access} snapshot={snapshot} setSnapshot={setSnapshot} refresh={refresh} refreshing={refreshing} refreshError={refreshError} updatedAt={updatedAt} />
      </ReviewShell>
    );
  }
  if (snapshot.role === 'team') {
    return (
      <ReviewShell {...shellBack} wide>
        {refreshError && <div className="mx-auto mb-4 max-w-4xl"><Notice tone="offline">{refreshError}</Notice></div>}
        <TeamView access={access} snapshot={snapshot} refresh={refresh} onPlay={() => onPlay(access, snapshot)} />
      </ReviewShell>
    );
  }
  return (
    <ReviewShell onBack={onBack}>
      <JoinView access={access} snapshot={snapshot} onJoined={onJoined} />
    </ReviewShell>
  );
}
