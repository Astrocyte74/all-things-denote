import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, MapPin, RefreshCw, Route, Shuffle, Sparkles } from 'lucide-react';
import { PACKS, getPackById } from '@/data/packs';
import type { GamePack } from '@/types';
import { createReview, openReview, reviewConfigured } from '@/lib/sharedReview';
import { eventNameSuggestions, shuffledSuggestions } from '@/lib/eventNames';
import { DEFAULT_TEAM_NAMING, type TeamNamingSettings } from '@/lib/teamNaming';
import { describeError, packClues } from './common';
import { Notice, PackBadge } from './ui';
import { TeamNamingStep } from './TeamNamingStep';
import { Chip } from './Chip';
import { describeTeamNaming, normalizedTeamNaming, teamNamingProblem } from './teamNamingText';

const TITLE_LIMIT = 60;
const IDEA_COUNT = 6;
const STEPS = ['Game', 'Event name', 'Team names'] as const;
type Step = 0 | 1 | 2;

/** How the current event name got there, so a game switch only replaces our own prefill. */
type TitleSource = 'auto' | 'picked' | 'typed';

function ideasFor(pack: GamePack, exclude: readonly string[] = []) {
  const date = new Date();
  const month = date.toLocaleDateString('en', { month: 'long' });
  const ideas = eventNameSuggestions(pack, date);
  const contextual = ideas.filter(name => name.includes(pack.title) || name.includes(month));
  return [...shuffledSuggestions(contextual, 2, exclude), ...shuffledSuggestions(ideas.filter(name => !contextual.includes(name)), IDEA_COUNT - 2, exclude)];
}

/**
 * Three quick steps for a leader: game → event name → team names. Every
 * step keeps its draft when going Back, and nothing is created until the
 * final button is pressed (Enter never submits).
 */
