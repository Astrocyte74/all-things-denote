import { X } from 'lucide-react';
import type { EventHunt } from '@/lib/eventHunt';
import { HuntInvite } from './HuntInvite';

interface ShareModalProps {
  isOpen: boolean;
  hunt?: EventHunt | null;
  onClose: () => void;
}

export function ShareModal({ hunt, isOpen, onClose }: ShareModalProps) {
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
          <h2 className="font-display text-3xl text-ink">{hunt ? 'Invite another team' : 'Share the game library'}</h2>
          <HuntInvite hunt={hunt} />
        </div>
      </div>
    </div>
  );
}
