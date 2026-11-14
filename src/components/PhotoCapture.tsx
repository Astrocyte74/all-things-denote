import { useRef, useState } from 'react';
import { Camera, LoaderCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { savePhoto, type StoredPhoto } from '@/lib/photoStorage';
import { processPhoto } from '@/lib/processPhoto';
import { beginPhotoSave } from '@/lib/pwa';
import type { Category, Challenge } from '@/types';

interface PhotoCaptureProps {
  challenge: Challenge;
  category: Category;
  onCaptureComplete?: (challengeId: string) => void;
  onPhotoSaved?: () => void | Promise<void>; // Callback when photo is saved to gallery
  variant?: 'default' | 'display';
  pathId?: string;
  /** Pack id, stamped on the saved photo so it stays scoped to its game. */
  packId?: string;
  /** Draw attention to the button (focus mode, challenge not yet complete) */
  pulse?: boolean;
};

export function PhotoCapture({ challenge, category, onCaptureComplete, onPhotoSaved, variant = 'default', pathId, packId, pulse = false }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const pendingPhoto = useRef<StoredPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const capture = async (file: File) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    const endSave = beginPhotoSave();
    let photo: StoredPhoto;
    try {
      // Retain the same ID and processed image on retry, so a retry is idempotent.
      photo = pendingPhoto.current ?? {
        id: `${challenge.id}-${crypto.randomUUID()}`,
        challengeId: challenge.id,
        challengeNumber: challenge.number,
        challengeTitle: challenge.title,
        categoryId: category.id,
        categoryTitle: category.title,
        categoryIcon: category.icon,
        categoryColor: category.color,
        pathId, packId,
        imageData: await processPhoto(file, challenge, category, pathId),
        timestamp: Date.now(),
      };
      pendingPhoto.current = photo;
      await savePhoto(photo);
    } catch (cause) {
      console.error('Photo save failed:', cause);
      const message = cause instanceof DOMException && cause.name === 'QuotaExceededError'
        ? 'Your device is out of storage. Save your gallery, free some space, then retry.'
        : 'Photo not saved. Keep this screen open and retry, or choose another photo.';
      setError(message);
      setRetryFile(file);
      setSaving(false);
      busy.current = false;
      endSave();
      return;
    }

    pendingPhoto.current = null;
    setRetryFile(null);
    try {
      onCaptureComplete?.(photo.challengeId);
      await onPhotoSaved?.();
      toast.success('Photo saved on this device');
    } catch (cause) {
      // The image is already committed. Never suggest re-saving it for a UI error.
      console.error('Photo saved, but refresh failed:', cause);
      toast.error('Photo saved. Reopen the hunt to refresh your progress.');
    } finally {
      setSaving(false);
      busy.current = false;
      endSave();
    }
  };

  const Icon = saving ? LoaderCircle : retryFile ? RotateCcw : Camera;
  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            pendingPhoto.current = null;
            void capture(file);
          }
        }}
        className="hidden"
        aria-label="Take photo"
        disabled={saving}
      />
      <button
        onClick={() => retryFile ? void capture(retryFile) : fileInputRef.current?.click()}
        disabled={saving}
        aria-busy={saving}
        className={variant === 'display'
          ? `btn-3d btn-go rounded-full p-6 text-ink ${pulse && !saving && !error ? 'animate-pulse-ring' : ''}`
          : 'btn-3d btn-sky rounded-xl p-2 text-ink'}
        aria-label={saving ? 'Saving photo' : retryFile ? 'Retry saving photo' : 'Take photo for this challenge'}
      >
        <Icon className={`${variant === 'display' ? 'h-10 w-10' : 'h-5 w-5'} ${saving ? 'animate-spin' : ''}`} strokeWidth={2.5} />
      </button>
      {saving && <span role="status" className="text-sm font-bold text-ink">Saving…</span>}
      {error && <div role="alert" className="max-w-40 text-center text-xs font-bold text-ink">
        <p>{error}</p>
        <button disabled={saving} onClick={() => fileInputRef.current?.click()} className="min-h-11 underline">Choose another photo</button>
      </div>}
    </div>
  );
}
