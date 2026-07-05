interface StartOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Clear completed challenges only; keep photos. */
  onResetProgress: () => void;
  /** Clear completed challenges AND delete all photos. */
  onResetAll: () => void;
}

/**
 * Two-choice restart dialog shown from the in-hunt header. Each option routes
 * the caller back to path selection (handled by the parent); this component
 * only fires the chosen action and closes.
 */
export function StartOverDialog({ isOpen, onClose, onResetProgress, onResetAll }: StartOverDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div
        className="sticker-card animate-pop-in w-full max-w-md p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-ink">Start Over?</h3>
        <p className="mt-1 font-semibold text-ink/70">
          Pick a fresh path or undo a misclick. Choose how much to clear —
          you'll head back to pick your trail either way.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={() => {
              onResetProgress();
              onClose();
            }}
            className="btn-3d btn-sky w-full rounded-2xl px-4 py-3 text-left font-extrabold text-white"
          >
            <span className="block">Reset progress</span>
            <span className="block text-xs font-bold text-white/80">Clears completed challenges · keeps your photos</span>
          </button>

          <button
            onClick={() => {
              onResetAll();
              onClose();
            }}
            className="btn-3d btn-coral w-full rounded-2xl px-4 py-3 text-left font-extrabold text-white"
          >
            <span className="block">Start fresh</span>
            <span className="block text-xs font-bold text-white/80">Clears progress AND deletes all photos</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mx-auto mt-4 block rounded-full px-4 py-2 text-sm font-extrabold text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          Keep Hunting
        </button>
      </div>
    </div>
  );
}
