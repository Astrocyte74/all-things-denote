import { useEffect, useRef, useState, type MouseEvent } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { zip } from 'fflate';
import { Copy, Crown, FolderDown, KeyRound, Loader2, Lock, LockOpen, Pencil, QrCode, RefreshCw, Settings2, Share2, Trash2, X } from 'lucide-react';
import { getPackById } from '@/data/packs';
import { deleteReview, openReviewHome, reviewLink, setReviewClosed, type EventAccess, type ReviewSnapshot } from '@/lib/sharedReview';
import { copyText, describeError, downloadBlob, formatExpiry, loadReviewPhoto, notify, packClues, relativeTime, slug } from './common';
import { CompareClues } from './CompareClues';
import { LeaderDashboard } from './LeaderDashboard';
import { EventSettingsDialog } from './EventSettingsDialog';
import { describeTeamNaming } from './teamNamingText';
import { AutoSendSummary } from './PhotoAutoSendControl';
import { DEFAULT_TEAM_NAMING } from '@/lib/teamNaming';
import { Notice, PackBadge, QrImage } from './ui';

interface LeaderViewProps {
  access: EventAccess;
  snapshot: ReviewSnapshot;
  setSnapshot: (snapshot: ReviewSnapshot) => void;
  refresh: () => Promise<void>;
  refreshing: boolean;
  refreshError: string | null;
  updatedAt: number;
}

const POLL_MS = 20_000;

