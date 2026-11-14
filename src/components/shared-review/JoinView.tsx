import { useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Lock, PencilLine, RefreshCw, ShieldCheck, Shuffle } from 'lucide-react';
import { getPackById } from '@/data/packs';
import { cleanTeamName, TEAM_NAME_LIMIT } from '@/lib/teamName';
import { fetchReview, getSavedReviews, joinReview, openReview, type EventAccess, type ReviewSnapshot } from '@/lib/sharedReview';
import { shuffledSuggestions } from '@/lib/eventNames';
import { DEFAULT_TEAM_NAMING, teamNameKey } from '@/lib/teamNaming';
import { describeError, errorStatus, formatExpiry, savedTeamDefaults } from './common';
import { Notice, PackBadge } from './ui';
import { makeEventHunt } from '@/lib/eventHunt';
import { configurePhotoSync } from '@/lib/photoSyncStore';
import { AUTO_SEND_LABEL, AutoSendSwitch } from './PhotoAutoSendControl';

const CHOICE_COUNT = 6;

/** What the team has picked: a name from the list, their own typed name, or nothing yet. */
type Choice = { kind: 'suggested'; name: string } | { kind: 'custom' } | null;

/** Joined on the server, but this phone couldn't store the photo-sending choice yet. */
type Joined = { access: EventAccess; snapshot: ReviewSnapshot; name: string };

/**
 * Invite screen. The leader's naming rules decide what shows: name chips to
 * choose from, or a random name on join, plus an optional "Use my own name".
 * There's no path picker: the server assigns a balanced path.
 */
