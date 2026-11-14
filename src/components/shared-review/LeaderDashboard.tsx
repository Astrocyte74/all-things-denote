import { useId, useMemo, useState, type ReactNode } from 'react';
import { Camera, CheckCircle2, ChevronDown, Clock, Flag, Info, Users } from 'lucide-react';
import type { GamePack } from '@/types';
import type { ReviewSnapshot, ReviewTeam } from '@/lib/sharedReview';
import { PATH_COLORS, packClues, relativeTime } from './common';
import { PathPill } from './ui';

interface DashboardProps {
  snapshot: ReviewSnapshot;
  pack: GamePack;
  /** Ticking clock from LeaderView, so "Last progress…" stays fresh between polls. */
  now: number;
}

interface TeamRow {
  team: ReviewTeam;
  /** null = this team's phone hasn't reported progress (unknown, not 0%). */
  done: Set<string> | null;
  photos: number;
  photoClues: Set<string>;
  finished: boolean;
}

/**
 * Leader's live overview: who has joined, how far each team has got, and how
 * many photos they've sent. Completed clues and sent photos are counted
 * separately on purpose; a sent photo isn't proof a clue is done, and a
 * finished clue may have no photo shared yet.
 */
export function LeaderDashboard({ snapshot, pack, now }: DashboardProps) {
  const clues = useMemo(() => packClues(pack.id), [pack.id]);
  const total = clues.length;
  const [showGrid, setShowGrid] = useState(false);
  const gridId = useId();

  const rows = useMemo<TeamRow[]>(() => {
    const valid = new Set(clues.map(c => c.challenge.id));
    return [...snapshot.teams]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(team => {
        const sent = snapshot.photos.filter(photo => photo.teamId === team.id);
        const done = team.progress ? new Set(team.progress.completedChallengeIds.filter(id => valid.has(id))) : null;
        return {
          team,
          done,
          photos: sent.length,
          photoClues: new Set(sent.map(photo => photo.challengeId)),
          finished: Boolean(done && total > 0 && done.size >= total),
        };
      });
  }, [snapshot.teams, snapshot.photos, clues, total]);

  const reporting = rows.filter(row => row.done).length;
  const finished = rows.filter(row => row.finished).length;

  return (
    <section aria-labelledby="sr-progress" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="sr-progress" tabIndex={-1} className="scroll-mt-4 font-display text-3xl focus:outline-none">Team progress</h2>
        <p className="text-sm font-semibold text-ink/65">{total} clues in {pack.title}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={<Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />} label={rows.length === 1 ? 'Team joined' : 'Teams joined'} value={rows.length} tint="#E0F3FF" />
        <Stat icon={<Flag className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />} label="Finished" value={finished} tint="#E7F8D8" detail={rows.length ? `of ${rows.length}` : undefined} />
        <Stat icon={<Camera className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />} label="Photos sent" value={snapshot.photos.length} tint="#FFF4D9" />
      </dl>

      {rows.length === 0 ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-ink/35 bg-cream p-4 text-center">
          <p className="font-display text-xl">No teams yet</p>
          <p className="mt-1 text-sm font-semibold text-ink/70">Share the QR code. Teams appear here as soon as they join, and their progress fills in as they play.</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 grid gap-2.5 xl:grid-cols-2" aria-label="Teams">
            {rows.map(row => <TeamCard key={row.team.id} row={row} total={total} now={now} />)}
          </ul>

          {reporting < rows.length && (
            <p className="mt-2 flex gap-2 text-xs font-semibold leading-snug text-ink/65">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
              <span>
                {reporting === 0 ? 'No team has reported progress yet.' : `${rows.length - reporting} ${rows.length - reporting === 1 ? 'team hasn’t' : 'teams haven’t'} reported progress yet.`}
                {' '}Progress appears when a team starts the hunt. A phone on an older version of the app may only show photos sent.
              </span>
            </p>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowGrid(v => !v)}
              aria-expanded={showGrid}
              aria-controls={gridId}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-extrabold text-ink/80 underline underline-offset-4 hover:text-ink"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showGrid ? 'rotate-180' : ''}`} strokeWidth={3} aria-hidden="true" />
              {showGrid ? 'Hide clue-by-clue grid' : 'Show clue-by-clue grid'}
            </button>
            <div id={gridId} hidden={!showGrid}>
              {showGrid && <ClueGrid rows={rows} clues={clues.map(c => c.challenge)} />}
            </div>
          </div>
        </>
      )}

      <p className="mt-3 text-xs font-semibold leading-snug text-ink/60">
        Progress syncs from each team’s phone while they play. A team that’s offline catches up when it reconnects, so a quiet team may just be between signals.
      </p>
    </section>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function Stat({ icon, label, value, tint, detail }: { icon: ReactNode; label: string; value: number; tint: string; detail?: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink p-2.5 text-center shadow-[3px_3px_0_0_#2E2459] sm:p-3" style={{ backgroundColor: tint }}>
      <dt className="flex items-center justify-center gap-1 text-[0.68rem] font-extrabold uppercase leading-tight tracking-wide text-ink/70 sm:text-xs">
        <span className="hidden sm:inline">{icon}</span>{label}
      </dt>
      <dd className="mt-1 font-display text-3xl leading-none">
        {value}
        {detail && <span className="ml-1 font-body text-xs font-extrabold text-ink/60">{detail}</span>}
      </dd>
    </div>
  );
}

function TeamCard({ row, total, now }: { row: TeamRow; total: number; now: number }) {
  const { team, done, photos, finished } = row;
  const count = done?.size ?? 0;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const fill = (team.pathId && PATH_COLORS[team.pathId]) || '#58CC02';
  const progressLabel = `${team.name}: ${count} of ${total} clues completed`;

  return (
    <li className="sticker-card min-w-0 p-3 sm:p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-xl leading-tight">{team.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PathPill pathId={team.pathId} />
            {finished && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-go px-2 py-0.5 text-xs font-extrabold">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> All clues done
              </span>
            )}
          </div>
        </div>
        <p className="flex flex-shrink-0 items-center gap-1 rounded-full border-2 border-ink/20 bg-cream px-2 py-0.5 text-xs font-extrabold" title="Photos this team has sent to the event">
          <Camera className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
          {photos} <span className="sr-only">{photos === 1 ? 'photo' : 'photos'}</span><span aria-hidden="true">sent</span>
        </p>
      </div>

      {done ? (
        <>
          <div className="mt-2.5 flex items-baseline justify-between gap-2 text-sm font-extrabold">
            <span>{count} of {total} clues</span>
            <span className="text-ink/60">{percent}%</span>
          </div>
          <div
            className="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-cream"
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={count}
          >
            <div className={`h-full ${finished ? '' : 'progress-stripes'}`} style={{ width: `${Math.max(percent, count > 0 ? 5 : 0)}%`, backgroundColor: fill }} />
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-ink/60">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
            Last progress {relativeTime(team.progress!.updatedAt, now)}
          </p>
        </>
      ) : (
        <>
          <div className="mt-2.5 h-3.5 rounded-full border-2 border-dashed border-ink/35" aria-hidden="true" />
          <p className="mt-1.5 text-xs font-semibold text-ink/65">Waiting for first progress update · joined {relativeTime(team.joinedAt, now)}</p>
        </>
      )}
    </li>
  );
}

/** Compact team × clue matrix. Scrolls sideways on phones with the team column pinned. */
function ClueGrid({ rows, clues }: { rows: TeamRow[]; clues: Array<{ id: string; number: number; title: string }> }) {
  return (
    <div className="mt-2 rounded-2xl border-2 border-ink bg-white">
      <div className="relative max-w-full overflow-x-auto overscroll-x-contain rounded-2xl">
        <table className="w-max min-w-full border-collapse text-sm">
          <caption className="px-3 pb-1 pt-2.5 text-left text-xs font-semibold text-ink/65">
            <span className="mr-3 inline-flex items-center gap-1"><Cell state="done" /> Clue done</span>
            <span className="mr-3 inline-flex items-center gap-1"><Cell state="photo" /> Photo sent</span>
            <span className="inline-flex items-center gap-1"><Cell state="unknown" /> No progress yet</span>
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-white px-3 py-1.5 text-left text-xs font-extrabold uppercase tracking-wide text-ink/60">Team</th>
              {clues.map(clue => (
                <th key={clue.id} scope="col" className="min-w-[2.25rem] px-0.5 py-1.5 text-center font-display text-sm" title={clue.title}>
                  <span aria-hidden="true">{clue.number}</span>
                  <span className="sr-only">Clue {clue.number}: {clue.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.team.id} className="border-t-2 border-ink/10">
                <th scope="row" className="sticky left-0 z-[1] max-w-[9rem] truncate bg-white px-3 py-1.5 text-left font-extrabold" title={row.team.name}>
                  {row.team.name}
                </th>
                {clues.map(clue => {
                  const done = row.done?.has(clue.id) ?? false;
                  const photo = row.photoClues.has(clue.id);
                  const state = done && photo ? 'both' : done ? 'done' : photo ? 'photo' : row.done ? 'none' : 'unknown';
                  return (
                    <td key={clue.id} className="px-0.5 py-1.5 text-center">
                      <Cell state={state} />
                      <span className="sr-only">{CELL_TEXT[state]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/20">
              <th scope="row" className="sticky left-0 z-[1] bg-white px-3 py-1.5 text-left text-xs font-extrabold uppercase tracking-wide text-ink/60">Teams done</th>
              {clues.map(clue => {
                const n = rows.filter(row => row.done?.has(clue.id)).length;
                return <td key={clue.id} className="px-0.5 py-1.5 text-center text-xs font-extrabold text-ink/70">{n}</td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

type CellState = 'both' | 'done' | 'photo' | 'none' | 'unknown';
const CELL_TEXT: Record<CellState, string> = {
  both: 'Done, photo sent',
  done: 'Done',
  photo: 'Photo sent; completion not confirmed',
  none: 'Not done',
  unknown: 'No progress reported',
};

function Cell({ state }: { state: CellState }) {
  if (state === 'unknown') return <span aria-hidden="true" className="inline-block h-5 w-5 rounded-md border-2 border-dashed border-ink/25 align-middle" />;
  const done = state === 'done' || state === 'both';
  const photo = state === 'photo' || state === 'both';
  return (
    <span aria-hidden="true" className={`relative inline-flex h-5 w-5 items-center justify-center rounded-md border-2 align-middle ${done ? 'border-ink bg-go' : 'border-ink/25 bg-cream'}`}>
      {done && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="#2E2459" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {photo && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-sky" />}
    </span>
  );
}