export function LeaderView({ access, snapshot, setSnapshot, refresh, refreshing, refreshError, updatedAt }: LeaderViewProps) {
  const { event, capacity } = snapshot;
  const freeMiB = capacity ? (capacity.maxBytes - capacity.usedBytes) / (1024 * 1024) : 0;
  const freeSize = freeMiB > 0 && freeMiB < 1 ? 'Under 1' : Math.floor(freeMiB);
  const nearlyFull = capacity && (capacity.usedPhotos >= capacity.maxPhotos * 0.9 || capacity.usedBytes >= capacity.maxBytes * 0.9);
  const pack = getPackById(event.packId);
  const joinLink = snapshot.joinToken ? reviewLink({ eventId: event.id, token: snapshot.joinToken, role: 'join' }) : null;
  const leaderLink = reviewLink(access);
  const [bigQr, setBigQr] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [zipState, setZipState] = useState<{ done: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  // The dialog mounts without a Radix trigger, so return focus to whichever button opened it.
  const editTrigger = useRef<HTMLElement | null>(null);
  const openEditor = (e: MouseEvent<HTMLElement>) => { editTrigger.current = e.currentTarget; setEditing(true); };
  const closeEditor = () => { setEditing(false); window.setTimeout(() => editTrigger.current?.focus(), 0); };

  // Modest polling, only while the page is visible.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(tick, POLL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 5_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  const jumpTo = (id: string) => {
    const heading = document.getElementById(id);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  };

  const toggleClosed = async () => {
    setToggling(true);
    try {
      setSnapshot(await setReviewClosed(access, !event.closed));
      notify.success(event.closed ? 'Uploads reopened' : 'Uploads closed. You can still review everything.');
    } catch (error) { notify.error(describeError(error)); }
    finally { setToggling(false); }
  };

  const share = async () => {
    if (!joinLink) return;
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: `Join “${event.title}” and share your ${pack.title} photos`, url: joinLink }); return; }
      catch (error) { if ((error as Error).name === 'AbortError') return; }
    }
    void copyText(joinLink, 'Invite link');
  };

  const downloadAll = async () => {
    if (zipState || !snapshot.photos.length) return;
    const order = new Map(packClues(pack.id).map((clue, i) => [clue.challenge.id, i]));
    const teamName = new Map(snapshot.teams.map(team => [team.id, team.name]));
    const photos = [...snapshot.photos].sort((a, b) => (order.get(a.challengeId) ?? 99) - (order.get(b.challengeId) ?? 99) || a.capturedAt - b.capturedAt);
    setZipState({ done: 0, total: photos.length });
    try {
      const files: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      for (const [i, photo] of photos.entries()) {
        const blob = await loadReviewPhoto(access, photo.id);
        const folder = `${String(photo.challengeNumber).padStart(2, '0')}-${slug(photo.challengeTitle)}`;
        const base = `${folder}/${slug(teamName.get(photo.teamId) ?? photo.teamName ?? 'team')}${photo.pathId ? `-path-${photo.pathId.toLowerCase()}` : ''}`;
        let name = base;
        let n = 2;
        while (used.has(name)) name = `${base}-${n++}`;
        used.add(name);
        files[`${name}.jpg`] = new Uint8Array(await blob.arrayBuffer());
        setZipState({ done: i + 1, total: photos.length });
      }
      const archive = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 0 }, (err, out) => err ? reject(err) : resolve(out)));
      downloadBlob(new Blob([new Uint8Array(archive)], { type: 'application/zip' }), `${slug(event.title)}-photos.zip`);
    } catch (error) {
      notify.error(describeError(error));
    } finally {
      setZipState(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-start">
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
        {/* Event */}
        <div className="sticker-card overflow-hidden">
          <div className="border-b-2 border-ink p-4" style={{ backgroundColor: pack.library.soft }}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/70">
                <Crown className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> Leader view
              </p>
              <button
                type="button"
                onClick={openEditor}
                className="btn-3d btn-white inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-ink"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> Edit event
              </button>
            </div>
            <h1 className="mt-1 break-words font-display text-3xl leading-tight">{event.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <PackBadge pack={pack} size="sm" />
              <div className="min-w-0 text-sm font-semibold">
                <p className="font-extrabold">{pack.title}</p>
                <p className="text-ink/70">Save shared photos before this event ends {formatExpiry(event.expiresAt)}.</p>
                <button type="button" onClick={() => void downloadAll()} disabled={!snapshot.photos.length || Boolean(zipState)} className="btn-3d btn-white mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-ink">
                  {zipState ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} aria-hidden="true" /> : <FolderDown className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}
                  {zipState ? `Preparing ${zipState.done} of ${zipState.total}…` : `Download ZIP (${snapshot.photos.length})`}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-ink/10 text-center">
            <div className="p-3"><p className="font-display text-3xl leading-none">{snapshot.teams.length}</p><p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">{snapshot.teams.length === 1 ? 'Team' : 'Teams'}</p></div>
            <div className="p-3"><p className="font-display text-3xl leading-none">{snapshot.photos.length}</p><p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">Photos</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/10 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold ${event.closed ? 'bg-coral-soft' : 'bg-go-soft'}`}>
                {event.closed ? <Lock className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : <LockOpen className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                {event.closed ? 'Uploads closed' : 'Open for uploads'}
              </span>
              {event.closed && <button type="button" onClick={() => void toggleClosed()} disabled={toggling}
                className="btn-3d btn-white inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-extrabold">
                <LockOpen className="h-4 w-4" aria-hidden="true" /> Reopen uploads
              </button>}
            </div>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-extrabold text-ink/70 hover:text-ink">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={3} aria-hidden="true" />
              {refreshing ? 'Refreshing…' : `Updated ${relativeTime(updatedAt, now)}`}
            </button>
          </div>
          {capacity && (
            <div className="border-t-2 border-ink/10 px-3 py-2 text-sm font-semibold">
              <div className="flex flex-wrap justify-between gap-x-3">
                <span>Event storage</span>
                <span>{freeSize} MiB free of {capacity.maxBytes / (1024 * 1024)}</span>
              </div>
              <progress className="block h-2 w-full accent-ink" aria-label="Event storage used" max={capacity.maxBytes} value={capacity.usedBytes} />
              <p className="mt-1 text-xs text-ink/70">{capacity.maxPhotos - capacity.usedPhotos} of {capacity.maxPhotos} photo spaces available</p>
              {nearlyFull && <p className="mt-2 rounded-xl bg-sun-soft p-2 text-sm font-bold">{capacity.usedPhotos >= capacity.maxPhotos || capacity.usedBytes >= capacity.maxBytes ? 'This event is full.' : 'This event is nearly full.'} Download the ZIP, then remove any shared photos you have saved to make room.</p>}
            </div>
          )}
          <div className="grid grid-cols-2 divide-x-2 divide-ink/10 border-t-2 border-ink/10 bg-go-soft lg:hidden">
            <button type="button" onClick={() => jumpTo('sr-progress')} className="min-h-12 px-3 font-extrabold text-ink">Team progress ↓</button>
            <button type="button" onClick={() => jumpTo('sr-compare')} className="min-h-12 px-3 font-extrabold text-ink">Compare photos ↓</button>
          </div>
        </div>
        {refreshError && <Notice tone="offline">{refreshError}</Notice>}

        {/* Invite */}
        <div className="sticker-card p-4">
          <h2 className="font-display text-2xl">Invite teams</h2>
          {joinLink ? (
            <>
              <button type="button" onClick={() => setBigQr(true)} className={`relative mt-3 block w-full rounded-2xl border-2 border-ink bg-cream p-3 ${event.closed ? 'opacity-40' : ''}`} aria-label="Show invite QR code full screen">
                <QrImage value={joinLink} label={`QR code to join ${event.title}`} className="mx-auto aspect-square w-full max-w-[240px]" />
              </button>
              <p className="mt-2 text-center text-sm font-semibold text-ink/70">
                {event.closed ? 'Uploads are closed, so new teams can’t join.' : 'Teams scan with their phone camera. Any phone works.'}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void share()} className="btn-3d btn-sun inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-3 text-sm font-extrabold text-ink">
                  <Share2 className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Share invite
                </button>
                <button type="button" onClick={() => void copyText(joinLink, 'Invite link')} className="btn-3d btn-white inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-3 text-sm font-extrabold text-ink">
                  <Copy className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Copy link
                </button>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-bold text-ink/70">View invite link</summary>
                <input aria-label="Team invite link" readOnly value={joinLink} onFocus={e => e.currentTarget.select()} className="mt-2 min-h-11 w-full rounded-xl border-2 border-ink bg-cream px-3 text-sm" />
              </details>
              <button type="button" onClick={() => setBigQr(true)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full text-sm font-extrabold text-ink/70 hover:text-ink">
                <QrCode className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Show big QR for the room
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-ink/70">The invite link isn’t available. Refresh to try again.</p>
          )}
        </div>

        {/* Leader tools */}
        <details className="sr-details flat-card overflow-hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-display text-xl">
            <Settings2 className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> Leader tools
          </summary>
          <div className="flex flex-col gap-4 border-t-2 border-ink/10 p-4">
            <div>
              <h3 className="flex items-center gap-1.5 font-extrabold"><Pencil className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Event settings</h3>
              <p className="mt-1 text-sm font-semibold text-ink/70">{describeTeamNaming(event.teamNaming ?? DEFAULT_TEAM_NAMING)}. New rules apply to teams that join afterwards.</p><p className="mt-1 text-sm font-semibold text-ink/70">Photos: <AutoSendSummary on={event.autoUploadDefault ?? false} />.</p>
              <button type="button" onClick={openEditor} className="btn-3d btn-white mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-ink">
                <Pencil className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Edit name & team names
              </button>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 font-extrabold"><KeyRound className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Leader link</h3>
              <p className="mt-1 text-sm font-semibold text-ink/70">Open this view on a laptop or another phone. <strong className="text-ink">Keep it private:</strong> anyone with it can see every photo and delete the event.</p>
              <button type="button" onClick={() => void copyText(leaderLink, 'Leader link')} className="btn-3d btn-white mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-ink">
                <Copy className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Copy leader link
              </button>
              <input aria-label="Private leader link" readOnly value={leaderLink} onFocus={e => e.currentTarget.select()} className="mt-2 min-h-11 w-full rounded-xl border-2 border-ink bg-cream px-3 text-sm" />
            </div>
            {!event.closed && <div>
              <h3 className="font-extrabold">Uploads</h3>
              <p className="mt-1 text-sm font-semibold text-ink/70">Close when you start reviewing. You can still see and download everything.</p>
              <button type="button" onClick={() => void toggleClosed()} disabled={toggling} className="btn-3d btn-white mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-ink">
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} aria-hidden="true" /> : <Lock className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}
                Close uploads
              </button>
            </div>}
            <DeleteEvent access={access} title={event.title} photoCount={snapshot.photos.length} teamCount={snapshot.teams.length} />
          </div>
        </details>
      </aside>

      <div className="flex min-w-0 flex-col gap-8">
        <LeaderDashboard snapshot={snapshot} pack={pack} now={now} />
        <CompareClues access={access} snapshot={snapshot} pack={pack} onPhotoDeleted={() => void refresh()} />
      </div>

      {editing && (
        <EventSettingsDialog
          access={access}
          event={event}
          pack={pack}
          onClose={closeEditor}
          onSaved={setSnapshot}
          refresh={refresh}
        />
      )}
      {bigQr && joinLink && <BigQr link={joinLink} title={event.title} gameTitle={pack.title} onClose={() => setBigQr(false)} />}
    </div>
  );
}

