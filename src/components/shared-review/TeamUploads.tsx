import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { EventAccess, ReviewPhoto } from '@/lib/sharedReview';
import { useReviewPhotoUrl } from './common';
import { Notice } from './ui';

export function TeamUploads({ access, photos, busy, onRemove, refresh }: {
  access: EventAccess; photos: ReviewPhoto[]; busy: boolean;
  onRemove: (photos: ReviewPhoto[]) => void; refresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section aria-label="Your uploaded photos" className="sticker-card mb-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl">Your uploaded photos ({photos.length})</h2>
        <button type="button" disabled={busy} onClick={() => void refresh()} aria-label="Refresh uploaded photos" className="btn-3d btn-white flex h-11 w-11 items-center justify-center rounded-full text-ink">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink/70">Delete cloud copies whenever you want, even after uploads close. Originals stay on your devices. Copies someone already downloaded cannot be removed.</p>
      {photos.length > 0 ? <>
        <button type="button" disabled={busy} onClick={() => onRemove(photos)} className="btn-3d btn-coral mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-ink">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete all my uploads
        </button>
        <details className="mt-4" onToggle={event => setExpanded(event.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer py-2 font-extrabold">View uploaded photos</summary>
          {expanded && <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cloud copies">
            {photos.map(photo => <UploadedPhoto key={photo.id} access={access} photo={photo} busy={busy} onRemove={() => onRemove([photo])} />)}
          </ul>}
        </details>
      </> : <p className="mt-3 font-bold text-ink/70">You have no photos stored in this event.</p>}
    </section>
  );
}

function UploadedPhoto({ access, photo, busy, onRemove }: { access: EventAccess; photo: ReviewPhoto; busy: boolean; onRemove: () => void }) {
  const { url, failed } = useReviewPhotoUrl(access, photo.id);
  return <li className="overflow-hidden rounded-2xl border-2 border-ink bg-cream">
    <div className="paper-dots flex aspect-[4/5] items-center justify-center p-2">
      {url ? <img src={url} alt={`Uploaded clue ${photo.challengeNumber}`} className="h-full w-full object-contain" />
        : failed ? <p className="p-2 text-center text-xs font-bold">Preview unavailable. You can still delete this cloud copy.</p>
        : <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading photo" />}
    </div>
    <p className="border-t-2 border-ink/15 px-2.5 py-2 text-xs font-extrabold">#{photo.challengeNumber} {photo.challengeTitle}</p>
    <button type="button" disabled={busy} onClick={onRemove} className="min-h-11 w-full border-t-2 border-ink/15 bg-coral-soft px-2 text-xs font-extrabold">Delete cloud copy</button>
  </li>;
}

export function DeleteUploadsDialog({ photos, busy, error, onClose, onDelete }: {
  photos: ReviewPhoto[] | null; busy: boolean; error: string | null; onClose: () => void; onDelete: () => void;
}) {
  const count = photos?.length ?? 0;
  return <AlertDialog.Root open={photos !== null} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-[75] bg-ink/70" />
      <div className="pointer-events-none fixed inset-0 z-[76] flex items-center justify-center p-4">
        <AlertDialog.Content onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} className="sticker-card pointer-events-auto w-full max-w-md p-5 text-ink sm:p-6">
          <AlertDialog.Title className="font-display text-2xl">{count === 1 ? 'Delete this cloud photo?' : `Delete your ${count} cloud photos?`}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm font-bold leading-snug text-ink/75">Removes these uploads from the event and leader’s review immediately. Originals on your devices stay saved. Copies already downloaded by others cannot be removed.</AlertDialog.Description>
          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" disabled={busy} onClick={onDelete} className="btn-3d btn-coral min-h-12 flex-1 rounded-2xl px-4 font-display text-lg text-ink">{busy ? 'Deleting…' : count === 1 ? 'Delete cloud photo' : 'Delete cloud photos'}</button>
            <AlertDialog.Cancel disabled={busy} className="btn-3d btn-white min-h-12 flex-1 rounded-2xl px-4 font-extrabold text-ink">Cancel</AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </div>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
