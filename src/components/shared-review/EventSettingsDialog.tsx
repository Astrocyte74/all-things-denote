import { useId, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Link2, Loader2, Lock, X } from 'lucide-react';
import type { GamePack } from '@/types';
import { updateReviewSettings, type EventAccess, type ReviewEvent, type ReviewSnapshot } from '@/lib/sharedReview';
import { DEFAULT_TEAM_NAMING, type TeamNamingSettings } from '@/lib/teamNaming';
import { describeError, errorStatus, notify } from './common';
import { Notice } from './ui';
import { TeamNamingStep } from './TeamNamingStep';
import { AutoSendDefaultField } from './PhotoAutoSendControl';
import { defaultAllowCustom, describeTeamNaming, normalizedTeamNaming, teamNamingProblem } from './teamNamingText';

const TITLE_LIMIT = 60;

interface EventSettingsDialogProps {
  access: EventAccess;
  /** The live event from the latest snapshot (polling keeps it fresh). */
  event: ReviewEvent;
  pack: GamePack;
  onClose: () => void;
  onSaved: (snapshot: ReviewSnapshot) => void;
  /** Re-fetch the leader snapshot (used after a revision conflict). */
  refresh: () => Promise<void>;
}

interface Draft { title: string; naming: TeamNamingSettings; customEdited: boolean; autoUpload: boolean }
type Settings = { title: string; naming: TeamNamingSettings; autoUpload: boolean };

const revisionOf = (event: ReviewEvent) => event.settingsRevision ?? 0;
const namingOf = (event: ReviewEvent) => event.teamNaming ?? DEFAULT_TEAM_NAMING;
// Older events have no default; they stay off until a leader turns it on here.
const autoUploadOf = (event: ReviewEvent) => event.autoUploadDefault ?? false;
const settingsOf = (event: ReviewEvent): Settings => ({ title: event.title, naming: namingOf(event), autoUpload: autoUploadOf(event) });
const draftFrom = (event: ReviewEvent): Draft => {
  const naming = namingOf(event);
  // An own-name setting that differs from its mode's default was a deliberate choice.
  return { title: event.title, naming, customEdited: naming.allowCustom !== defaultAllowCustom(naming.assignment), autoUpload: autoUploadOf(event) };
};
const sameSettings = (a: Settings, b: Settings) =>
  a.title.replace(/\s+/g, ' ').trim() === b.title.replace(/\s+/g, ' ').trim()
  && a.autoUpload === b.autoUpload
  && JSON.stringify(normalizedTeamNaming(a.naming)) === JSON.stringify(normalizedTeamNaming(b.naming));

/**
 * Edit the event name and team-name rules after creation. The draft is
 * taken once when the dialog opens; polling updates the live `event` but
 * never resets the draft. Saves carry the revision the draft was based on,
 * so a stale leader can't silently overwrite someone else's newer edit.
 */