function BigQr({ link, title, gameTitle, onClose }: { link: string; title: string; gameTitle: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Invite QR code" className="paper-dots fixed inset-0 z-[64] flex flex-col items-center justify-center gap-4 overflow-y-auto p-5 text-center text-ink">
      <button type="button" onClick={onClose} autoFocus aria-label="Close QR code" className="btn-3d btn-white absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-ink">
        <X className="h-5 w-5" strokeWidth={3} />
      </button>
      <p className="text-sm font-extrabold uppercase tracking-wider text-ink/65">Scan to join · {gameTitle}</p>
      <h2 className="font-display text-3xl leading-tight sm:text-5xl">{title}</h2>
      <div className="sticker-card p-3 sm:p-4">
        <QrImage value={link} label={`QR code to join ${title}`} className="aspect-square w-[min(78vw,62vh)]" />
      </div>
      <p className="max-w-md text-sm font-bold text-ink/70">Open your phone camera and point it at the code. One phone per team is enough.</p>
    </div>
  );
}

function DeleteEvent({ access, title, photoCount, teamCount }: { access: EventAccess; title: string; photoCount: number; teamCount: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteReview(access);
      notify.success(`Deleted “${title}”`);
      openReviewHome();
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };
  return (
    <AlertDialog.Root open={open} onOpenChange={next => { if (!busy) { setOpen(next); setError(null); } }}>
      <div>
        <h3 className="font-extrabold">Delete event</h3>
        <p className="mt-1 text-sm font-semibold text-ink/70">Removes the event and every shared photo from the server. Photos stay on each team’s phone.</p>
        <AlertDialog.Trigger className="btn-3d btn-coral mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold text-ink">
          <Trash2 className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Delete event…
        </AlertDialog.Trigger>
      </div>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[75] bg-ink/70" />
        <div className="pointer-events-none fixed inset-0 z-[76] flex items-center justify-center p-4">
          <AlertDialog.Content
            onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}
            className="sticker-card animate-pop-in pointer-events-auto w-full max-w-md p-5 text-ink sm:p-6"
          >
            <AlertDialog.Title className="font-display text-2xl leading-tight">Delete “{title}”?</AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 space-y-2 text-sm font-bold leading-snug">
                <p>This permanently removes the event, its {teamCount} {teamCount === 1 ? 'team' : 'teams'} and all {photoCount} shared {photoCount === 1 ? 'photo' : 'photos'} from the server, for everyone. It can’t be undone.</p>
                <p className="text-ink/70">Every team’s photos stay on their own phones. The invite and leader links will stop working. Download the ZIP first if you want a copy.</p>
              </div>
            </AlertDialog.Description>
            {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" disabled={busy} onClick={() => void remove()} className="btn-3d btn-coral inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-display text-lg tracking-wide text-ink">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" /> : <Trash2 className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />}
                {busy ? 'Deleting…' : 'Delete for everyone'}
              </button>
              <AlertDialog.Cancel disabled={busy} className="btn-3d btn-white min-h-12 flex-1 rounded-2xl px-4 font-extrabold text-ink">Cancel</AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
