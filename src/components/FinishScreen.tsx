import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllPhotos, type StoredPhoto } from '@/lib/photoStorage';
import { getPackById } from '@/data/packs';
import { PhotoGallery } from './PhotoGallery';
import { SaveAllPhotos } from './SaveAllPhotos';
import { StickerArt } from './StickerArt';
import { ConfettiBurst } from './ConfettiBurst';
import { RotateCcw, Users } from 'lucide-react';

interface FinishScreenProps {
  huntId?: string;
  packId: string;
  pathId: string;
  total: number;
  onReview: () => void;
  onPhotosChanged: () => Promise<void>;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  /** Opens the per-game Start over dialog (secondary action). */
  onReset?: () => void;
  /** Optional team name, shown beside the path. */
  teamName?: string;
  /** Opens shared review for this game (compare with other teams). */
  onShareWithEvent?: () => void;
}

export function FinishScreen({ packId, huntId, pathId, total, onReview, onPhotosChanged, galleryOpen, setGalleryOpen, onReset, teamName, onShareWithEvent }: FinishScreenProps) {
  const team = teamName?.trim();
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pack = getPackById(packId);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPhotos((await getAllPhotos(packId, huntId ?? null)).sort((a, b) => a.challengeNumber - b.challengeNumber));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [packId, huntId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return <>
    <section className={`paper-dots relative px-4 pb-12 text-ink ${huntId ? "pt-40" : "pt-28"}`}>
      <ConfettiBurst burstKey={1} />
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <StickerArt name={pack.mascotArt} emoji={pack.mascotEmoji} alt="" className="mx-auto h-28 w-28" />
          <p className="mt-4 font-extrabold">{[pack.title, team, `Path ${pathId}`].filter(Boolean).join(' · ')}</p>
          <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-5xl focus:outline-none">Hunt complete!</h1>
          <p className="mt-3 text-lg font-bold">You finished all {total} clues. Time to share what you found.</p>
        </div>

        <div className="sticker-card mt-8 bg-sun-soft p-6">
          <h2 className="font-display text-2xl">One photo, one discovery</h2>
          <p className="mt-2 font-semibold">{pack.discussionPrompt ?? 'Choose a favorite photo. What does it teach you about God, and how could you put that lesson into practice this week?'}</p>
          <p className="mt-3 text-sm font-bold text-ink/70">Take turns sharing.{pack.bonusItems.length > 0 && ' Your gospel connections and bonus discoveries are unlocked below.'}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl">Your team’s photos {loading ? '' : `(${photos.length})`}</h2>
          <SaveAllPhotos photos={photos} packId={packId} />
        </div>
        <p className="mt-2 text-sm font-semibold text-ink/70">Save one ZIP containing this hunt’s labeled photos. Photos stay on this device until you save or share them.</p>
        {loading ? <p role="status" className="py-8 text-center">Loading your photos…</p>
          : error ? <div role="alert" className="py-8 text-center">Could not load your photos. <button onClick={() => void load()} className="min-h-11 px-3 font-bold underline">Retry</button></div>
          : photos.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map(photo => <button key={photo.id} onClick={() => setGalleryOpen(true)} className="overflow-hidden rounded-2xl border-2 border-ink bg-white text-left shadow-sticker-sm" aria-label={`View photo for ${photo.challengeTitle}`}>
              <img src={photo.imageData} alt={photo.challengeTitle} loading="lazy" className="aspect-square w-full object-cover" />
              <span className="block p-3 text-sm font-extrabold">#{photo.challengeNumber} {photo.challengeTitle}</span>
            </button>)}
          </div> : <p className="my-6 rounded-2xl border-2 border-dashed border-ink/30 p-6 text-center font-semibold">You completed the hunt without photos. You can still revisit a clue and capture a favorite discovery.</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={onReview} className="btn-3d btn-sky rounded-full px-6 py-3 font-bold text-ink">Review clues & connections</button>
          {photos.length > 0 && <button onClick={() => setGalleryOpen(true)} className="btn-3d btn-white rounded-full px-6 py-3 font-bold text-ink">Open photo gallery</button>}
        </div>
        {onShareWithEvent && <div className="sticker-card mt-8 flex flex-col items-start gap-3 bg-sky-soft p-5 sm:flex-row sm:items-center">
          <span aria-hidden="true" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-sky shadow-sticker-sm"><Users className="h-6 w-6" strokeWidth={2.5} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl">Compare with other teams</h2>
            <p className="text-sm font-semibold text-ink/75">Send the photos you choose to your leader’s private event, or start one, and see every team’s discovery clue by clue.</p>
          </div>
          <button onClick={onShareWithEvent} className="btn-3d btn-sky inline-flex min-h-12 flex-shrink-0 items-center gap-2 rounded-full px-5 font-extrabold text-ink">{huntId ? "Back to event & send photos" : "Share with an event"}</button>
        </div>}
        {onReset && <div className="mt-10 border-t-2 border-dashed border-ink/20 pt-6 text-center">
          <p className="text-sm font-semibold text-ink/70">Playing again with a new group? Save your photos first.</p>
          <button onClick={onReset} aria-label={`Start over ${pack.title}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink/50 bg-cream px-5 py-2 text-sm font-extrabold text-ink/80 transition-colors hover:border-ink hover:bg-coral-soft hover:text-ink">
            <RotateCcw className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Start over
          </button>
        </div>}
      </div>
    </section>
    <PhotoGallery isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} packId={packId} huntId={huntId}
      onPhotoDeleted={() => { void load(); void onPhotosChanged(); }} />
  </>;
}
