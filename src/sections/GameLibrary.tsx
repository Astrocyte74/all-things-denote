import { useState } from 'react';
import { ArrowRight, CalendarDays, Camera, ChevronDown, Crown, MapPin, Play, QrCode, RotateCcw, Route, Smartphone, Trophy } from 'lucide-react';
import { getSavedReviews, reviewConfigured } from '@/lib/sharedReview';
import type { GamePack } from '@/types';
import './GameLibrary.css';

export interface GameSummary {
  completed: number;
  total: number;
  started: boolean;
  pathId?: string;
  /** Optional team name saved for this game. */
  teamName?: string;
  /** True when photos or other saved data exist even without progress. */
  hasSavedData?: boolean;
}

interface GameLibraryProps {
  packs: GamePack[];
  summaries: Record<string, GameSummary>;
  /** Open the game's detail / setup screen. */
  onSelect: (id: string) => void;
  /** Jump back into the saved hunt (or its results when finished). */
  onResume: (id: string) => void;
  /** Open the reset dialog for this game. */
  onReset: (id: string) => void;
  /**
   * Opens Group events. `'join'` / `'create'` emphasise that flow; no intent
   * opens the events home (saved events first). When omitted, the library
   * falls back to the plain game picker.
   */
  onOpenSharedReview?: (intent?: 'create' | 'join') => void;
}

/**
 * Event-first landing. Group events (Join / Start) lead; every registered
 * pack still renders as a card under a secondary "Play on this device"
 * disclosure, which opens on its own when a hunt is saved here.
 *
 * Each card is an <article> holding sibling buttons (never nested): a
 * "stretched" title button whose ::after covers the whole card (opens
 * details), plus Continue / View results and Reset buttons layered above it.
 */
