import { useId, useState, type ReactNode } from 'react';
import { Info, Plus, Search, Shuffle, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import { DEFAULT_TEAM_NAMING, MAX_NAME_POOL, TEAM_NAME_IDEAS, teamNameKey, type TeamNamingSettings } from '@/lib/teamNaming';
import { cleanTeamName, TEAM_NAME_LIMIT } from '@/lib/teamName';
import { Chip } from './Chip';
import { defaultAllowCustom, isQuickDefault, teamNamingProblem, uniqueNames } from './teamNamingText';

const PREVIEW_COUNT = 16;

/**
 * Step 3 of the create wizard. "Allow all" is the one-tap default; the
 * optional controls (choose vs random, which names, own names) only open
 * when the leader picks Customize.
 */
export function TeamNamingStep({ value, onChange, customPermissionEdited, onCustomPermissionEdited }: { value: TeamNamingSettings; onChange: (value: TeamNamingSettings) => void; customPermissionEdited: boolean; onCustomPermissionEdited: (edited: boolean) => void }) {
  const [customizing, setCustomizing] = useState(() => !isQuickDefault(value));
  const ids = { mode: useId(), how: useId(), pool: useId(), custom: useId(), customHint: useId() };
  const set = (patch: Partial<TeamNamingSettings>) => onChange({ ...value, ...patch });

  const chooseAssignment = (assignment: TeamNamingSettings['assignment']) => {
    if (assignment === value.assignment) return;
    // Own names follow the new mode's default unless the leader changed them.
    set({ assignment, allowCustom: customPermissionEdited ? value.allowCustom : defaultAllowCustom(assignment) });
  };

  return (
    <div>
      <fieldset className="min-w-0">
        <legend id={ids.mode} className="sr-only">Team name setup</legend>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-labelledby={ids.mode}>
          <ModeOption
            checked={!customizing}
            onSelect={() => { setCustomizing(false); onCustomPermissionEdited(false); onChange({ ...DEFAULT_TEAM_NAMING, names: value.names }); }}
            icon={<Sparkles className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />}
            title="Allow all"
            body={`Teams pick from ${TEAM_NAME_IDEAS.length} fun names or type their own.`}
            badge="Quick default"
          />
          <ModeOption
            checked={customizing}
            onSelect={() => setCustomizing(true)}
            icon={<SlidersHorizontal className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />}
            title="Customize"
            body="Random names, your own list, or no typed names."
          />
        </div>
      </fieldset>

      {customizing && (
        <div className="mt-4 flex flex-col gap-5 rounded-2xl border-2 border-dashed border-ink/35 p-3.5 sm:p-4">
          <Segmented
            label="How teams get a name"
            labelId={ids.how}
            value={value.assignment}
            onChange={chooseAssignment}
            options={[
              { value: 'choose', label: 'Teams choose', icon: <Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> },
              { value: 'random', label: 'Random', icon: <Shuffle className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> },
            ]}
            hint={value.assignment === 'choose' ? 'Each team taps a name when they join. No two teams get the same one.' : 'Each team gets a name the moment they join. No two teams get the same one.'}
          />

          <Segmented
            label="Which names"
            labelId={ids.pool}
            value={value.pool}
            onChange={pool => set({ pool })}
            options={[
              { value: 'all', label: 'All standard names' },
              { value: 'selected', label: 'Only names I pick' },
            ]}
          />

          {value.pool === 'selected' && <NamePicker names={value.names} onChange={names => set({ names })} />}

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p id={ids.custom} className="font-extrabold">Teams can type their own name</p>
              <p id={ids.customHint} className="text-sm font-semibold text-ink/65">
                {value.allowCustom
                  ? value.assignment === 'random' ? 'They can swap the random name for one they type.' : 'A “Use my own name” option appears next to the list.'
                  : 'Teams only get names from the list.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={value.allowCustom}
              aria-labelledby={ids.custom}
              aria-describedby={ids.customHint}
              onClick={() => { onCustomPermissionEdited(true); set({ allowCustom: !value.allowCustom }); }}
              className={`relative mt-0.5 inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border-2 border-ink transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink ${value.allowCustom ? 'bg-go' : 'bg-white'}`}
            >
              <span className={`absolute h-5 w-5 rounded-full border-2 border-ink bg-cream transition-transform ${value.allowCustom ? 'translate-x-[1.6rem]' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ModeOption({ checked, onSelect, icon, title, body, badge }: {
  checked: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <label
      className={`relative flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border-2 border-ink p-3 transition-transform has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${checked ? '-translate-y-0.5 bg-sun-soft shadow-[3px_3px_0_0_#2E2459]' : 'bg-cream'}`}
    >
      <input type="radio" name="wiz-naming-mode" checked={checked} onChange={onSelect} className="sr-only" />
      <span aria-hidden="true" className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink ${checked ? 'bg-sun' : 'bg-white'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-xl leading-tight">{title}</span>
          {badge && <span className="rounded-full border-2 border-ink bg-go-soft px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-ink/70">{body}</span>
      </span>
      <span aria-hidden="true" className={`mt-1 h-5 w-5 flex-shrink-0 rounded-full border-2 border-ink ${checked ? 'bg-go' : 'bg-white'}`} />
    </label>
  );
}

function Segmented<T extends string>({ label, labelId, value, onChange, options, hint }: {
  label: string;
  labelId: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  hint?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend id={labelId} className="font-extrabold">{label}</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-2xl border-2 border-ink bg-white p-1" role="radiogroup" aria-labelledby={labelId}>
        {options.map(option => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-center text-sm font-extrabold leading-tight has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ink ${checked ? 'bg-ink text-cream' : 'text-ink/75 hover:bg-paper'}`}
            >
              <input type="radio" name={labelId} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {option.icon}
              {option.label}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-sm font-semibold text-ink/65">{hint}</p>}
    </fieldset>
  );
}

/** Multi-select over the standard names, with search, show-more, and the leader's own additions. */
function NamePicker({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  const ids = { search: useId(), add: useId(), list: useId(), count: useId() };
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const picked = uniqueNames(names);
  const pickedKeys = new Set(picked.map(teamNameKey));
  const full = picked.length >= MAX_NAME_POOL;
  const standardKeys = new Set(TEAM_NAME_IDEAS.map(teamNameKey));
  const ownNames = picked.filter(name => !standardKeys.has(teamNameKey(name)));
  const q = teamNameKey(query);
  const matches = TEAM_NAME_IDEAS.filter(name => !q || teamNameKey(name).includes(q));
  const visible = q || showAll ? matches : matches.slice(0, PREVIEW_COUNT);
  const problem = teamNamingProblem({ ...DEFAULT_TEAM_NAMING, pool: 'selected', names });

  const toggle = (name: string) => {
    const key = teamNameKey(name);
    if (pickedKeys.has(key)) onChange(picked.filter(n => teamNameKey(n) !== key));
    else if (!full) onChange([...picked, name]);
  };

  const add = () => {
    const clean = cleanTeamName(draft);
    if (!clean) return;
    const key = teamNameKey(clean);
    if (pickedKeys.has(key)) { setAddError(`“${clean}” is already on your list.`); return; }
    if (full) { setAddError(`Your list can hold up to ${MAX_NAME_POOL} names.`); return; }
    // A typed name that matches a standard one uses the standard spelling.
    const standard = TEAM_NAME_IDEAS.find(n => teamNameKey(n) === key);
    onChange([...picked, standard ?? clean]);
    setDraft('');
    setAddError(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p id={ids.count} className="text-sm font-extrabold" aria-live="polite">
          {picked.length} picked <span className="font-semibold text-ink/60">· up to {MAX_NAME_POOL}</span>
        </p>
        {picked.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="min-h-11 px-2 text-sm font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink">
            Clear list
          </button>
        )}
      </div>

      {ownNames.length > 0 && (
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink/60">Your names</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {ownNames.map(name => (
              <li key={teamNameKey(name)}>
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-sun px-3.5 text-left text-sm font-extrabold leading-tight shadow-[2px_2px_0_0_#2E2459]"
                  aria-label={`Remove ${name}`}
                >
                  <span className="min-w-0 break-words">{name}</span>
                  <X className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3.5} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor={ids.add} className="text-sm font-extrabold">Add your own name</label>
        <div className="mt-1 flex gap-2">
          <input
            id={ids.add}
            value={draft}
            maxLength={TEAM_NAME_LIMIT}
            onChange={e => { setDraft(e.target.value); setAddError(null); }}
            // Enter adds to the list; it never creates the event.
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="e.g. Room 12 Rockets"
            className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-ink bg-white px-3 font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
          />
          <button type="button" onClick={add} disabled={!cleanTeamName(draft) || full} className="btn-3d btn-white inline-flex min-h-11 flex-shrink-0 items-center gap-1 rounded-xl px-3 font-extrabold text-ink">
            <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Add
          </button>
        </div>
        {addError && <p role="alert" className="mt-1 text-sm font-bold text-ink">{addError}</p>}
      </div>

      <div>
        <label htmlFor={ids.search} className="text-sm font-extrabold">Standard names</label>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" strokeWidth={2.75} aria-hidden="true" />
          <input
            id={ids.search}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Search names"
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border-2 border-ink bg-white pl-9 pr-3 font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
          />
        </div>
        <ul id={ids.list} className="mt-2 flex flex-wrap gap-2" aria-label="Standard team names" aria-describedby={ids.count}>
          {visible.map(name => {
            const on = pickedKeys.has(teamNameKey(name));
            return (
              <li key={name} className="max-w-full">
                <Chip pressed={on} disabled={!on && full} onClick={() => toggle(name)}>{name}</Chip>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 && <p className="mt-2 text-sm font-semibold text-ink/65">No standard names match. Add it as your own above.</p>}
        {!q && matches.length > PREVIEW_COUNT && (
          <button type="button" onClick={() => setShowAll(v => !v)} aria-controls={ids.list} aria-expanded={showAll} className="mt-2 min-h-11 px-1 text-sm font-extrabold text-ink/75 underline underline-offset-4 hover:text-ink">
            {showAll ? 'Show fewer' : `Show all ${matches.length}`}
          </button>
        )}
      </div>

      {problem && <p id="wiz-naming-problem" role="status" className="rounded-xl bg-coral-soft p-2.5 text-sm font-bold">{problem}</p>}
      <p className="flex gap-2 rounded-xl bg-sky-soft p-2.5 text-sm font-semibold leading-snug">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
        <span>Running short is fine: if more teams join than your list has names, unused names from the standard list are added automatically.</span>
      </p>
    </div>
  );
}