export function JoinView({ access, snapshot: initial, onJoined }: { access: EventAccess; snapshot: ReviewSnapshot; onJoined: (access: EventAccess, snapshot: ReviewSnapshot) => void }) {
  const [snapshot, setSnapshot] = useState(initial);
  const { event } = snapshot;
  const pack = getPackById(event.packId);
  const naming = event.teamNaming ?? DEFAULT_TEAM_NAMING;
  const options = snapshot.joinOptions;
  // Older events (no join options) keep the plain typed-name form.
  const legacy = !options;
  const available = options?.names ?? [];
  const random = !legacy && naming.assignment === 'random';
  const canType = legacy || naming.allowCustom;
  const full = options?.spotsRemaining === 0;
  // The server replenishes an exhausted pool; an unexpected empty list is retryable.
  const outOfNames = !legacy && !random && available.length === 0;

  const ids = { name: useId(), choices: useId(), status: useId(), autoLabel: useId(), autoHint: useId() };
  const savedTeam = getSavedReviews().find(item => item.access.eventId === event.id && item.access.role === 'team');
  const [showForm, setShowForm] = useState(!savedTeam);
  const [shown, setShown] = useState(() => shuffledSuggestions(available, CHOICE_COUNT));
  const [choice, setChoice] = useState<Choice>(legacy ? { kind: 'custom' } : null);
  const [custom, setCustom] = useState(() => savedTeamDefaults(pack.id).name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const customInput = useRef<HTMLInputElement>(null);
  // Auto-send follows the leader's default (older events: off) until the team
  // flips it; an explicit choice survives refreshes and stale-policy retries.
  const [autoSendChoice, setAutoSendChoice] = useState<boolean | null>(null);
  const autoSend = autoSendChoice ?? (event.autoUploadDefault ?? false);
  const [joined, setJoined] = useState<Joined | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Keep the chips in step with the server's list (after a refresh some may be gone).
  const availableKeys = new Set(available.map(teamNameKey));
  const visible = shown.filter(name => availableKeys.has(teamNameKey(name)));
  const chips = visible.length > 0 ? visible : available.slice(0, CHOICE_COUNT);

  const moreNames = () => {
    // Keep the selected name visible while refreshing the other suggestions.
    const selected = choice?.kind === 'suggested' ? choice.name : null;
    setShown(selected
      ? [selected, ...shuffledSuggestions(available.filter(name => name !== selected), CHOICE_COUNT - 1, chips)]
      : shuffledSuggestions(available, CHOICE_COUNT, chips));
  };

  const useOwnName = () => {
    setChoice({ kind: 'custom' });
    setError(null);
    // The leader asked for this explicitly, so opening the keyboard is expected.
    requestAnimationFrame(() => customInput.current?.focus());
  };

  const refreshOptions = async () => {
    try {
      const fresh = await fetchReview(access);
      setSnapshot(fresh);
      setShown(shuffledSuggestions(fresh.joinOptions?.names ?? [], CHOICE_COUNT));
      return fresh;
    } catch {
      return null;
    }
  };

  const join = async () => {
    if (busyRef.current) return;
    let name = '';
    let source: 'suggested' | 'custom' | 'random';
    if (choice?.kind === 'custom') {
      name = cleanTeamName(custom);
      source = 'custom';
      if (!name) { setError('Type your team name. It’s how the leader will see your photos.'); customInput.current?.focus(); return; }
    } else if (choice?.kind === 'suggested') {
      name = choice.name;
      source = 'suggested';
    } else if (random) {
      source = 'random';
    } else {
      setError(canType ? 'Tap a team name, or use your own.' : 'Tap a team name first.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      // No path: the server balances paths across teams.
      const result = await joinReview(access, name, undefined, source);
      // The team now exists. Whatever happens next, never join again from here.
      const ok = await storeAutoSend(result.access, result.snapshot);
      if (ok) onJoined(result.access, result.snapshot);
      else setJoined({ access: result.access, snapshot: result.snapshot, name: result.snapshot.team?.name ?? name });
      return;
    } catch (err) {
      const status = errorStatus(err);
      if (status === 409 || status === 400) {
        const fresh = await refreshOptions();
        if (fresh?.event.closed || fresh?.joinOptions?.spotsRemaining === 0) {
          setError(null); // Refreshed closed/full notices replace the form.
        } else if (fresh && fresh.event.settingsRevision !== snapshot.event.settingsRevision) {
          setChoice(null);
          setError('Your leader updated the team-name options. Check the new options and join again.');
        } else if (status === 409 && source === 'suggested' && fresh) {
          setChoice(null);
          setError(`“${name}” was just taken by another team. Pick another name.`);
        } else {
          // Preserve typed text and use the server's reason if refreshing failed.
          setError(describeError(err));
          if (source === 'custom') customInput.current?.focus();
        }
      } else {
        setError(describeError(err));
      }
      busyRef.current = false;
      setBusy(false);
    }
  };

  /** Save this phone's auto-send choice for the new team. Returns false if it couldn't be stored. */
  async function storeAutoSend(teamAccess: EventAccess, teamSnapshot: ReviewSnapshot) {
    const hunt = makeEventHunt(teamAccess, teamSnapshot);
    if (!hunt) return true; // Nothing to configure (not a team snapshot); carry on as before.
    try {
      await configurePhotoSync(hunt, autoSend);
      return true;
    } catch (err) {
      setSyncError(err instanceof Error && err.message ? err.message : 'This phone couldn’t save the setting.');
      return false;
    }
  }

  const retrySync = async () => {
    if (!joined || syncBusy) return;
    setSyncBusy(true);
    setSyncError(null);
    const ok = await storeAutoSend(joined.access, joined.snapshot);
    setSyncBusy(false);
    if (ok) onJoined(joined.access, joined.snapshot);
  };

  // One stable label: the chosen name is already highlighted above, and
  // joining drops the team straight into the hunt.
  const buttonLabel = busy ? 'Joining…' : 'Join & start hunt';

  return (
    <div className="mx-auto max-w-xl">
      <div className="sticker-card overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-ink p-4 sm:p-5" style={{ backgroundColor: pack.library.soft }}>
          <PackBadge pack={pack} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink/70">You’re invited</p>
            <h1 className="break-words font-display text-[1.75rem] leading-tight sm:text-3xl">{event.title}</h1>
            <p className="text-sm font-semibold text-ink/70">{pack.title} · Open until {formatExpiry(event.expiresAt)}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {savedTeam && !joined && (
            <div className="mb-4">
              <p className="font-bold">This phone already joined this event.</p>
              <button
                type="button"
                onClick={() => openReview(savedTeam.access)}
                className="btn-3d btn-go mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink"
              >
                Continue as your team <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
              </button>
              {!showForm && !event.closed && (
                <button type="button" onClick={() => setShowForm(true)} className="mx-auto mt-3 block min-h-11 px-3 text-sm font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink">
                  Join as a different team on this phone
                </button>
              )}
            </div>
          )}

          {joined ? (
            <div role="alert" className="rounded-2xl border-2 border-ink bg-sun-soft p-4">
              <p className="flex items-start gap-2 font-display text-xl leading-tight">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
                You’re in as {joined.name}!
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-ink/80">
                This phone couldn’t save your photo-sending choice{syncError ? ` (${syncError})` : ''}. Your team is joined either way, so you won’t lose your spot.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => void retrySync()} disabled={syncBusy} className="btn-3d btn-white inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-extrabold text-ink">
                  {syncBusy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} aria-hidden="true" /> : <RefreshCw className="h-4 w-4" strokeWidth={3} aria-hidden="true" />} Try again
                </button>
                <button type="button" onClick={() => onJoined(joined.access, joined.snapshot)} disabled={syncBusy} className="btn-3d btn-go inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-display text-lg tracking-wide text-ink">
                  Start the hunt <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold text-ink/65">You can turn “{AUTO_SEND_LABEL}” on or off from the hunt at any time.</p>
            </div>
          ) : event.closed ? (
            <Notice tone="warn">
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> The leader has closed this event to new teams and uploads.</span>
            </Notice>
          ) : full ? (
            <Notice tone="warn">This event is full (20-team limit). If your team already joined, use its saved team link.</Notice>
          ) : showForm && (
            <div>
              {savedTeam && <p className="mb-3 text-sm font-semibold text-ink/70">Joining again replaces the saved team on this phone. Photos already sent stay with the old team.</p>}

              {random ? (
                <div className="flex gap-3 rounded-2xl border-2 border-ink bg-sun-soft p-3.5">
                  <Shuffle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
                  <div>
                    <p className="font-display text-xl leading-tight">Your team name is a surprise</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink/75">Your leader is handing out names at random. Tap Join and you’ll see yours, plus your path.</p>
                  </div>
                </div>
              ) : !legacy && (
                <fieldset className="min-w-0">
                  <legend className="font-display text-xl">Pick your team name</legend>
                  {outOfNames ? (
                    <div className="mt-1 text-sm font-semibold text-ink/70"><p>Refresh to see the latest available names.</p><button type="button" onClick={() => void refreshOptions()} className="min-h-11 font-extrabold underline">Refresh names</button></div>
                  ) : (
                    <>
                      <div id={ids.choices} className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Team names">
                        {chips.map(name => {
                          const on = choice?.kind === 'suggested' && teamNameKey(choice.name) === teamNameKey(name);
                          return (
                            <NameRadio key={name} checked={on} onSelect={() => { setChoice({ kind: 'suggested', name }); setError(null); }}>{name}</NameRadio>
                          );
                        })}
                      </div>
                      {available.length > chips.length && (
                        <button type="button" onClick={moreNames} aria-controls={ids.choices} className="mt-2 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-extrabold text-ink/75 underline underline-offset-4 hover:text-ink">
                          <RefreshCw className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> More names
                        </button>
                      )}
                    </>
                  )}
                </fieldset>
              )}

              {canType && (
                <div className="mt-4">
                  {choice?.kind === 'custom' ? (
                    <>
                      <label htmlFor={ids.name} className="flex items-baseline justify-between gap-2 font-display text-xl">
                        {legacy ? 'Team name' : 'Your own name'} <span className="font-body text-sm font-bold text-ink/60">Shown to the leader</span>
                      </label>
                      <input
                        ref={customInput}
                        id={ids.name}
                        value={custom}
                        maxLength={TEAM_NAME_LIMIT}
                        onChange={e => { setCustom(e.target.value); setError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void join(); } }}
                        placeholder="e.g. The Lost Sheep"
                        autoComplete="off"
                        autoCapitalize="words"
                        enterKeyHint="go"
                        className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
                      />
                      {!legacy && (
                        <button type="button" onClick={() => setChoice(null)} className="mt-1 min-h-11 px-1 text-sm font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink">
                          {random ? 'Use a random name instead' : 'Pick from the list instead'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button type="button" onClick={useOwnName} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-dashed border-ink/45 px-3.5 text-sm font-extrabold text-ink hover:border-ink hover:bg-white">
                      <PencilLine className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Use my own name
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-2xl border-2 border-ink bg-white p-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p id={ids.autoLabel} className="font-display text-xl leading-tight">{AUTO_SEND_LABEL}</p>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-ink/60">
                      {autoSend ? 'On' : 'Off'}{autoSendChoice === null && event.autoUploadDefault ? ' · your leader’s suggestion' : ''}
                    </p>
                  </div>
                  <AutoSendSwitch checked={autoSend} onChange={setAutoSendChoice} disabled={busy} labelledBy={ids.autoLabel} describedBy={ids.autoHint} />
                </div>
                <p id={ids.autoHint} className="mt-2 text-sm font-semibold leading-snug text-ink/70">
                  {autoSend
                    ? 'Each new photo goes to your leader as you take it, while this app is open. Deleting or retaking one updates their copy. Uses mobile data.'
                    : 'You’ll choose which photos to send after you play.'}
                  {' '}You can change this during the hunt.
                </p>
              </div>

              <p className="mt-4 flex gap-2 rounded-2xl bg-sky-soft p-3 text-sm font-bold leading-snug">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
                <span>Your path is assigned automatically. Your leader sees your team’s clue progress when you’re online, and {autoSend ? 'the new photos you take' : 'only the photos you choose to send'}.</span>
              </p>

              <div id={ids.status} aria-live="polite">
                {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
              </div>

              <button
                type="button"
                onClick={() => void join()}
                disabled={busy}
                className="btn-3d btn-go mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />}
                <span className="min-w-0 truncate">{buttonLabel}</span>
                {!busy && <ArrowRight className="h-5 w-5 flex-shrink-0" strokeWidth={3} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A chip-styled radio, so the list reads as one choice to screen readers. */
function NameRadio({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: string }) {
  return (
    <label className="max-w-full has-[:focus-visible]:rounded-full has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
      <input type="radio" name="join-team-name" value={children} checked={checked} onChange={onSelect} className="peer sr-only" />
      <span className={`inline-flex min-h-11 max-w-full cursor-pointer items-center rounded-full border-2 border-ink px-3.5 text-sm font-extrabold leading-tight transition-transform ${checked ? '-translate-y-0.5 bg-sun shadow-[2px_2px_0_0_#2E2459]' : 'bg-cream hover:bg-white'}`}>
        <span className="min-w-0 break-words">{children}</span>
      </span>
    </label>
  );
}
