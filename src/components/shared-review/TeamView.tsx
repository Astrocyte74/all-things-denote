import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, CloudUpload, Loader2, Lock, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { eventHuntId, makeEventHunt } from '@/lib/eventHunt';
import { getPackById } from '@/data/packs';
import { LocalPhotoImage } from '@/components/LocalPhotoImage';
import { photoFailureScope } from '@/lib/photoUploadFailure';
import { getPhotoSummaries, getStoredPhoto, type PhotoSummary } from '@/lib/photoStorage';
import { deleteReviewPhoto, uploadReviewPhoto, type EventAccess, type ReviewPhoto, type ReviewSnapshot } from '@/lib/sharedReview';
import { describeError, errorStatus, forgetReviewPhoto, formatExpiry, notify } from './common';
import { Notice, PackBadge, PathPill } from './ui';
import { DeleteUploadsDialog, TeamUploads } from './TeamUploads';

import { PhotoAutoSendControl } from './PhotoAutoSendControl';
import { PHOTO_SYNC_SENT, cancelPhotoUpload } from '@/lib/photoSyncStore';
import { pausePhotoSync } from '@/lib/photoSync';

type Status = { state: 'queued' } | { state: 'uploading'; percent: number } | { state: 'error'; message: string };

interface TeamViewProps {
  access: EventAccess;
  snapshot: ReviewSnapshot;
  refresh: () => Promise<void>;
  onPlay: () => void;
}

/** Keep explicit opt-outs so new photos are selected on the next visit. The old
 * list stored inclusions only; preserve its choices for photos already here. */
function readExclusions(huntId: string, eventId: string, local: PhotoSummary[]): Set<string> {
  try {
    const key = `reviewExcluded:${huntId}`;
    const saved = sessionStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
    const legacy = sessionStorage.getItem(`reviewSelection:${eventId}`);
    if (legacy) {
      const included = new Set<string>(JSON.parse(legacy));
      const excluded = local.filter(photo => !included.has(photo.id)).map(photo => photo.id);
      try { sessionStorage.setItem(key, JSON.stringify(excluded)); } catch { /* Keep this session's choices in memory. */ }
      return new Set(excluded);
    }
  } catch { /* No valid saved choices. */ }
  return new Set();
}

