import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadPhotoArchive } from '@/lib/photoExport';
import type { StoredPhoto } from '@/lib/photoStorage';

export function SaveAllPhotos({ photos, packId }: { photos: StoredPhoto[]; packId: string }) {
  const [saving, setSaving] = useState(false);
  return <button
    className="btn-3d btn-go inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 font-extrabold text-ink"
    disabled={saving || photos.length === 0}
    aria-busy={saving}
    onClick={async () => {
      setSaving(true);
      try {
        await downloadPhotoArchive(photos, packId);
        toast.success('Photo ZIP prepared. Check your downloads.');
      } catch {
        toast.error('Could not prepare your photos. Please try again.');
      } finally {
        setSaving(false);
      }
    }}
  >
    {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
    {saving ? 'Preparing photos…' : 'Save all photos'}
  </button>;
}
