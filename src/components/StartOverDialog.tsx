import { useEffect, useRef, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Trash2 } from 'lucide-react';

interface StartOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Clear completed challenges only; keep photos, team name and path. */
  onResetProgress: () => void | Promise<void>;
  /** Delete this game's photos, progress, team name and path. */
  onResetAll: () => Promise<void>;
  /** The game being reset, named in the copy ("Start over Christmas?"). */
  gameTitle?: string;
  eventTeam?: string;
}

type Busy = null | 'progress' | 'all';

/**
 * Per-game restart dialog, shared by the library, the hunt header and the
 * finish screen. It never closes itself on failure: the action runs, and only
 * a successful promise closes the dialog. While an action runs, Escape and
 * Cancel are disabled so a half-finished delete can't be dismissed.
 */
export function StartOverDialog({ isOpen, onClose, onResetProgress, onResetAll, gameTitle, eventTeam }: StartOverDialogProps) {
  const [busy, setBusy] = useState<Busy>(null);

  return (
    <AlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[75] bg-ink/70" />
        <div className="pointer-events-none fixed inset-0 z-[76] flex items-center justify-center p-4">
          <AlertDialog.Content
            aria-busy={busy !== null}
            onEscapeKeyDown={(e) => {
              if (busy) e.preventDefault();
            }}
            className="sticker-card animate-pop-in pointer-events-auto max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto p-5 text-left text-ink sm:p-6"
          >
            {/* Body unmounts on close, so its step/error state resets each open. */}
            <DialogBody
              gameTitle={gameTitle}
              eventTeam={eventTeam}
              busy={busy}
              setBusy={setBusy}
              onClose={onClose}
              onResetProgress={onResetProgress}
              onResetAll={onResetAll}
            />
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

interface DialogBodyProps extends Omit<StartOverDialogProps, 'isOpen'> {
  busy: Busy;
  setBusy: (busy: Busy) => void;
}

function DialogBody({ gameTitle, eventTeam, busy, setBusy, onClose, onResetProgress, onResetAll }: DialogBodyProps) {
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  const [error, setError] = useState<string | null>(null);
  const warningRef = useRef<HTMLHeadingElement>(null);
  const freshRef = useRef<HTMLButtonElement>(null);
  const game = gameTitle?.trim() || 'this game';

  // Move focus with the step so keyboard and screen-reader users land on the
  // warning (confirm) or back on the option they came from (choose).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step === 'confirm') warningRef.current?.focus();
    else freshRef.current?.focus();
  }, [step]);

  const run = async (kind: Exclude<Busy, null>, action: () => void | Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await action();
      setBusy(null);
      onClose();
    } catch (err) {
      console.error('Start over failed', err);
      setBusy(null);
      setError(
        kind === 'all'
          ? `Couldn't finish clearing ${game}. Some photos may still be saved. Please try again.`
          : `Couldn't reset progress for ${game}. Please try again.`,
      );
    }
  };

  return (
    <>
      <AlertDialog.Title className="font-display text-2xl leading-tight sm:text-[1.7rem]">
        {gameTitle ? `Start over ${gameTitle}?` : 'Start over?'}
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-1.5 font-semibold text-ink/75">
        This only changes <strong className="font-extrabold text-ink">{game}{eventTeam ? ` for ${eventTeam}` : " on this device"}</strong>. {eventTeam ? 'Your other hunts stay as they are. With auto-send on, clearing photos also removes their cloud copies when connected.' : 'Your other hunts and cloud uploads stay as they are.'}
      </AlertDialog.Description>

      {step === 'choose' ? (
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('progress', onResetProgress)}
            className="btn-3d btn-sky flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-ink"
          >
            {busy === 'progress' ? (
              <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin" strokeWidth={3} aria-hidden="true" />
            ) : (
              <RotateCcw className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
            )}
            <span>
              <span className="block font-display text-lg tracking-wide">
                {busy === 'progress' ? 'Resetting…' : 'Reset progress'}
              </span>
              <span className="block text-sm font-bold leading-snug">
                Clears checkmarks. Keeps your photos, team name and path.
              </span>
            </span>
          </button>

          <button
            ref={freshRef}
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setStep('confirm');
            }}
            className="btn-3d btn-white flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-ink"
          >
            <Trash2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-coral-edge" strokeWidth={3} aria-hidden="true" />
            <span>
              <span className="block font-display text-lg tracking-wide">Start fresh…</span>
              <span className="block text-sm font-bold leading-snug text-ink/75">
                {eventTeam ? "Deletes this team hunt’s local photos and progress. Keeps your event, team name and path." : "Deletes this local game’s photos, progress, team name and path."}
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-2xl border-2 border-ink bg-coral-soft p-4">
            <h3
              ref={warningRef}
              tabIndex={-1}
              className="flex items-center gap-2 font-display text-xl focus:outline-none"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-coral-edge" strokeWidth={3} aria-hidden="true" />
              This can&rsquo;t be undone
            </h3>
            <p className="mt-1.5 text-sm font-bold leading-snug">
              {eventTeam ? `The local photos and progress for ${eventTeam} in this event will be deleted. Your event, team name and path stay set up.` : `The photos from this local ${game} hunt will be deleted, along with its progress, team name and path.`}
            </p>
            {eventTeam && <p className="mt-2 text-sm font-bold leading-snug">If “Send photos as we go” is on, these photos are also removed from the event when connected. Reset progress alone keeps all photos.</p>}
            <p className="mt-2 text-sm font-bold leading-snug">
              Want to keep the photos? Cancel, then save them from this game&rsquo;s photo gallery first.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run('all', onResetAll)}
              className="btn-3d btn-coral inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 font-display text-lg tracking-wide text-ink"
            >
              {busy === 'all' ? (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Trash2 className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
              )}
              {busy === 'all' ? 'Deleting…' : 'Delete & start fresh'}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setError(null);
                setStep('choose');
              }}
              className="btn-3d btn-white inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 font-extrabold text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              Back
            </button>
          </div>
        </div>
      )}

      {/* Busy announcement for screen readers (buttons change text too). */}
      <p role="status" className="sr-only">
        {busy === 'all' ? `Deleting ${game} photos and progress…` : busy === 'progress' ? `Resetting ${game} progress…` : ''}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-coral-edge bg-coral-soft px-3 py-2 text-sm font-bold text-ink">
          {error}
        </p>
      )}

      <AlertDialog.Cancel
        disabled={busy !== null}
        className="mx-auto mt-4 block min-h-11 rounded-full px-5 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </AlertDialog.Cancel>
    </>
  );
}