export function EventSettingsDialog({ access, event, pack, onClose, onSaved, refresh }: EventSettingsDialogProps) {
  const ids = { title: useId(), desc: useId() };
  const [draft, setDraft] = useState<Draft>(() => draftFrom(event));
  // The settings this draft started from (changes when the leader resolves a conflict).
  const [base, setBase] = useState(() => ({ revision: revisionOf(event), ...settingsOf(event) }));
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictReported, setConflictReported] = useState(false);
  const busyRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const latestRevision = revisionOf(event);
  // Someone else saved since this draft was taken: from a 409 or from polling.
  const stale = latestRevision !== base.revision;
  const cleanTitle = draft.title.replace(/\s+/g, ' ').trim();
  const dirty = !sameSettings(draft, base);
  const problem = !cleanTitle ? 'Give your event a name.' : teamNamingProblem(draft.naming);

  const useLatest = () => {
    setDraft(draftFrom(event));
    setBase({ revision: latestRevision, ...settingsOf(event) });
    setFormKey(k => k + 1); // remount the naming controls so their open/closed state matches
    setError(null);
    setConflictReported(false);
    heading.current?.focus();
  };

  const keepMine = () => {
    // Rebase onto the latest revision; the next Save replaces their changes, by choice.
    setBase(current => ({ ...current, revision: latestRevision }));
    setError(null);
    setConflictReported(false);
  };

  const loadLatest = async () => {
    setConflictLoading(true);
    try { await refresh(); } finally { setConflictLoading(false); }
  };

  const save = async () => {
    if (busyRef.current || stale || problem) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await updateReviewSettings(access, { title: cleanTitle, teamNaming: normalizedTeamNaming(draft.naming), settingsRevision: base.revision, autoUploadDefault: draft.autoUpload });
      onSaved(snapshot);
      notify.success('Event updated');
      onClose();
    } catch (err) {
      if (errorStatus(err) === 409) {
        // Another leader saved first. Fetch their version; keep this draft until the leader decides.
        setConflictReported(true);
        await loadLatest();
      } else {
        setError(`${describeError(err)} Your changes are still here; press Save to retry.`);
      }
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !busyRef.current) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/70" />
        <Dialog.Content
          aria-describedby={ids.desc}
          onOpenAutoFocus={e => { e.preventDefault(); heading.current?.focus(); }}
          // LeaderView puts focus back on the button that opened the dialog.
          onCloseAutoFocus={e => e.preventDefault()}
          // A stray tap outside shouldn't throw away edits; Cancel and Escape still close.
          onPointerDownOutside={e => { if (dirty || busyRef.current) e.preventDefault(); }}
          onEscapeKeyDown={e => { if (busyRef.current) e.preventDefault(); }}
          className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl border-2 border-b-0 border-ink bg-cream text-ink shadow-[0_-4px_0_0_#2E2459] focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,52rem)] sm:w-[min(38rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border-b-2 sm:shadow-[6px_6px_0_0_#2E2459]"
        >
          <div className="flex items-start gap-3 border-b-2 border-ink p-4 sm:px-6" style={{ backgroundColor: pack.library.soft }}>
            <div className="min-w-0 flex-1">
              <Dialog.Title ref={heading} tabIndex={-1} className="font-display text-[1.7rem] leading-tight focus:outline-none">Edit event</Dialog.Title>
              <p id={ids.desc} className="mt-0.5 text-sm font-semibold text-ink/70">Change the name, and the team-name and photo defaults for new teams.</p>
            </div>
            <Dialog.Close disabled={busy} aria-label="Close without saving" className="btn-3d btn-white flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink">
              <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-6">
            {stale && (
              <div className="mb-4 rounded-2xl border-2 border-ink bg-sun-soft p-3.5" role="alert">
                <p className="flex items-start gap-2 font-extrabold leading-snug">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
                  Another leader changed these settings while you were editing.
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ink/75">
                  Their version: <strong className="text-ink">“{event.title}”</strong> · {describeTeamNaming(namingOf(event))} · photos sent as teams go {autoUploadOf(event) ? 'on' : 'off'}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink/75">Your edits are kept below until you choose.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={useLatest} className="btn-3d btn-sun inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-3 text-sm font-extrabold text-ink">
                    Load their latest settings
                  </button>
                  <button type="button" onClick={keepMine} className="btn-3d btn-white inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-3 text-sm font-extrabold text-ink">
                    Keep mine (Save replaces theirs)
                  </button>
                </div>
              </div>
            )}
            {conflictReported && !stale && (
              <div className="mb-4">
                <Notice
                  tone="warn"
                  action={(
                    <button type="button" onClick={() => void loadLatest()} disabled={conflictLoading} className="btn-3d btn-white inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold">
                      {conflictLoading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} aria-hidden="true" />} Try again
                    </button>
                  )}
                >
                  Another leader changed these settings, but the latest version couldn’t be loaded. Your edits are kept.
                </Notice>
              </div>
            )}

            <label htmlFor={ids.title} className="block font-extrabold">Event name</label>
            <input
              id={ids.title}
              value={draft.title}
              maxLength={TITLE_LIMIT}
              onChange={e => { setDraft(d => ({ ...d, title: e.target.value })); setError(null); }}
              // Enter never saves; Save is always an explicit tap.
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
              autoComplete="off"
              aria-invalid={!cleanTitle}
              className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
            />
            <p className="mt-1 text-xs font-semibold text-ink/60">Teams see the new name the next time their screen updates.</p>

            <ul className="mt-4 flex flex-col gap-1.5 rounded-2xl border-2 border-ink/15 bg-white/60 p-3 text-sm font-semibold text-ink/75">
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
                <span><strong className="text-ink">{pack.title}</strong> stays the game. It can’t change after the event is created.</span>
              </li>
              <li className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} aria-hidden="true" />
                <span>The QR code, invite and leader links, and end date stay the same.</span>
              </li>
            </ul>

            <h3 className="mt-5 font-display text-2xl">Team names</h3>
            <p className="mb-3 mt-0.5 text-sm font-semibold text-ink/70">
              Applies to teams that join from now on. Teams already in keep their names, paths and photos.
            </p>
            <TeamNamingStep
              key={formKey}
              value={draft.naming}
              onChange={naming => { setDraft(d => ({ ...d, naming })); setError(null); }}
              customPermissionEdited={draft.customEdited}
              onCustomPermissionEdited={customEdited => setDraft(d => ({ ...d, customEdited }))}
            />

            <h3 className="mt-6 font-display text-2xl">Photos</h3>
            <div className="mt-2">
              <AutoSendDefaultField checked={draft.autoUpload} onChange={autoUpload => { setDraft(d => ({ ...d, autoUpload })); setError(null); }} scope="edit" />
            </div>

            {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
          </div>

          <div className="flex items-center gap-3 border-t-2 border-ink bg-cream p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-3xl sm:px-6">
            <p className="hidden min-w-0 flex-1 text-xs font-semibold text-ink/60 sm:block" aria-live="polite">
              {stale ? 'Choose a version above first.' : problem ?? (dirty ? 'Unsaved changes' : 'No changes yet')}
            </p>
            <Dialog.Close disabled={busy} className="btn-3d btn-white inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 font-extrabold text-ink sm:flex-none">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || stale || Boolean(problem) || !dirty}
              className="btn-3d btn-go inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-2xl px-5 font-display text-lg tracking-wide text-ink sm:flex-none"
            >
              {busy && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />}
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