export function CreateEventWizard({ packId }: { packId?: string }) {
  const [step, setStep] = useState<Step>(0);
  const [gameId, setGameId] = useState(() => PACKS.some(p => p.id === packId) ? packId! : PACKS[0].id);
  const pack = getPackById(gameId);
  const [title, setTitle] = useState('');
  const [titleSource, setTitleSource] = useState<TitleSource>('auto');
  const [ideas, setIdeas] = useState(() => ideasFor(pack));
  const [naming, setNaming] = useState<TeamNamingSettings>(DEFAULT_TEAM_NAMING);
  const [customPermissionEdited, setCustomPermissionEdited] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Focus the step heading on open and after every step change (never an
  // input, so phones don't open the keyboard over the step).
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const cleanTitle = title.replace(/\s+/g, ' ').trim();

  const chooseGame = (id: string) => {
    if (id === gameId) return;
    const next = getPackById(id);
    setGameId(id);
    setIdeas(ideasFor(next));
    // Only our own prefill follows the game; a picked or typed name stays.
    if (titleSource === 'auto') setTitle('');
  };

  const goTo = (next: Step) => {
    if (next === 1 && !title) {
      // Prefill with the first idea so the fast path is one tap; it stays
      // marked "auto" until the leader picks or types something.
      setTitle(ideas[0] ?? '');
      setTitleSource('auto');
    }
    setTitleError(null);
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (step === 0) return goTo(1);
    if (step === 1) {
      if (!cleanTitle) { setTitleError('Give your event a name so teams know they’re in the right place.'); return; }
      return goTo(2);
    }
  };

  const namingProblem = teamNamingProblem(naming);

  const create = async () => {
    if (creatingRef.current) return;
    if (!cleanTitle) { setStep(1); setTitleError('Give your event a name first.'); return; }
    if (namingProblem) { setCreateError(namingProblem); return; }
    creatingRef.current = true;
    setCreating(true);
    setCreateError(null);
    try {
      const { access } = await createReview(cleanTitle, gameId, normalizedTeamNaming(naming));
      openReview(access);
    } catch (error) {
      // Keep every choice so the leader can just retry.
      setCreateError(describeError(error));
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const titles = ['Pick a game', 'Name your event', 'Team names'];

  return (
    <div className="sticker-card mb-6 overflow-hidden" style={{ backgroundColor: '#FFFDF7' }}>
      <div className="border-b-2 border-ink p-4 sm:px-6" style={{ backgroundColor: '#FFF4D9' }}>
        <Progress step={step} />
        <h2 id="sr-create" ref={heading} tabIndex={-1} className="mt-3 flex items-center gap-2 font-display text-[1.7rem] leading-tight focus:outline-none">
          {titles[step]}
        </h2>
        <p className="mt-0.5 text-sm font-semibold text-ink/70">
          {step === 0 && 'Every team plays the same game. Paths are shared out automatically.'}
          {step === 1 && 'Teams see this when they scan your QR code.'}
          {step === 2 && 'The quick default works for most groups. Change it only if you need to.'}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        {step === 0 && <GameStep gameId={gameId} onChoose={chooseGame} />}
        {step === 1 && (
          <NameStep
            title={title}
            titleSource={titleSource}
            ideas={ideas}
            error={titleError}
            onTitle={(value, source) => { setTitle(value); setTitleSource(source); setTitleError(null); }}
            onMoreIdeas={() => setIdeas(current => ideasFor(pack, current))}
            onEnter={next}
          />
        )}
        {step === 2 && (
          <>
            <TeamNamingStep value={naming} onChange={value => { setNaming(value); setCreateError(null); }} customPermissionEdited={customPermissionEdited} onCustomPermissionEdited={setCustomPermissionEdited} />
            <Summary pack={pack} title={cleanTitle} naming={naming} onEdit={target => goTo(target)} />
            {!reviewConfigured && <div className="mt-4"><Notice tone="warn">Group events aren’t connected on this site yet, so events can’t be created here.</Notice></div>}
            {createError && (
              <div className="mt-4">
                <Notice tone="error">{createError} Your choices are saved; press Create again to retry.</Notice>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t-2 border-ink bg-cream p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => goTo((step - 1) as Step)}
            disabled={creating}
            className="btn-3d btn-white inline-flex min-h-12 flex-shrink-0 items-center gap-1.5 rounded-2xl px-4 font-extrabold text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Back
          </button>
        ) : <span className="hidden sm:block sm:flex-1" />}
        {step < 2 ? (
          <button
            type="button"
            onClick={next}
            className="btn-3d btn-go ml-auto inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink sm:flex-none"
          >
            Next <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={create}
            disabled={creating || !reviewConfigured || Boolean(namingProblem)}
            aria-describedby={namingProblem ? 'wiz-naming-problem' : undefined}
            className="btn-3d btn-go ml-auto inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-display text-lg tracking-wide text-ink sm:flex-none sm:px-6 sm:text-xl"
          >
            {creating && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />}
            {creating ? 'Creating…' : 'Create event & show QR'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Progress ────────────────────────────────────────────────────────────────

function Progress({ step }: { step: Step }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink/70">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <ol className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`h-2.5 rounded-full border-2 border-ink ${index < step ? 'bg-go' : index === step ? 'bg-sun' : 'bg-cream'}`}
          />
        ))}
      </ol>
    </div>
  );
}

// ── Step 1: game ────────────────────────────────────────────────────────────

function GameStep({ gameId, onChoose }: { gameId: string; onChoose: (id: string) => void }) {
  const legend = useId();
  return (
    <fieldset className="min-w-0">
      <legend id={legend} className="sr-only">Game</legend>
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-labelledby={legend}>
        {PACKS.map(pack => {
          const checked = pack.id === gameId;
          return (
            <div
              key={pack.id}
              className={`rounded-2xl border-2 border-ink transition-transform ${checked ? '-translate-y-0.5 shadow-[3px_3px_0_0_#2E2459]' : 'bg-cream'}`}
              style={checked ? { backgroundColor: pack.library.soft } : undefined}
            >
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl p-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
                <input type="radio" name="wiz-game" value={pack.id} checked={checked} onChange={() => onChoose(pack.id)} className="sr-only" />
                <PackBadge pack={pack} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg leading-tight">{pack.title}</span>
                  <span className="block truncate text-xs font-bold text-ink/65">{pack.library.label} · {pack.locationLabel ?? pack.setting}</span>
                </span>
                <span aria-hidden="true" className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink ${checked ? 'bg-go' : 'bg-white'}`}>
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={4} />}
                </span>
              </label>
              {checked && <GamePreview pack={pack} />}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** What the game is like, without spoilers: the first clue's prompt only, never its discussion answer. */
function GamePreview({ pack }: { pack: GamePack }) {
  const clues = packClues(pack.id);
  const sample = clues[0]?.challenge;
  return (
    <div className="border-t-2 border-dashed border-ink/25 px-3 pb-3 pt-2.5">
      <p className="text-[0.95rem] font-medium leading-snug text-ink/85">{pack.library.summary}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-extrabold text-ink/70" aria-label="Game details">
        <li className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />{pack.locationLabel ?? pack.setting}</li>
        <li className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />{clues.length} photo clues</li>
        {pack.paths.length > 1 && <li className="flex items-center gap-1"><Route className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />{pack.paths.length} paths, balanced for you</li>}
      </ul>
      {sample && (
        <div className="mt-2.5 rounded-xl border-2 border-ink/20 bg-white/70 p-2.5">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-wider text-ink/60">Sample clue</p>
          <p className="mt-0.5 font-display text-base leading-tight">{sample.title}</p>
          {sample.scriptureClue ? (
            <p className="mt-1 text-sm font-semibold leading-snug text-ink/75">
              <span className="font-extrabold">{sample.scriptureClue.reference}:</span> “{truncate(sample.scriptureClue.excerpt, 110)}”
            </p>
          ) : sample.photoTarget && (
            <p className="mt-0.5 text-sm font-semibold leading-snug text-ink/75">{sample.photoTarget}</p>
          )}
          <p className="mt-1.5 text-xs font-semibold text-ink/60">Teams snap a photo for each clue, then you compare them together.</p>
        </div>
      )}
    </div>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// ── Step 2: event name ──────────────────────────────────────────────────────

function NameStep({ title, titleSource, ideas, error, onTitle, onMoreIdeas, onEnter }: {
  title: string;
  titleSource: TitleSource;
  ideas: string[];
  error: string | null;
  onTitle: (value: string, source: TitleSource) => void;
  onMoreIdeas: () => void;
  onEnter: () => void;
}) {
  const input = useId();
  const ideasLabel = useId();
  return (
    <div>
      <label htmlFor={input} className="block font-extrabold">Event name</label>
      <input
        id={input}
        value={title}
        maxLength={TITLE_LIMIT}
        onChange={e => onTitle(e.target.value, 'typed')}
        // Enter moves to the next step; it can never create the event.
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
        enterKeyHint="next"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
        placeholder="e.g. Youth night hunt"
      />
      <p className="mt-1 text-xs font-semibold text-ink/60">
        {titleSource === 'auto' && title ? 'Suggested for you. Tap an idea or type your own.' : `${title.length}/${TITLE_LIMIT}`}
      </p>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p id={ideasLabel} className="flex items-center gap-1.5 font-extrabold"><Sparkles className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Ideas</p>
        <button type="button" onClick={onMoreIdeas} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-ink/75 underline underline-offset-4 hover:text-ink">
          <RefreshCw className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> More ideas
        </button>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-2" aria-labelledby={ideasLabel}>
        {ideas.map(idea => (
          <li key={idea}>
            <Chip pressed={idea === title.trim()} onClick={() => onTitle(idea, 'picked')}>{idea}</Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Summary ─────────────────────────────────────────────────────────────────

function Summary({ pack, title, naming, onEdit }: { pack: GamePack; title: string; naming: TeamNamingSettings; onEdit: (step: Step) => void }) {
  const rows: Array<{ label: string; value: ReactNode; edit?: Step }> = [
    { label: 'Game', value: pack.title, edit: 0 },
    { label: 'Event', value: title || '—', edit: 1 },
    { label: 'Teams', value: describeTeamNaming(naming) },
    { label: 'Paths', value: <span className="inline-flex items-center gap-1"><Shuffle className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />Balanced automatically</span> },
  ];
  return (
    <section aria-label="Event summary" className="mt-5 rounded-2xl border-2 border-ink bg-white p-3.5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink/60">Ready to create</p>
      <dl className="mt-1.5 flex flex-col gap-1.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-baseline gap-3 text-sm">
            <dt className="w-14 flex-shrink-0 font-extrabold text-ink/65">{row.label}</dt>
            <dd className="min-w-0 flex-1 break-words font-bold">{row.value}</dd>
            {row.edit !== undefined && (
              <button type="button" onClick={() => onEdit(row.edit!)} className="min-h-9 flex-shrink-0 px-1 text-xs font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink" aria-label={`Change ${row.label.toLowerCase()}`}>
                Change
              </button>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
