import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, ImageOff, Loader2, Maximize2, MessageCircleQuestion, Trash2, X } from 'lucide-react';
import type { GamePack } from '@/types';
import { getCategoryTheme, readableTextOn } from '@/lib/theme';
import { deleteReviewPhoto, type EventAccess, type ReviewPhoto, type ReviewSnapshot, type ReviewTeam } from '@/lib/sharedReview';
import { describeError, downloadBlob, forgetReviewPhoto, loadReviewPhoto, notify, packClues, slug, useReviewPhotoUrl, type Clue } from './common';
import { PathPill } from './ui';

interface CompareProps {
  access: EventAccess;
  snapshot: ReviewSnapshot;
  pack: GamePack;
  /** Leader can remove a photo from the event (e.g. an accidental shot). */
  onPhotoDeleted?: () => void;
}

interface Column { key: string; team?: ReviewTeam; name: string; pathId?: string; photos: ReviewPhoto[] }

/** Teams in join order; photos grouped by challengeId (never by path position). */
function useClueData(snapshot: ReviewSnapshot, packId: string) {
  return useMemo(() => {
    const clues = packClues(packId);
    const byClue = new Map<string, ReviewPhoto[]>();
    for (const photo of snapshot.photos) {
      const list = byClue.get(photo.challengeId) ?? [];
      list.push(photo);
      byClue.set(photo.challengeId, list);
    }
    const teams = [...snapshot.teams].sort((a, b) => a.joinedAt - b.joinedAt);
    const columnsFor = (challengeId: string): Column[] => {
      const photos = (byClue.get(challengeId) ?? []).sort((a, b) => a.capturedAt - b.capturedAt);
      const columns: Column[] = teams.map(team => ({ key: team.id, team, name: team.name, pathId: team.pathId, photos: photos.filter(p => p.teamId === team.id) }));
      // Photos from a team no longer in the list still show, under their baked label.
      const known = new Set(teams.map(t => t.id));
      for (const photo of photos.filter(p => !known.has(p.teamId))) {
        columns.push({ key: `orphan-${photo.id}`, name: photo.teamName || 'Team', pathId: photo.pathId, photos: [photo] });
      }
      return columns;
    };
    return { clues, byClue, columnsFor };
  }, [snapshot, packId]);
}

function photoFilename(clue: Clue, column: Pick<Column, 'name' | 'pathId'>, index = 0) {
  return `${String(clue.challenge.number).padStart(2, '0')}-${slug(clue.challenge.title)}-${slug(column.name)}${column.pathId ? `-path-${column.pathId.toLowerCase()}` : ''}${index ? `-${index + 1}` : ''}.jpg`;
}

