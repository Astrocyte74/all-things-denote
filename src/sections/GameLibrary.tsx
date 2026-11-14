import { useState } from 'react';
import { ArrowRight, Camera, MapPin, Play, Route, Trophy } from 'lucide-react';
import type { GamePack } from '@/types';
import './GameLibrary.css';

export interface GameSummary {
  completed: number;
  total: number;
  started: boolean;
  pathId?: string;
}

interface GameLibraryProps {
  packs: GamePack[];
  summaries: Record<string, GameSummary>;
  /** Open the game's detail / setup screen. */
  onSelect: (id: string) => void;
  /** Jump back into the saved hunt (or its results when finished). */
  onResume: (id: string) => void;
}

/**
 * "Choose your adventure" library. Renders one card per registered pack:
 * nothing here is game-specific, so a new pack shows up automatically.
 *
 * Each card is an <article> holding sibling buttons (never nested): a
 * "stretched" title button whose ::after covers the whole card (opens
 * details), plus a Continue / View results button layered above it.
 */
export function GameLibrary({ packs, summaries, onSelect, onResume }: GameLibraryProps) {
  return (
    <section className="paper-dots min-h-[100svh] px-4 pb-12 pt-8 md:px-8 md:pt-12" aria-labelledby="game-library-title">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 text-center md:mb-10">
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.14em] text-ink/60">
            {packs.length} photo {packs.length === 1 ? 'game' : 'games'}
          </p>
          <h1
            id="game-library-title"
            className="text-sticker-sun animate-pop-in text-[2.4rem] leading-[1.05] sm:text-5xl md:text-6xl"
          >
            Choose your adventure
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base font-medium text-ink/75 md:text-lg">
            Pick a game for your group. Each one saves its own progress.
          </p>
        </header>

        <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 md:gap-7" role="list">
          {packs.map((pack, index) => (
            <li
              key={pack.id}
              className="animate-rise-in"
              style={{ animationDelay: `${80 + index * 70}ms` }}
            >
              <GameCard
                pack={pack}
                index={index}
                summary={summaries[pack.id]}
                onSelect={onSelect}
                onResume={onResume}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

interface GameCardProps {
  pack: GamePack;
  index: number;
  summary?: GameSummary;
  onSelect: (id: string) => void;
  onResume: (id: string) => void;
}

function countChallenges(pack: GamePack) {
  return pack.categories.reduce((sum, category) => sum + category.challenges.length, 0);
}

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function GameCard({ pack, index, summary, onSelect, onResume }: GameCardProps) {
  const challengeCount = countChallenges(pack);
  const total = summary?.total || challengeCount;
  const done = Math.min(summary?.completed ?? 0, total);
  const started = Boolean(summary?.started);
  const finished = started && total > 0 && done >= total;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const location = capitalize(pack.locationLabel ?? pack.setting);
  const pathLabel = summary?.pathId ? `Path ${summary.pathId}` : null;

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
              aria-describedby={`${descId}${started ? ` ${progressId}` : ''}`}
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
            <div className="mb-1 flex items-baseline justify-between text-sm font-bold text-ink">
              <span>{finished ? 'All found!' : `${done} of ${total} found`}</span>
              {pathLabel && <span className="text-ink/60">{pathLabel}</span>}
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

        {/* Actions */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          {started ? (
            <>
              <button
                type="button"
                onClick={() => onResume(pack.id)}
                className={`gl-action btn-3d ${finished ? 'btn-sun' : 'btn-go'} inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 font-display text-lg tracking-wide text-ink`}
                aria-label={finished ? `View ${pack.title} results` : `Continue ${pack.title}`}
              >
                {finished ? (
                  <Trophy className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5 fill-current" strokeWidth={2.5} aria-hidden="true" />
                )}
                {finished ? 'View results' : 'Continue'}
              </button>
              <span className="gl-cue flex items-center gap-1 text-sm font-extrabold text-ink/70" aria-hidden="true">
                Details <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </span>
            </>
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
    </article>
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
  if (/scripture|detective/.test(key)) return 'detective';
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
