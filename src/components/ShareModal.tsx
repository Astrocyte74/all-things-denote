import { X } from 'lucide-react';
import qrCode from '/qr.png';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div
        className="sticker-card animate-pop-in relative w-full max-w-md p-8"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="btn-3d btn-white absolute -right-3 -top-3 rounded-full p-2 text-ink"
          aria-label="Close share dialog"
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>

        <div className="text-center">
          <h2 className="font-display text-3xl text-ink">Invite a Team!</h2>
          <p className="mt-1 font-semibold text-ink/70">
            Scan the code to join the hunt
          </p>

          <div className="mx-auto mt-6 inline-block rotate-[-2deg] rounded-3xl border-2 border-ink bg-sun p-5 shadow-sticker">
            <img
              src={qrCode}
              alt="Scan to join scavenger hunt"
              className="h-44 w-44 rounded-xl border-2 border-ink bg-white"
            />
          </div>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/30 bg-paper p-4 text-left text-sm text-ink/80">
            <p className="font-extrabold">📱 To scan:</p>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• iPhone: point the Camera app at the code</li>
              <li>• Android: Camera app or Google Lens</li>
            </ul>
            <p className="mt-3 font-extrabold">🔗 Or share this link:</p>
            <p className="break-all font-bold text-sky-edge">https://astrocyte74.github.io/all-things-denote/</p>
          </div>
        </div>
      </div>
    </div>
  );
}