export function CompareClues({ access, snapshot, pack, onPhotoDeleted }: CompareProps) {
  const { clues, byClue, columnsFor } = useClueData(snapshot, pack.id);
  const [index, setIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [viewer, setViewer] = useState<{ photoId: string } | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const clue = clues[Math.min(index, clues.length - 1)];
  const columns = clue ? columnsFor(clue.challenge.id) : [];
  const flatPhotos = columns.flatMap(column => column.photos.map((photo, i) => ({ photo, column, i })));

  // Keep the active clue chip in view in the strip.
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  const go = (delta: number) => { setIndex(i => Math.max(0, Math.min(clues.length - 1, i + delta))); setShowPrompt(false); };

  if (!clue) return null;
  const theme = getCategoryTheme(clue.category.id);

  const openViewer = (photoId: string) => setViewer({ photoId });

  return (
    <section aria-labelledby="sr-compare" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="sr-compare" tabIndex={-1} className="scroll-mt-4 font-display text-3xl">Compare by clue</h2>
        <button type="button" onClick={() => setPresenting(true)} className="btn-3d btn-white inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold text-ink">
          <Maximize2 className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Present
        </button>
      </div>

      {/* Clue strip: every clue, with how many photos it has */}
      <div ref={stripRef} className="sr-strip -mx-1 mb-4 flex gap-2.5 overflow-x-auto px-1 pb-2 pt-2.5" role="list" aria-label="Clues">
        {clues.map((item, i) => {
          const count = byClue.get(item.challenge.id)?.length ?? 0;
          const active = i === index;
          const color = getCategoryTheme(item.category.id).main;
          return (
            <button
              key={item.challenge.id}
              role="listitem"
              type="button"
              onClick={() => { setIndex(i); setShowPrompt(false); }}
              aria-current={active ? 'step' : undefined}
              aria-label={`Clue ${item.challenge.number}: ${item.challenge.title}, ${count} ${count === 1 ? 'photo' : 'photos'}`}
              className={`relative flex h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink px-2 font-display text-lg ${active ? 'shadow-[3px_3px_0_0_#2E2459] -translate-y-0.5' : 'opacity-85'}`}
              style={{ backgroundColor: active ? color : '#FFFDF7', color: active ? readableTextOn(color) : '#2E2459' }}
            >
              {item.challenge.number}
              {count > 0 && (
                <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-go px-1 font-body text-[10px] font-black text-ink">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <ClueHeader clue={clue} total={clues.length} showPrompt={showPrompt} onTogglePrompt={() => setShowPrompt(v => !v)} accent={theme.main} soft={theme.soft} />

      {/* Team grid */}
      {columns.length === 0 ? (
        <div className="mt-4 rounded-3xl border-2 border-dashed border-ink/40 bg-cream/70 p-6 text-center">
          <p className="font-display text-2xl">No teams yet</p>
          <p className="mt-1 text-sm font-semibold text-ink/70">Show the invite QR code. Teams appear here as soon as they join.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Team photos for clue ${clue.challenge.number}`}>
          {columns.map(column => (
            <li key={column.key} className="sticker-card flex min-w-0 flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b-2 border-ink/15 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-display text-lg leading-tight">{column.name}</span>
                <PathPill pathId={column.pathId} />
              </div>
              {column.photos.length === 0 ? (
                <div className="m-3 flex aspect-[4/5] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/30 text-center text-ink/55">
                  <ImageOff className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
                  <p className="mt-2 text-sm font-extrabold">No photo yet</p>
                </div>
              ) : (
                <div className={`grid gap-2 p-3 ${column.photos.length > 1 ? 'grid-cols-2' : ''}`}>
                  {column.photos.map(photo => (
                    <PhotoTile key={photo.id} access={access} photo={photo} label={`${column.name}, clue ${clue.challenge.number}`} onOpen={() => openViewer(photo.id)} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Prev / next clue */}
      <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Clue navigation">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="btn-3d btn-white inline-flex min-h-12 items-center gap-1 rounded-2xl px-4 font-extrabold text-ink">
          <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> Previous
        </button>
        <span className="text-sm font-extrabold text-ink/70">{clue.challenge.number} / {clues.length}</span>
        <button type="button" onClick={() => go(1)} disabled={index === clues.length - 1} className="btn-3d btn-go inline-flex min-h-12 items-center gap-1 rounded-2xl px-4 font-display text-lg tracking-wide text-ink">
          Next clue <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
      </nav>

      {presenting && (
        <Presentation
          access={access}
          clue={clue}
          columns={columns}
          position={index}
          total={clues.length}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onOpen={openViewer}
          onClose={() => setPresenting(false)}
        />
      )}

      {viewer && (
        <PhotoViewer
          access={access}
          clue={clue}
          items={flatPhotos}
          photoId={viewer.photoId}
          onChange={photoId => setViewer({ photoId })}
          onClose={() => setViewer(null)}
          canDelete={snapshot.role === 'leader'}
          onDeleted={() => { setViewer(null); onPhotoDeleted?.(); }}
        />
      )}
    </section>
  );
}

function ClueHeader({ clue, total, showPrompt, onTogglePrompt, accent, soft, dark }: { clue: Clue; total: number; showPrompt: boolean; onTogglePrompt: () => void; accent: string; soft: string; dark?: boolean }) {
  const { challenge } = clue;
  const passage = challenge.scriptureClue;
  const scripture = passage?.reference ?? challenge.scripture;
  const showRef = scripture && scripture.trim().toLowerCase() !== challenge.title.trim().toLowerCase();
  return (
    <div className={`rounded-3xl border-2 border-ink p-4 sm:p-5 ${dark ? '' : 'shadow-[4px_4px_0_0_#2E2459]'}`} style={{ backgroundColor: soft }}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-14 w-14 flex-shrink-0 -rotate-3 items-center justify-center rounded-2xl border-2 border-ink font-display text-3xl shadow-[3px_3px_0_0_#2E2459]"
          style={{ backgroundColor: accent, color: readableTextOn(accent) }}
          aria-hidden="true"
        >
          {challenge.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink/65">Clue {challenge.number} of {total} · {clue.category.title}</p>
          <h3 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{challenge.title}</h3>
          {showRef && <p className="mt-0.5 font-extrabold text-ink/75">{scripture}</p>}
        </div>
      </div>
      {passage?.excerpt && (
        <blockquote className="mt-3 border-l-4 border-ink/30 pl-3 font-semibold italic leading-snug text-ink/85">
          “{passage.excerpt}” <span className="not-italic text-ink/65">— {passage.reference}</span>
        </blockquote>
      )}
      {challenge.photoTarget && <p className="mt-3 text-sm font-semibold text-ink/75"><span className="font-extrabold">Teams looked for:</span> {challenge.photoTarget}</p>}
      <div className="mt-3">
        <button type="button" onClick={onTogglePrompt} aria-expanded={showPrompt} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3 text-sm font-extrabold text-ink">
          {showPrompt ? <EyeOff className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> : <Eye className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}
          {showPrompt ? 'Hide discussion question' : 'Show discussion question'}
        </button>
        {showPrompt && (
          <p className="mt-2 flex gap-2 rounded-2xl bg-cream p-3 font-semibold leading-snug text-ink">
            <MessageCircleQuestion className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {challenge.gospelConnection}
          </p>
        )}
      </div>
    </div>
  );
}

function PhotoTile({ access, photo, label, onOpen, dark }: { access: EventAccess; photo: ReviewPhoto; label: string; onOpen: () => void; dark?: boolean }) {
  const { url, failed, retry } = useReviewPhotoUrl(access, photo.id);
  if (failed) {
    return (
      <button type="button" onClick={retry} className="flex aspect-[4/5] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/40 text-sm font-extrabold">
        Couldn’t load · Retry
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${label} full screen`}
      className={`group relative block w-full min-w-0 overflow-hidden rounded-2xl ${dark ? 'h-full' : 'paper-dots aspect-[4/5]'}`}
    >
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]" />
      ) : (
        <span className="flex h-full w-full items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${dark ? 'text-cream/60' : 'text-ink/40'}`} strokeWidth={3} aria-label="Loading photo" /></span>
      )}
    </button>
  );
}

// ── Presentation: the whole clue on a dark stage, for a laptop or TV ─────────

function Presentation({ access, clue, columns, position, total, onPrev, onNext, onOpen, onClose }: {
  access: EventAccess; clue: Clue; columns: Column[]; position: number; total: number;
  onPrev: () => void; onNext: () => void; onOpen: (photoId: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const theme = getCategoryTheme(clue.category.id);
  const withPhotos = columns.filter(c => c.photos.length);
  const missing = columns.filter(c => !c.photos.length);
  const count = withPhotos.length;
  // One row for up to three teams on wide screens; phones cap at two columns.
  const cols = count <= 3 ? Math.max(1, count) : count <= 4 ? 2 : count <= 6 ? 3 : 4;

  useEffect(() => {
    closeRef.current?.focus();
    document.documentElement.requestFullscreen?.().catch(() => { /* not available (iPhone Safari); the overlay still fills the screen */ });
    return () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-sr-viewer]')) return; // the photo viewer handles keys
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { onNext(); setShowPrompt(false); }
      else if (e.key === 'ArrowLeft') { onPrev(); setShowPrompt(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Presenting clue ${clue.challenge.number}`} className="sr-stage fixed inset-0 z-[62] flex flex-col text-cream">
      <div className="safe-top flex flex-shrink-0 items-start gap-3 px-3 pt-3 sm:px-6 sm:pt-5">
        <span className="flex h-12 w-12 flex-shrink-0 -rotate-3 items-center justify-center rounded-2xl border-2 border-cream font-display text-2xl" style={{ backgroundColor: theme.main, color: readableTextOn(theme.main) }}>
          {clue.challenge.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cream/60">Clue {clue.challenge.number} of {total}</p>
          <h2 className="font-display text-2xl leading-tight sm:text-4xl">{clue.challenge.title}</h2>
          {clue.challenge.scriptureClue?.excerpt && <p className="mt-1 line-clamp-2 text-sm font-semibold italic text-cream/80 sm:text-base">“{clue.challenge.scriptureClue.excerpt}”</p>}
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Exit presentation" className="btn-3d btn-white flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink">
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>

      <div className="min-h-0 flex-1 px-3 py-3 sm:px-6">
        {count === 0 ? (
          <div className="flex h-full items-center justify-center text-center font-display text-2xl text-cream/70">No photos for this clue yet</div>
        ) : (
          <ul className="sr-present-grid grid h-full gap-3 sm:gap-4" style={{ ['--cols' as string]: cols, ['--cols-sm' as string]: Math.min(cols, 2) }}>
            {withPhotos.map(column => (
              <li key={column.key} className="flex min-h-0 min-w-0 flex-col">
                <div className="min-h-0 flex-1">
                  <PhotoTile access={access} photo={column.photos[column.photos.length - 1]} label={`${column.name}, clue ${clue.challenge.number}`} onOpen={() => onOpen(column.photos[column.photos.length - 1].id)} dark />
                </div>
                <p className="mt-1.5 flex items-center justify-center gap-2 truncate text-center text-sm font-extrabold sm:text-base">
                  <span className="truncate">{column.name}</span>
                  <PathPill pathId={column.pathId} />
                  {column.photos.length > 1 && <span className="text-cream/60">+{column.photos.length - 1}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
        <button type="button" onClick={() => { onPrev(); setShowPrompt(false); }} disabled={position === 0} className="sr-stage-btn inline-flex" aria-label="Previous clue">
          <ChevronLeft className="h-6 w-6" strokeWidth={3} aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          {showPrompt ? (
            <p className="max-w-3xl text-sm font-bold leading-snug text-cream sm:text-lg">{clue.challenge.gospelConnection}</p>
          ) : missing.length > 0 && (
            <p className="truncate text-xs font-bold text-cream/55">Still to share: {missing.map(c => c.name).join(', ')}</p>
          )}
          <button type="button" onClick={() => setShowPrompt(v => !v)} aria-expanded={showPrompt} className="min-h-10 rounded-full px-3 text-sm font-extrabold text-cream/80 underline-offset-4 hover:text-cream hover:underline">
            {showPrompt ? 'Hide question' : 'Discussion question'}
          </button>
        </div>
        <button type="button" onClick={() => { onNext(); setShowPrompt(false); }} disabled={position === total - 1} className="sr-stage-btn sr-stage-btn--go inline-flex" aria-label="Next clue">
          <span className="hidden sm:inline">Next clue</span><ChevronRight className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Full-screen single photo ────────────────────────────────────────────────

function PhotoViewer({ access, clue, items, photoId, onChange, onClose, canDelete, onDeleted }: {
  access: EventAccess; clue: Clue; items: { photo: ReviewPhoto; column: Column; i: number }[]; photoId: string;
  onChange: (photoId: string) => void; onClose: () => void; canDelete: boolean; onDeleted: () => void;
}) {
  const position = Math.max(0, items.findIndex(item => item.photo.id === photoId));
  const current = items[position];
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (confirming) setConfirming(false); else onClose(); }
      else if (e.key === 'ArrowRight' && position < items.length - 1) onChange(items[position + 1].photo.id);
      else if (e.key === 'ArrowLeft' && position > 0) onChange(items[position - 1].photo.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, items, onChange, onClose, position]);

  if (!current) return null;

  const download = async () => {
    try {
      downloadBlob(await loadReviewPhoto(access, current.photo.id), photoFilename(clue, current.column, current.i));
    } catch (error) { notify.error(describeError(error)); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await deleteReviewPhoto(access, current.photo.id);
      forgetReviewPhoto(access.eventId, current.photo.id);
      notify.success('Photo removed from the event');
      onDeleted();
    } catch (error) {
      notify.error(describeError(error));
      setBusy(false);
    }
  };

  return (
    <div
      data-sr-viewer
      role="dialog"
      aria-modal="true"
      aria-label={`${current.column.name}, clue ${clue.challenge.number}: ${clue.challenge.title}`}
      className="sr-stage fixed inset-0 z-[66] flex flex-col text-cream"
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        const start = touch.current; touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - start.y)) {
          const next = position + (dx < 0 ? 1 : -1);
          if (next >= 0 && next < items.length) onChange(items[next].photo.id);
        }
      }}
    >
      <div className="safe-top flex-shrink-0">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 pt-3 sm:px-5">
          <span className="flex-shrink-0 rounded-full border-2 border-ink bg-sun px-3 py-1 font-display text-lg leading-none text-ink">{position + 1}<span className="text-ink/60"> / {items.length}</span></span>
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-extrabold">
            <span className="truncate">{current.column.name}</span>
            <PathPill pathId={current.column.pathId} />
            <span className="hidden truncate text-cream/65 sm:inline">· Clue {clue.challenge.number}</span>
          </p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close photo" className="btn-3d btn-white flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink">
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:px-24">
        <ViewerImage key={current.photo.id} access={access} photo={current.photo} alt={`${current.column.name}’s photo for clue ${clue.challenge.number}`} />
        <button type="button" onClick={() => onChange(items[position - 1].photo.id)} disabled={position === 0} aria-label="Previous team" className="sr-stage-round absolute left-5 top-1/2 hidden -translate-y-1/2 sm:flex">
          <ChevronLeft className="h-7 w-7" strokeWidth={3} />
        </button>
        <button type="button" onClick={() => onChange(items[position + 1].photo.id)} disabled={position === items.length - 1} aria-label="Next team" className="sr-stage-round absolute right-5 top-1/2 hidden -translate-y-1/2 sm:flex">
          <ChevronRight className="h-7 w-7" strokeWidth={3} />
        </button>
      </div>

      <div className="flex-shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
        {confirming ? (
          <div className="mx-auto flex max-w-md flex-col gap-2 rounded-2xl border-2 border-cream/30 bg-cream/10 p-3" role="alertdialog" aria-label="Remove this photo from the event?">
            <p className="text-sm font-bold">Remove this photo from the event for everyone? It stays on the team’s phone.</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => void remove()} className="btn-3d btn-coral inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl font-extrabold text-ink">
                {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} aria-hidden="true" />} Remove
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="btn-3d btn-white min-h-11 flex-1 rounded-2xl font-extrabold text-ink">Keep</button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-between gap-2">
            <button type="button" onClick={() => onChange(items[position - 1].photo.id)} disabled={position === 0} aria-label="Previous team" className="sr-stage-round flex sm:invisible">
              <ChevronLeft className="h-6 w-6" strokeWidth={3} />
            </button>
            <div className="flex flex-1 justify-center gap-2">
              <button type="button" onClick={() => void download()} className="btn-3d btn-white inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-4 font-extrabold text-ink">
                <Download className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /> Download
              </button>
              {canDelete && (
                <button type="button" onClick={() => setConfirming(true)} aria-label="Remove photo from event" className="btn-3d btn-coral flex h-12 w-12 items-center justify-center rounded-2xl text-ink">
                  <Trash2 className="h-5 w-5" strokeWidth={2.75} />
                </button>
              )}
            </div>
            <button type="button" onClick={() => onChange(items[position + 1].photo.id)} disabled={position === items.length - 1} aria-label="Next team" className="sr-stage-round flex sm:invisible">
              <ChevronRight className="h-6 w-6" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewerImage({ access, photo, alt }: { access: EventAccess; photo: ReviewPhoto; alt: string }) {
  const { url, failed, retry } = useReviewPhotoUrl(access, photo.id);
  if (failed) return <button type="button" onClick={retry} className="rounded-2xl border-2 border-cream/40 px-4 py-3 font-extrabold">Couldn’t load the photo · Retry</button>;
  if (!url) return <Loader2 className="h-8 w-8 animate-spin text-cream/60" strokeWidth={3} aria-label="Loading photo" />;
  return <img src={url} alt={alt} draggable={false} className="animate-pop-in max-h-full max-w-full select-none rounded-xl object-contain shadow-[0_0_0_2px_rgba(253,246,236,0.85),6px_6px_0_2px_rgba(0,0,0,0.4)]" />;
}
