import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, CloudUpload, Loader2, RefreshCw } from 'lucide-react';
import type { EventHunt } from '@/lib/eventHunt';
import { usePhotoAutoSend } from '@/hooks/usePhotoAutoSend';

export const AUTO_SEND_LABEL = 'Send photos as we go';

/**
 * The on/off switch used everywhere auto-send is chosen (wizard, event
 * settings, join screen, hunt). Pass `labelledBy` when a visible label sits
 * next to it, or `label` for an accessible name on its own.
 */
export function AutoSendSwitch({ checked, onChange, disabled, labelledBy, describedBy, label, size = 'md' }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'h-7 w-12' : 'h-8 w-14';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const on = size === 'sm' ? 'translate-x-[1.45rem]' : 'translate-x-[1.6rem]';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label ?? AUTO_SEND_LABEL}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${track} flex-shrink-0 items-center rounded-full border-2 border-ink transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60 ${checked ? 'bg-go' : 'bg-white'}`}
    >
      <span className={`absolute ${knob} rounded-full border-2 border-ink bg-cream transition-transform ${checked ? on : 'translate-x-1'}`} />
    </button>
  );
}

type Status = { tone: 'idle' | 'ok' | 'busy' | 'wait' | 'error'; text: string };

function statusOf(state: { ready: boolean; enabled: boolean; pending: number; uploading: boolean; error: string | null }, action: 'switching' | 'retrying' | null): Status {
  if (action === 'switching') return { tone: 'busy', text: state.enabled ? 'Turning off…' : 'Turning on…' };
  if (action === 'retrying') return { tone: 'busy', text: 'Retrying…' };
  // An error (including a failed first load) is shown as it is, never as "Checking…".
  if (state.error) return { tone: 'error', text: state.error };
  if (!state.ready) return { tone: 'busy', text: 'Checking…' };
  if (!state.enabled) return state.pending > 0 ? {tone:'wait',text:`Off · ${state.pending} removal${state.pending===1?'':'s'} waiting`} : { tone: 'idle', text: 'Off' };
  const waiting = `${state.pending} ${state.pending === 1 ? 'change' : 'changes'}`;
  if (state.uploading) return { tone: 'busy', text: state.pending > 1 ? `Sending… ${waiting} left` : 'Sending…' };
  if (state.pending > 0) return { tone: 'wait', text: `${waiting} waiting to send` };
  return { tone: 'ok', text: 'On · all caught up' };
}

const TONE: Record<Status['tone'], string> = {
  idle: 'bg-cream text-ink/75',
  ok: 'bg-go-soft text-ink',
  busy: 'bg-sky-soft text-ink',
  wait: 'bg-sun-soft text-ink',
  error: 'bg-coral-soft text-ink',
};

function StatusIcon({ tone }: { tone: Status['tone'] }) {
  if (tone === 'busy') return <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" strokeWidth={3} aria-hidden="true" />;
  if (tone === 'error') return <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} aria-hidden="true" />;
  if (tone === 'ok') return <Check className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3.5} aria-hidden="true" />;
  return <CloudUpload className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />;
}

/**
 * Live auto-send control for a team's event hunt. The full card explains the
 * rules (pre-hunt instructions, team page); `compact` is a single row for the
 * clue screen. Errors are shown as they are, with Retry, and never block play.
 */
export function PhotoAutoSendControl({ hunt, compact }: { hunt: EventHunt; compact?: boolean }) {
  const state = usePhotoAutoSend(hunt);
  const [switching, setSwitching] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const ids = { label: useId(), status: useId(), hint: useId() };
  const status = statusOf(state, switching ? 'switching' : retrying ? 'retrying' : null);
  const shownError = toggleError ?? state.error;

  const toggle = async (next: boolean) => {
    setSwitching(true);
    setToggleError(null);
    try { await state.setEnabled(next); }
    catch (err) { setToggleError(err instanceof Error && err.message ? err.message : 'Couldn’t change this setting. Try again.'); }
    finally { setSwitching(false); }
  };

  const retry = async () => {
    setRetrying(true);
    setToggleError(null);
    try { await state.retry(); }
    catch (err) { setToggleError(err instanceof Error && err.message ? err.message : 'Still couldn’t send. Try again in a moment.'); }
    finally { setRetrying(false); }
  };

  // Retry is offered for any error, including settings that couldn't be loaded or saved.
  const retryButton = shownError && (
    <button
      type="button"
      onClick={() => void retry()}
      disabled={retrying}
      className="btn-3d btn-white inline-flex min-h-10 flex-shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-extrabold text-ink"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} strokeWidth={3} aria-hidden="true" /> Retry
    </button>
  );

  const switchEl = (
    <AutoSendSwitch
      checked={state.enabled}
      onChange={next => void toggle(next)}
      disabled={!state.ready || switching}
      labelledBy={compact ? undefined : ids.label}
      label={AUTO_SEND_LABEL}
      describedBy={`${ids.status}${compact ? '' : ` ${ids.hint}`}`}
      size={compact ? 'sm' : 'md'}
    />
  );

  if (compact) {
    return (
      <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border-2 border-ink bg-cream px-2.5 py-1.5">
        {switchEl}
        <span aria-hidden="true" className="flex-shrink-0 text-sm font-extrabold">Auto-send</span>
        <span id={ids.status} role="status" className={`inline-flex min-w-0 items-center gap-1 truncate rounded-full px-2 py-0.5 text-xs font-extrabold ${TONE[status.tone]}`}>
          <StatusIcon tone={status.tone} />
          <span className="truncate">{shownError && !switching && !retrying ? 'Error' : status.text}</span>
        </span>
        {retryButton && <span className="ml-auto">{retryButton}</span>}
      </div>
    );
  }

  return (
    <section className="sticker-card p-4" aria-labelledby={ids.label}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sky">
          <CloudUpload className="h-5 w-5 text-ink" strokeWidth={2.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={ids.label} className="font-display text-xl leading-tight">{AUTO_SEND_LABEL}</h2>
          <p id={ids.status} role="status" className={`mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${TONE[status.tone]}`}>
            <StatusIcon tone={status.tone} />
            <span className="min-w-0 break-words">{status.tone === 'error' ? 'Not sending right now' : status.text}</span>
          </p>
        </div>
        {switchEl}
      </div>

      {shownError && (
        <div className="mt-3 flex flex-wrap items-start gap-2 rounded-2xl border-2 border-ink bg-coral-soft p-3 text-sm font-bold">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
          <p className="min-w-0 flex-1 leading-snug">{shownError} Your hunt and photos still work on this phone.</p>
          {retryButton}
        </div>
      )}

      <ul id={ids.hint} className="mt-3 flex flex-col gap-1.5 text-sm font-semibold leading-snug text-ink/75">
        {state.enabled ? (
          <>
            <Hint>New photos go to your leader as you take them, while this app is open. Deleting or retaking one updates your leader’s copy too. Removing a photo from the event never deletes it from this phone.</Hint>
            <Hint>Photos taken before you turned this on aren’t sent automatically. You can still send them yourself.</Hint>
            {/* Pending includes deletions, which still finish after turning off, so no count here. */}
            <Hint>Turning off stops new sends and cancels photos still waiting. A photo already sending may finish, and deletions made while this was on still reach your leader. Photos already sent stay with your leader.</Hint>
          </>
        ) : (
          <>
            <Hint>Off: you choose which photos to send from the event page.</Hint>
            <Hint>Turn on to send each new photo as you take it, while this app is open. It uses mobile data.</Hint>
          </>
        )}
      </ul>
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink/45" />
      <span>{children}</span>
    </li>
  );
}

/** Leader-side default for new teams (create wizard and Edit event). */
export function AutoSendDefaultField({ checked, onChange, scope }: { checked: boolean; onChange: (checked: boolean) => void; scope: 'create' | 'edit' }) {
  const ids = { label: useId(), hint: useId() };
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-3.5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sky-soft">
          <CloudUpload className="h-5 w-5 text-ink" strokeWidth={2.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p id={ids.label} className="font-extrabold leading-tight">{AUTO_SEND_LABEL}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/60">{scope === 'edit' ? 'Default for new teams' : 'Default for teams'} · {checked ? 'On' : 'Off'}</p>
        </div>
        <AutoSendSwitch checked={checked} onChange={onChange} labelledBy={ids.label} describedBy={ids.hint} />
      </div>
      <p id={ids.hint} className="mt-2 text-sm font-semibold leading-snug text-ink/70">
        {checked
          ? 'Each team’s new photos reach you as they take them, while their app is open, and deleting or retaking one updates your copy. '
          : 'Teams pick which photos to send after they play. '}
        {scope === 'edit'
          ? 'Applies to teams that join from now on. Teams already in keep their own choice.'
          : checked ? 'Each team can turn it off on their phone. It uses their mobile data.' : 'Each team can still turn it on for themselves.'}
      </p>
    </div>
  );
}

/** One-line wording for summaries. */
export function AutoSendSummary({ on }: { on: boolean }) {
  return <>{on ? 'Sent as teams go (teams can turn off)' : 'Teams choose what to send'}</>;
}