export function TeamView({ access, snapshot, refresh, onPlay }: TeamViewProps) {
  const { event, team } = snapshot;
  const pack = getPackById(event.packId);
  const hunt = useMemo(() => makeEventHunt(access, snapshot), [access, snapshot]);
  const huntId = eventHuntId(event.id, team!.id);
  const [local, setLocal] = useState<PhotoSummary[] | null>(null);
  const [localError, setLocalError] = useState(false);
  const [excluded, setExcludedState] = useState<Set<string>>(new Set());
  const choicesLoaded = useRef(false);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [sentNow, setSentNow] = useState<Record<string, ReviewPhoto>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [serverPhotos, setServerPhotos] = useState(snapshot.photos);
  // A fresh server snapshot replaces optimistic changes, including photos the
  // leader removed while this team stayed on the upload screen.
  if (serverPhotos !== snapshot.photos) {
    setServerPhotos(snapshot.photos);
    setSentNow({});
    setRemoved(new Set());
  }
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; failed: number; stopped?: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ReviewPhoto[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const busy = running || deleting;
  useEffect(() => busy ? pausePhotoSync() : undefined, [busy]);
  useEffect(() => {
    const sent = (e: Event) => { if ((e as CustomEvent).detail?.huntId === eventHuntId(event.id, team!.id)) void refresh(); };
    window.addEventListener(PHOTO_SYNC_SENT, sent);
    return () => window.removeEventListener(PHOTO_SYNC_SENT, sent);
  }, [refresh, event.id, team]);

  const [localAttempt, setLocalAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getPhotoSummaries(event.packId)
      .then(photos => {
        if (cancelled) return;
        const scoped = photos.filter(photo => !photo.huntId || photo.huntId === huntId)
          .sort((a, b) => a.challengeNumber - b.challengeNumber || a.timestamp - b.timestamp);
        if (!choicesLoaded.current) {
          setExcludedState(readExclusions(huntId, event.id, scoped));
          choicesLoaded.current = true;
        }
        setLocal(scoped);
        setLocalError(false);
      })
      .catch(() => { if (!cancelled) setLocalError(true); });
    return () => { cancelled = true; };
  }, [event.packId, event.id, huntId, team, localAttempt]);
  const loadLocal = () => setLocalAttempt(n => n + 1);

  // localPhotoId → server copy (from the snapshot, plus anything sent this visit).
  const uploaded = useMemo(() => {
    const map = new Map<string, ReviewPhoto>();
    for (const photo of snapshot.photos) if (!team || photo.teamId === team.id) map.set(photo.localPhotoId, photo);
    for (const [id, photo] of Object.entries(sentNow)) map.set(id, photo);
    for (const id of removed) map.delete(id);
    return map;
  }, [snapshot.photos, team, sentNow, removed]);

  const pending = (local ?? []).filter(photo => !uploaded.has(photo.id));
  const toSend = pending.filter(photo => !excluded.has(photo.id));

  const setExcluded = (next: Set<string>) => {
    setExcludedState(next);
    try { sessionStorage.setItem(`reviewExcluded:${huntId}`, JSON.stringify([...next])); } catch { /* in-memory selection still works */ }
  };
  const toggle = (id: string) => {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExcluded(next);
  };
  const selectPending = (select: boolean) => {
    const next = new Set(excluded);
    for (const photo of pending) {
      if (select) next.delete(photo.id); else next.add(photo.id);
    }
    setExcluded(next);
  };

  // Warn before leaving mid-upload.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const upload = async () => {
    if (busy || !toSend.length) return;
    setRunning(true);
    setSummary(null);
    const queue = [...toSend];
    setStatus(prev => ({ ...prev, ...Object.fromEntries(queue.map(p => [p.id, { state: 'queued' } as Status])) }));
    let ok = 0;
    let failed = 0;
    let stopped: string | undefined;
    const nextExcluded = new Set(excluded);
    for (const [index, photo] of queue.entries()) {
      setStatus(prev => ({ ...prev, [photo.id]: { state: 'uploading', percent: 0 } }));
      try {
        const original = await getStoredPhoto(photo.id);
        const result = await uploadReviewPhoto(access, original, percent => setStatus(prev => ({ ...prev, [photo.id]: { state: 'uploading', percent } })));
        await cancelPhotoUpload(eventHuntId(event.id, team!.id), photo.id);
        ok += 1;
        nextExcluded.add(photo.id);
        setSentNow(prev => ({ ...prev, [photo.id]: result }));
        setRemoved(prev => { if (!prev.has(photo.id)) return prev; const next = new Set(prev); next.delete(photo.id); return next; });
        setStatus(prev => { const next = { ...prev }; delete next[photo.id]; return next; });
      } catch (error) {
        failed += 1;
        const message = describeError(error);
        setStatus(prev => ({ ...prev, [photo.id]: { state: 'error', message } }));
        if (photoFailureScope(error) !== 'photo') {
          stopped = message;
          // Anything not attempted goes back to "selected", ready for Retry.
          setStatus(prev => {
            const next = { ...prev };
            for (const rest of queue.slice(index + 1)) delete next[rest.id];
            return next;
          });
          break;
        }
      }
    }
    setExcluded(nextExcluded);
    setSummary({ ok, failed, stopped });
    setRunning(false);
    // The sticky bar announces the result (aria-live); no toast over the controls.
    void refresh().catch(() => { /* status already reflects each confirmed upload */ });
  };

  const askRemove = (photos: ReviewPhoto[]) => { setDeleteError(null); setConfirmRemove(photos); };
  const removeUploaded = async () => {
    if (!confirmRemove || busy) return;
    setDeleting(true);
    setDeleteError(null);
    let deleted = 0;
    const nextExcluded = new Set(excluded);
    try {
      for (const remote of confirmRemove) {
        await cancelPhotoUpload(eventHuntId(event.id, team!.id), remote.localPhotoId);
        try { await deleteReviewPhoto(access, remote.id); }
        catch (error) { if (errorStatus(error) !== 404) throw error; }
        deleted += 1;
        const localId = remote.localPhotoId;
        forgetReviewPhoto(event.id, remote.id);
        setRemoved(prev => new Set(prev).add(localId));
        setSentNow(prev => { const next = { ...prev }; delete next[localId]; return next; });
        setStatus(prev => { const next = { ...prev }; delete next[localId]; return next; });
        nextExcluded.add(localId);
        setExcluded(new Set(nextExcluded));
      }
      setConfirmRemove(null);
      notify.success(`Deleted ${deleted} cloud ${deleted === 1 ? 'photo' : 'photos'}. Device originals are unchanged.`);
    } catch (error) {
      setDeleteError(`${deleted ? `${deleted} deleted. ` : ''}${describeError(error)} Retry to delete the remaining cloud copies.`);
    } finally {
      setSummary(null);
      await refresh();
      setDeleting(false);
    }
  };

  const uploadedCount = uploaded.size;

  return (
    <div className="mx-auto max-w-4xl pb-28">
      {/* Event + team header */}
      <div className="sticker-card mb-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-ink p-4 sm:p-5" style={{ backgroundColor: pack.library.soft }}>
          <PackBadge pack={pack} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink/70">{pack.title} · ends {formatExpiry(event.expiresAt)}</p>
            <h1 className="break-words font-display text-2xl leading-tight sm:text-3xl">{event.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm font-bold text-ink/70">Sending as</span>
            <span className="truncate font-display text-xl">{team?.name ?? 'Your team'}</span>
            <PathPill pathId={team?.pathId ?? pack.paths[0].id} />
          </div>
          <span className="ml-auto text-sm font-extrabold text-ink/70">{uploadedCount} sent</span>
        </div>
      </div>

      <section className="sticker-card mb-5 flex flex-col gap-3 bg-go/10 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Your event hunt">
        <div><h2 className="font-display text-2xl">Your hunt is ready</h2><p className="mt-1 text-sm font-semibold text-ink/75">{pack.title} · {team?.name} · Path {team?.pathId ?? pack.paths[0].id}. Everything is set. Manage photo sharing below, or send selected photos yourself.</p></div>
        <button type="button" disabled={busy} onClick={onPlay} className="btn-3d btn-go inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl text-ink"><Play className="h-5 w-5" aria-hidden="true" /> Open team hunt</button>
      </section>

      {hunt && <div className="mb-5"><PhotoAutoSendControl hunt={hunt} /></div>}

      {event.closed && (
        <div className="mb-5">
          <Notice tone="warn"><span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" strokeWidth={3} aria-hidden="true" />The leader closed uploads. They can still see the photos you already sent.</span></Notice>
        </div>
      )}

      <TeamUploads access={access} photos={[...uploaded.values()]} busy={busy} onRemove={askRemove} refresh={refresh} />
      <DeleteUploadsDialog photos={confirmRemove} busy={deleting} error={deleteError} onClose={() => setConfirmRemove(null)} onDelete={() => void removeUploaded()} />

      <h2 className="font-display text-2xl">Choose photos to send</h2>
      <p className="mt-1 text-sm font-semibold text-ink/70">
        New unsent photos start selected. Tap one to leave it out of this send. Your leader sees the photos you send under “{team?.name ?? 'your team'}”. Use Save in the gallery to keep a copy after the hunt.
      </p>

      {localError ? (
        <div className="mt-4"><Notice tone="error" action={<button type="button" onClick={loadLocal} className="min-h-11 px-2 font-extrabold underline">Retry</button>}>Couldn’t read the photos saved on this phone.</Notice></div>
      ) : local === null ? (
        <p role="status" className="py-10 text-center font-bold text-ink/60">Loading your photos…</p>
      ) : local.length === 0 ? (
        <div className="mt-5 rounded-3xl border-2 border-dashed border-ink/40 bg-cream/70 p-6 text-center">
          <p className="font-display text-2xl">No {pack.title} photos on this phone yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-ink/70">Open your team hunt above. Use Back to event from the hunt to send your discoveries.</p>

        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || !pending.length} onClick={() => selectPending(true)} className="btn-3d btn-white min-h-10 rounded-full px-4 text-sm font-extrabold text-ink">Select all</button>
            <button type="button" disabled={busy || !toSend.length} onClick={() => selectPending(false)} className="btn-3d btn-white min-h-10 rounded-full px-4 text-sm font-extrabold text-ink">Clear</button>
            <button type="button" onClick={onPlay} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-ink/70 underline-offset-4 hover:underline">
              <Play className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Keep playing
            </button>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Your photos">
            {local.map(photo => {
              const remote = uploaded.get(photo.id);
              const state = status[photo.id];
              const isSelected = !remote && !excluded.has(photo.id);
              return (
                <li key={photo.id} className="relative">
                  <button
                    type="button"
                    disabled={Boolean(remote) || busy || event.closed}
                    onClick={() => toggle(photo.id)}
                    aria-pressed={remote ? undefined : isSelected}
                    aria-label={`#${photo.challengeNumber} ${photo.challengeTitle}${remote ? ', sent' : isSelected ? ', selected' : ''}`}
                    className={`sr-pick block w-full overflow-hidden rounded-2xl border-2 border-ink bg-cream text-left ${isSelected ? 'sr-pick--on' : ''} ${remote ? 'sr-pick--sent' : ''}`}
                  >
                    <span className="paper-dots block aspect-[4/5] p-2">
                      <LocalPhotoImage photoId={photo.id} alt="" loading="lazy" className="h-full w-full object-contain" />
                    </span>
                    <span className="block border-t-2 border-ink/15 px-2.5 py-2 text-xs font-extrabold leading-tight">
                      #{photo.challengeNumber} {photo.challengeTitle}
                    </span>
                    {/* Status corner */}
                    <span aria-hidden="true" className="absolute right-2 top-2">
                      {remote ? (
                        <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-go px-2 py-0.5 text-[0.7rem] font-extrabold"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />Sent</span>
                      ) : state?.state === 'uploading' || state?.state === 'queued' ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-sun"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} /></span>
                      ) : (
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink ${isSelected ? 'bg-go' : 'bg-white/90'}`}>{isSelected && <Check className="h-4 w-4" strokeWidth={4} />}</span>
                      )}
                    </span>
                  </button>
                  {state?.state === 'uploading' && (
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-cream" role="progressbar" aria-label={`Uploading #${photo.challengeNumber}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.percent}>
                      <div className="progress-stripes h-full bg-sun transition-[width]" style={{ width: `${Math.max(state.percent, 4)}%` }} />
                    </div>
                  )}
                  {state?.state === 'queued' && <p className="mt-1 text-xs font-bold text-ink/60">Waiting…</p>}
                  {!remote && state?.state === 'error' && <p role="alert" className="mt-1 text-xs font-bold leading-snug text-ink"><span className="mr-1 inline-block rounded bg-coral-soft px-1">Not sent</span>{state.message}</p>}
                  {remote && (
                    <button type="button" disabled={busy} onClick={() => askRemove([remote])} className="mt-1 min-h-11 px-1 text-xs font-extrabold text-ink/70 underline underline-offset-2">Delete cloud copy</button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Sticky upload bar */}
      {local && local.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 text-sm font-bold" aria-live="polite">
              {running ? `Sending ${toSend.length} ${toSend.length === 1 ? 'photo' : 'photos'}… keep this page open.`
                : !pending.length ? summary && !summary.failed ? `All ${summary.ok} sent. The leader can see them now.` : 'Everything on this phone has been sent.'
                : summary?.stopped ? <span>{summary.ok > 0 && `${summary.ok} sent. `}{summary.stopped}</span>
                : summary && summary.failed ? `${summary.ok} sent, ${summary.failed} not sent. Retry the rest.`
                : `${toSend.length} of ${pending.length} unsent ${pending.length === 1 ? 'photo' : 'photos'} selected`}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void refresh()} disabled={busy} aria-label="Refresh sent status" className="btn-3d btn-white flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-ink">
                <RefreshCw className="h-5 w-5" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                onClick={() => void upload()}
                disabled={busy || !toSend.length || event.closed}
                className="btn-3d btn-go inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 font-display text-lg tracking-wide text-ink sm:flex-none"
              >
                {running ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />
                  : summary && (summary.failed || summary.stopped) && toSend.length ? <RotateCcw className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                  : <CloudUpload className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />}
                {running ? 'Sending…'
                  : summary && (summary.failed || summary.stopped) && toSend.length ? `Retry ${toSend.length}`
                  : `Send ${toSend.length || ''} ${toSend.length === 1 ? 'photo' : 'photos'}`.replace('  ', ' ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
