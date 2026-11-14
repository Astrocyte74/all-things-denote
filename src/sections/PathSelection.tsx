import { useId, useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { Category, Path } from '@/types';
import { getCategoryTheme } from '@/lib/theme';
import { TEAM_NAME_LIMIT as TEAM_NAME_MAX } from '@/lib/teamName';

interface PathSelectionProps {
  onPathSelected: (pathId: string) => void;
  isVisible: boolean;
  /** Back-to-previous-screen affordance; only rendered when provided. */
  onBack?: () => void;
  /** Previously chosen path; pre-selected so the user can confirm or change it. */
  initialPathId?: string;
  /** The paths to choose between (comes from the active pack). */
  paths: Path[];
  /** The pack's categories — used to color each dot in a path's preview strip. */
  categories: Category[];
  /** Saved team name for this game (optional). */
  teamName?: string;
  /** Renders the optional Team name field; called on every edit (caller trims/persists). */
  onTeamNameChange?: (name: string) => void;
}


const pathMeta: Record<string, { color: string; soft: string }> = {
  A: { color: '#FFB020', soft: '#FFF4D9' },
  B: { color: '#FF6B6B', soft: '#FFE7E4' },
  C: { color: '#38B6FF', soft: '#E0F3FF' },
  D: { color: '#2FBF71', soft: '#DFF6E9' },
  E: { color: '#7A6CF0', soft: '#ECE9FF' },
  F: { color: '#FF9DE2', soft: '#FFE9F7' },
};

export function PathSelection({ onPathSelected, onBack, initialPathId, paths, categories, teamName, onTeamNameChange }: PathSelectionProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPathId ?? null);
  const [team, setTeam] = useState(teamName ?? '');
  const teamFieldId = useId();

  // Challenge number (1-based) -> the color of its category. Lets each path card
  // show the actual rhythm of the route: runs of one color, or a rainbow shuffle.
  const colorByNumber = useMemo(() => {
    const colors: string[] = [];
    categories.forEach((category) => {
      const color = getCategoryTheme(category.id).main;
      category.challenges.forEach(() => colors.push(color));
    });
    return colors;
  }, [categories]);

  return (
    <section className="paper-dots relative min-h-[100svh] py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4 pb-32 md:px-8">
        {onBack && (
          <button
            onClick={onBack}
            className="btn-3d btn-white animate-rise-in mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </button>
        )}
        <div className="mb-8 text-center">
          <p className="animate-rise-in mx-auto mb-3 inline-block rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-bold text-ink">
            Step 1 of 2
          </p>
          <h2 className="animate-rise-in font-display text-4xl text-ink md:text-5xl" style={{ animationDelay: '0.08s' }}>
            Pick your path
          </h2>
          <p className="animate-rise-in mx-auto mt-3 max-w-xl font-semibold text-ink/75" style={{ animationDelay: '0.16s' }}>
            Every team does the same {colorByNumber.length} challenges in a different order, so you spread out
            and explore together. Each team should pick a different path.
          </p>
          <p className="animate-rise-in mx-auto mt-2 max-w-xl text-sm font-semibold text-ink/70" style={{ animationDelay: '0.2s' }}>
            Each dot is a challenge, in the order you will find it. Colors match the {categories.length} themes.
          </p>
        </div>

        {onTeamNameChange && (
          <div
            className="animate-rise-in flat-card mx-auto mb-8 max-w-xl bg-cream p-4 sm:p-5"
            style={{ animationDelay: '0.22s' }}
          >
            <label htmlFor={teamFieldId} className="flex items-baseline justify-between gap-3">
              <span className="font-display text-xl text-ink">Team name</span>
              <span className="text-sm font-bold text-ink/60">Optional</span>
            </label>
            <input
              id={teamFieldId}
              type="text"
              value={team}
              maxLength={TEAM_NAME_MAX}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              spellCheck={false}
              placeholder="e.g. The Lost Sheep"
              aria-describedby={`${teamFieldId}-help`}
              onChange={(e) => {
                setTeam(e.target.value);
                onTeamNameChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="mt-2 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 py-2 text-lg font-bold text-ink shadow-[inset_0_2px_0_rgba(46,36,89,0.08)] placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
            />
            <p id={`${teamFieldId}-help`} className="mt-2 flex justify-between gap-3 text-sm font-semibold leading-snug text-ink/70">
              <span>Shows next to your path on new photos. Photos you've already taken keep their labels.</span>
              {team.length >= TEAM_NAME_MAX - 10 && (
                <span className="flex-shrink-0 tabular-nums" aria-live="polite">{team.length}/{TEAM_NAME_MAX}</span>
              )}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path, index) => {
            const meta = pathMeta[path.id];
            const isSelected = selectedPath === path.id;
            const title = path.name.split(' - ')[1] ?? path.name;
            return (
              <button
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                aria-pressed={isSelected}
                className={`animate-rise-in relative flex flex-col rounded-3xl border-2 border-ink p-4 text-left transition-transform duration-150 sm:p-5 ${
                  isSelected ? 'shadow-sticker-lg -translate-y-1' : 'shadow-sticker hover:-translate-y-0.5'
                }`}
                style={{
                  animationDelay: `${0.1 + index * 0.06}s`,
                  backgroundColor: isSelected ? meta.soft : '#FFFDF7',
                }}
              >
                {isSelected && (
                  <span className="animate-stamp-in absolute -right-2 -top-3 inline-flex rotate-[-4deg] items-center gap-1 rounded-full border-2 border-ink bg-go px-3 py-1 text-sm font-extrabold text-ink shadow-sticker-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={4} /> Picked!
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-ink font-display text-2xl text-white sm:h-14 sm:w-14 sm:text-3xl"
                    style={{ backgroundColor: meta.color, boxShadow: '2px 2px 0 0 #2E2459' }}
                  >
                    {path.id}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl leading-tight text-ink">
                      <span className="sr-only">Path {path.id}: </span>
                      {title}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-ink/75">{path.description}</p>
                  </div>
                </div>

                {/* The route at a glance: one dot per challenge, in the order this path visits them */}
                <div className="mt-auto flex gap-[3px] pt-4" aria-hidden="true">
                  {path.order.map((n, i) => (
                    <span
                      key={`${n}-${i}`}
                      className="aspect-square min-w-0 flex-1 rounded-full border-[1.5px] border-ink/70"
                      style={{ backgroundColor: colorByNumber[n - 1] ?? '#D9CDBC' }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky confirm bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => selectedPath && onPathSelected(selectedPath)}
            disabled={!selectedPath}
            className="btn-3d btn-go w-full rounded-full px-8 py-4 font-display text-xl tracking-wide text-ink"
          >
            {selectedPath ? `Let's go on Path ${selectedPath}!` : 'Pick a path to continue'}
          </button>
        </div>
      </div>
    </section>
  );
}