export function GameLibrary({ packs, summaries, onSelect, onResume, onReset, onOpenSharedReview }: GameLibraryProps) {
  const eventsFirst = Boolean(onOpenSharedReview);
  const savedHunts = packs.filter(pack => summaries[pack.id]?.started || summaries[pack.id]?.hasSavedData).length;
  // `null` until the user toggles, so late-arriving summaries can still auto-open it.
  const [deviceChoice, setDeviceChoice] = useState<boolean | null>(null);
  const deviceOpen = !eventsFirst || (deviceChoice ?? (savedHunts > 0 || !reviewConfigured));
  const [savedEvents] = useState(() => {
    try { return getSavedReviews().length; } catch { return 0; }
  });

  const openEvents = (intent?: 'create' | 'join') => onOpenSharedReview?.(intent);

  const grid = (
    <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 md:gap-7" role="list">
      {packs.map((pack, index) => (
        <li
          key={pack.id}
          className="animate-rise-in"
          style={{ animationDelay: `${(eventsFirst ? 0 : 80) + index * 70}ms` }}
        >
          <GameCard
            pack={pack}
            index={index}
            summary={summaries[pack.id]}
            onSelect={onSelect}
            onResume={onResume}
            onReset={onReset}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section className="paper-dots min-h-[100svh] px-4 pb-12 pt-8 md:px-8 md:pt-12" aria-labelledby="game-library-title">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 text-center md:mb-9">
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.14em] text-ink/60">
            {eventsFirst ? 'Photo scavenger hunts' : `${packs.length} photo ${packs.length === 1 ? 'game' : 'games'}`}
          </p>
          <h1
            id="game-library-title"
            tabIndex={-1}
            className="text-sticker-sun animate-pop-in text-[2.4rem] leading-[1.05] sm:text-5xl md:text-6xl"
          >
            {eventsFirst ? 'Hunt together' : 'Choose your adventure'}
          </h1>
          {!eventsFirst && <p className="mx-auto mt-3 max-w-lg text-base font-medium text-ink/75 md:text-lg">
            Pick a game for your group. Each one saves its own progress.
          </p>}
        </header>

        {eventsFirst && (
          <section aria-labelledby="gl-events-title" className="mb-8 md:mb-10">
            <h2 id="gl-events-title" className="sr-only">Group events</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-7">
              <EventCard
                tone="join"
                title="Join an event"
                body="Teams scan their leader’s QR code or open an invite link."
                onClick={() => openEvents('join')}
              />
              <EventCard
                tone="create"
                title="Start an event"
                body="Leaders choose a game and invite their teams."
                onClick={() => openEvents('create')}
              />
            </div>

            <button
              type="button"
              onClick={() => openEvents()}
              className="gl-events-link animate-rise-in mt-4 flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-4 py-2.5 text-left"
              style={{ animationDelay: '210ms' }}
            >
              <CalendarDays className="h-6 w-6 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl leading-tight tracking-wide text-ink">Your events</span>
                <span className="block text-sm font-semibold text-ink/70">
                  {savedEvents > 0
                    ? `${savedEvents} saved on this device`
                    : 'Events you start or join show up here'}
                </span>
              </span>
              <ArrowRight className="gl-events-arrow h-5 w-5 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
            </button>
          </section>
        )}

        {eventsFirst ? (
          <section aria-labelledby="gl-device-title" className="animate-rise-in" style={{ animationDelay: '260ms' }}>
            <h2 id="gl-device-title" className="m-0">
              <button
                type="button"
                className="gl-device flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-ink/45 px-4 py-3 text-left"
                aria-expanded={deviceOpen}
                aria-controls="gl-device-games"
                onClick={() => setDeviceChoice(!deviceOpen)}
              >
                <span aria-hidden="true" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
                  <Smartphone className="h-5 w-5 text-ink" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl leading-tight tracking-wide text-ink">Play on this device</span>
                  <span className="block text-sm font-semibold text-ink/70">
                    Solo or offline, no event needed
                    {savedHunts > 0 && ` · ${savedHunts} ${savedHunts === 1 ? 'hunt' : 'hunts'} saved`}
                  </span>
                </span>
                <span aria-hidden="true" className="hidden flex-shrink-0 -space-x-2 sm:flex">
                  {packs.slice(0, 4).map(pack => (
                    <span
                      key={pack.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink text-base leading-none"
                      style={{ backgroundColor: pack.library.color }}
                    >
                      {pack.mascotEmoji || <span className="font-display text-sm text-ink">{pack.title.trim().charAt(0)}</span>}
                    </span>
                  ))}
                </span>
                <ChevronDown
                  className={`h-6 w-6 flex-shrink-0 text-ink transition-transform duration-200 ${deviceOpen ? 'rotate-180' : ''}`}
                  strokeWidth={3}
                  aria-hidden="true"
                />
              </button>
            </h2>
            <div id="gl-device-games" hidden={!deviceOpen} className="pt-5">
              {deviceOpen && grid}
            </div>
          </section>
        ) : grid}
      </div>
    </section>
  );
}

// ── Event entry cards ───────────────────────────────────────────────────────

interface EventCardProps {
  tone: 'join' | 'create';
  title: string;
  body: string;
  onClick: () => void;
}

function EventCard({ tone, title, body, onClick }: EventCardProps) {
  const join = tone === 'join';
  const Icon = join ? QrCode : Crown;
  const id = `event-entry-${tone}`;
  return (
    <button type="button" onClick={onClick} aria-labelledby={id} aria-describedby={`${id}-description`}
      className={`btn-3d ${join ? 'btn-go' : 'btn-sun'} flex w-full items-center gap-3 rounded-2xl p-4 text-left text-ink sm:p-5`}>
      <Icon className="h-7 w-7 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span id={id} className="block font-display text-2xl leading-tight">{title}</span>
        <span id={`${id}-description`} className="mt-1 block text-sm font-semibold leading-snug">{body}</span>
      </span>
      <ArrowRight className="h-5 w-5 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

interface GameCardProps {
  pack: GamePack;
  index: number;
  summary?: GameSummary;
  onSelect: (id: string) => void;
  onResume: (id: string) => void;
  onReset: (id: string) => void;
}

function countChallenges(pack: GamePack) {
  return pack.categories.reduce((sum, category) => sum + category.challenges.length, 0);
}

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function GameCard({ pack, index, summary, onSelect, onResume, onReset }: GameCardProps) {
  const challengeCount = countChallenges(pack);
  const total = summary?.total || challengeCount;
  const done = Math.min(summary?.completed ?? 0, total);
  const started = Boolean(summary?.started);
  const finished = started && total > 0 && done >= total;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const location = capitalize(pack.locationLabel ?? pack.setting);
  const teamName = summary?.teamName?.trim() || null;
  const pathLabel = summary?.pathId ? `Path ${summary.pathId}` : null;
  const canReset = started || Boolean(summary?.hasSavedData);
  // Saved data without progress (e.g. photos only): show who/where, no bar.
  const showSavedLine = !started && (canReset || teamName);

  const descId = `game-${pack.id}-desc`;
  const progressId = `game-${pack.id}-progress`;
  const tilt = index % 2 === 0 ? '-5deg' : '4deg';

  return (
    <article
      className="gl-card sticker-card relative flex h-full flex-col"
      style={{ ['--gl-color' as string]: pack.library.color, ['--gl-soft' as string]: pack.library.soft }}
    >
      {/* Top band: art + identity */}
      <div className="gl-band flex items-center gap-4 border-b-2 border-ink px-4 py-4 sm:px-5">
        <div className="gl-art flex-shrink-0" style={{ ['--gl-tilt' as string]: tilt }}>
          <PackArt pack={pack} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="gl-chip mb-1.5 inline-block rounded-full border-2 border-ink px-2.5 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wider text-ink">
            {pack.library.label}
          </span>
          <h2 className="text-[1.6rem] leading-[1.05] text-ink sm:text-[1.75rem]">
            <button
              type="button"
              className="gl-open text-left"
              onClick={() => onSelect(pack.id)}
              aria-describedby={`${descId}${started || showSavedLine ? ` ${progressId}` : ''}`}
            >
              {pack.title}
            </button>
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-bold text-ink/70">
            <MapPin className="h-4 w-4 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        </div>
      </div>

      {/* Status stamp */}
      {started && (
        <span
          className={`gl-stamp animate-stamp-in absolute -top-3 right-4 z-[2] rounded-lg border-2 border-ink px-2 py-0.5 font-display text-sm tracking-wide text-ink ${
            finished ? 'bg-go' : 'bg-cream'
          }`}
          aria-hidden="true"
        >
          {finished ? 'Done!' : 'In progress'}
        </span>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
        <p id={descId} className="text-[0.98rem] font-medium leading-snug text-ink/85">
          {pack.library.summary}
        </p>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-ink/65" aria-label="Game details">
          <li className="flex items-center gap-1.5">
            <Camera className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {challengeCount} {challengeCount === 1 ? 'challenge' : 'challenges'}
          </li>
          {pack.paths.length > 1 && (
            <li className="flex items-center gap-1.5">
              <Route className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              {pack.paths.length} team paths
            </li>
          )}
        </ul>

        {started && (
          <div id={progressId}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm font-bold text-ink">
              <span className="flex-shrink-0">{finished ? 'All found!' : `${done} of ${total} found`}</span>
              <TeamPath teamName={teamName} pathLabel={pathLabel} />
            </div>
            <div
              className="h-3.5 overflow-hidden rounded-full border-2 border-ink bg-cream"
              role="progressbar"
              aria-label={`${pack.title} progress`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <div
                className={`gl-fill h-full ${finished ? '' : 'progress-stripes'}`}
                style={{ width: `${Math.max(percent, done > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        )}

        {showSavedLine && (
          <div id={progressId} className="flex items-baseline justify-between gap-3 text-sm font-bold text-ink">
            <span className="flex-shrink-0">{canReset ? 'Saved on this device' : 'Ready to start'}</span>
            <TeamPath teamName={teamName} pathLabel={pathLabel} />
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-3 pt-1">
          {started && (
            <button
              type="button"
              onClick={() => onResume(pack.id)}
              className={`gl-action btn-3d ${finished ? 'btn-sun' : 'btn-go'} inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 font-display text-lg tracking-wide text-ink`}
              aria-label={finished ? `View ${pack.title} results` : `Continue ${pack.title}`}
            >
              {finished ? (
                <Trophy className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
              ) : (
                <Play className="h-5 w-5 fill-current" strokeWidth={2.5} aria-hidden="true" />
              )}
              {finished ? 'View results' : 'Continue'}
            </button>
          )}

          <div className="flex min-h-[44px] items-center justify-between gap-3">
            {canReset && (
              <button
                type="button"
                onClick={() => onReset(pack.id)}
                className="gl-action gl-reset inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-extrabold"
                aria-label={`Reset ${pack.title}`}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
                Reset game
              </button>
            )}
            {started ? (
              <span className="gl-cue ml-auto flex items-center gap-1 text-sm font-extrabold text-ink/70" aria-hidden="true">
                Details <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </span>
            ) : (
              <span className="gl-cue ml-auto flex items-center gap-1.5 font-display text-lg tracking-wide text-ink" aria-hidden="true">
                Let&rsquo;s play
                <span className="gl-cue-dot flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink">
                  <ArrowRight className="h-4 w-4" strokeWidth={3.25} />
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** "Team name · Path B", truncating a long team name on narrow cards. */
function TeamPath({ teamName, pathLabel }: { teamName: string | null; pathLabel: string | null }) {
  if (!teamName && !pathLabel) return null;
  return (
    <span className="flex min-w-0 items-baseline gap-1 text-ink/60">
      {teamName && <span className="truncate text-ink/80" title={teamName}>{teamName}</span>}
      {teamName && pathLabel && <span aria-hidden="true">·</span>}
      {pathLabel && <span className="flex-shrink-0">{pathLabel}</span>}
    </span>
  );
}

// ── Art ─────────────────────────────────────────────────────────────────────

/**
 * Mascot art with a fallback chain that never requests an empty URL:
 * PNG (if `mascotArt` is set and loads) → built-in SVG (matched by theme) →
 * emoji → monogram.
 */
function PackArt({ pack }: { pack: GamePack }) {
  const [failed, setFailed] = useState(false);

  if (pack.mascotArt && !failed) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}art/${pack.mascotArt}.png`}
        alt=""
        draggable={false}
        decoding="async"
        onError={() => setFailed(true)}
        className="gl-art-img h-[4.5rem] w-[4.5rem] select-none object-contain sm:h-20 sm:w-20"
      />
    );
  }

  const illustration = illustrationFor(pack);
  const artSize = 'h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20';
  if (illustration === 'christmas') return <ChristmasArt className={artSize} />;
  if (illustration === 'detective') return <DetectiveArt className={artSize} />;

  return (
    <div
      aria-hidden="true"
      className="gl-badge flex h-[4.5rem] w-[4.5rem] select-none items-center justify-center rounded-full border-2 border-ink sm:h-20 sm:w-20"
    >
      {pack.mascotEmoji ? (
        <span className="text-[2.6rem] leading-none">{pack.mascotEmoji}</span>
      ) : (
        <span className="font-display text-4xl text-ink">{pack.title.trim().charAt(0)}</span>
      )}
    </div>
  );
}

/** Built-in illustrations for packs that ship without PNG art. */
function illustrationFor(pack: GamePack): 'christmas' | 'detective' | null {
  const key = `${pack.id} ${pack.title}`.toLowerCase();
  if (/christmas|nativity|advent/.test(key)) return 'christmas';
  if (pack.id === 'scripture-detectives') return 'detective';
  return null;
}

const INK = '#2E2459';

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** Evergreen with the Star of Bethlehem and a candy cane ("J" for Jesus). */
function ChristmasArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* sticker backing */}
        <circle cx="48" cy="52" r="40" fill="#FFFDF7" />
        {/* trunk */}
        <rect x="42" y="76" width="12" height="11" rx="2" fill="#C98A4B" />
        {/* tiers, bottom first */}
        <path d="M48 46 L76 78 H20 Z" fill="#2FBF71" />
        <path d="M48 32 L70 60 H26 Z" fill="#2FBF71" />
        <path d="M48 20 L64 44 H32 Z" fill="#2FBF71" />
        {/* ornaments */}
        <circle cx="38" cy="70" r="3.2" fill="#FF6B6B" strokeWidth="2" />
        <circle cx="58" cy="56" r="3.2" fill="#38B6FF" strokeWidth="2" />
        <circle cx="45" cy="42" r="3" fill="#FFB020" strokeWidth="2" />
        {/* star */}
        <polygon points={starPoints(48, 15, 11, 4.8)} fill="#FFB020" />
      </g>
      {/* candy cane: ink outline, white body, red stripes */}
      <g fill="none" strokeLinecap="round">
        <path d="M77 90 V66 a6.5 6.5 0 0 0 -13 0" stroke={INK} strokeWidth="9.5" />
        <path d="M77 90 V66 a6.5 6.5 0 0 0 -13 0" stroke="#FFFDF7" strokeWidth="4.5" />
        <path d="M77 90 V66 a6.5 6.5 0 0 0 -13 0" stroke="#FF6B6B" strokeWidth="4.5" strokeDasharray="3.5 4" strokeLinecap="butt" />
      </g>
    </svg>
  );
}

/** Open scriptures under a detective's magnifying glass. */
function DetectiveArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="48" cy="50" r="40" fill="#FFFDF7" />
        {/* cover */}
        <path d="M10 38 Q29 31 48 39 Q67 31 86 38 V82 Q67 75 48 83 Q29 75 10 82 Z" fill="#7A6CF0" />
        {/* pages */}
        <path d="M14 34 Q31 28 48 36 V78 Q31 71 14 76 Z" fill="#FFFDF7" />
        <path d="M82 34 Q65 28 48 36 V78 Q65 71 82 76 Z" fill="#FFFDF7" />
        {/* text lines */}
        <g strokeWidth="2" opacity="0.45">
          <path d="M20 44 Q31 40 42 45" fill="none" />
          <path d="M20 52 Q31 48 42 53" fill="none" />
          <path d="M20 60 Q31 56 42 61" fill="none" />
          <path d="M54 45 Q63 40 72 43" fill="none" />
        </g>
        {/* ribbon bookmark */}
        <path d="M34 77 V88 L38 85 L42 88 V79" fill="#FF6B6B" strokeWidth="2.5" />
        {/* magnifying glass */}
        <line x1="74" y1="64" x2="87" y2="77" strokeWidth="9" />
        <line x1="74" y1="64" x2="87" y2="77" stroke="#FFB020" strokeWidth="3.5" />
        <circle cx="64" cy="54" r="15" fill="#E0F3FF" strokeWidth="3.5" />
        <path d="M56 49 Q59 44 65 44" fill="none" stroke="#FFFDF7" strokeWidth="3" />
      </g>
      {/* sparkle */}
      <path d="M22 18 L24 23 L29 25 L24 27 L22 32 L20 27 L15 25 L20 23 Z" fill="#FFB020" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
