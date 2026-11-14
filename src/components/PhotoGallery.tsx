import { photoFilename } from '@/lib/photoExport';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Trash2, Image as ImageIcon, Share, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getAllPhotos, deletePhoto, getPhotoCount, type StoredPhoto } from '@/lib/photoStorage';
import { Button } from '@/components/ui/button';
import { useSwipe } from '@/hooks/useSwipe';
import { SaveAllPhotos } from './SaveAllPhotos';

interface PhotoGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCountChange?: (count: number) => void;
  onPhotoDeleted?: () => void; // Callback when a photo is deleted
  filterChallengeId?: string | null; // If provided, only show photos for this challenge
  huntId?: string;
  packId?: string; // Scope the gallery to the active game pack
}

export function PhotoGallery({ isOpen, onClose, onPhotoCountChange, onPhotoDeleted, filterChallengeId, packId, huntId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [allPhotosForFilter, setAllPhotosForFilter] = useState<StoredPhoto[]>([]); // All photos for filter dropdown
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<string | null>(filterChallengeId || null);
  const [photoToDelete, setPhotoToDelete] = useState<StoredPhoto | null>(null); // For delete confirmation
  const [sortBy, setSortBy] = useState<'newest' | 'challenge'>('newest'); // Sort order

  // Swipe navigation for slideshow
  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => navigatePhoto(1),
    onSwipeRight: () => navigatePhoto(-1),
    threshold: 50
  });

  const viewerOpen = selectedPhotoIndex !== null;
  const closeViewerRef = useRef<HTMLButtonElement>(null);

  // Viewer keyboard: Escape closes, arrows step. Paused while the delete
  // confirmation is up so Escape doesn't close two layers at once.
  useEffect(() => {
    if (!viewerOpen || photoToDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      else if (e.key === 'ArrowRight') setSelectedPhotoIndex(i => (i !== null && i < photos.length - 1 ? i + 1 : i));
      else if (e.key === 'ArrowLeft') setSelectedPhotoIndex(i => (i !== null && i > 0 ? i - 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, photoToDelete, photos.length]);

  useEffect(() => {
    if (viewerOpen) closeViewerRef.current?.focus({ preventScroll: true });
  }, [viewerOpen]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Get all photos first (for filter options), scoped to the active pack.
      const allPhotos = (packId ? (await getAllPhotos(packId, huntId ?? null)) : (await getAllPhotos(undefined, huntId ?? null)));
      setAllPhotosForFilter(allPhotos.sort((a, b) => b.timestamp - a.timestamp));

      // Filter by challenge if a filter is set
      let filteredPhotos = allPhotos;
      if (currentFilter) {
        filteredPhotos = allPhotos.filter(p => p.challengeId === currentFilter);
      }

      // Sort based on selected sort option
      if (sortBy === 'newest') {
        setPhotos(filteredPhotos.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        // Sort by challenge number (ascending)
        setPhotos(filteredPhotos.sort((a, b) => a.challengeNumber - b.challengeNumber));
      }
      onPhotoCountChange?.(allPhotos.length);
    } catch (error) {
      console.error('Failed to load photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [currentFilter, sortBy, onPhotoCountChange, packId, huntId]);

  // Load photos when gallery opens, filter changes, or sort changes
  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen, loadPhotos]);

  // Reset filter and sort when gallery opens to default values
  useEffect(() => {
    if (isOpen) {
      setCurrentFilter(filterChallengeId || null);
      setSortBy('newest');
    }
  }, [isOpen, filterChallengeId]);

  const handleDelete = (photo: StoredPhoto) => {
    // Show confirmation dialog
    setPhotoToDelete(photo);
  };

  const confirmDelete = async () => {
    if (!photoToDelete) return;

    try {
      await deletePhoto(photoToDelete.id);
      // Remove from state
      const newPhotos = photos.filter(p => p.id !== photoToDelete.id);
      setPhotos(newPhotos);
      setAllPhotosForFilter(previous => previous.filter(p => p.id !== photoToDelete.id));

      // Update selected index if needed
      if (selectedPhotoIndex !== null) {
        if (newPhotos.length === 0) {
          setSelectedPhotoIndex(null);
        } else if (selectedPhotoIndex >= newPhotos.length) {
          setSelectedPhotoIndex(newPhotos.length - 1);
        }
      }

      toast.success('Photo deleted', { style: { pointerEvents: 'none' } });

      // Update photo count
      const newCount = await getPhotoCount(packId, huntId ?? null);
      onPhotoCountChange?.(newCount);

      // Notify parent component
      onPhotoDeleted?.();

      // If no photos left, close gallery
      if (photos.length === 1) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const cancelDelete = () => {
    setPhotoToDelete(null);
  };

  const navigatePhoto = (direction: 1 | -1) => {
    if (selectedPhotoIndex === null) return;

    const newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      setSelectedPhotoIndex(newIndex);
    }
  };

  const getSelectedPhoto = (): StoredPhoto | null => {
    if (selectedPhotoIndex === null || selectedPhotoIndex >= photos.length) return null;
    return photos[selectedPhotoIndex];
  };

  const handleDownload = (photo: StoredPhoto) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(photo.imageData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photoFilename(photo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Photo downloaded', { style: { pointerEvents: 'none' } });
    } catch (error) {
      console.error('Failed to download photo:', error);
      toast.error('Failed to download photo');
    }
  };

  const handleShare = async (photo: StoredPhoto) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(photo.imageData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const filename = photoFilename(photo);
      const file = new File([blob], filename, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Challenge #${photo.challengeNumber}`,
          text: photo.challengeTitle
        });
        toast.success('Photo shared!', { style: { pointerEvents: 'none' } });
      } else {
        // Fallback to download
        handleDownload(photo);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share photo:', error);
        toast.error('Failed to share photo');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Gallery Modal - hidden when in full-screen mode */}
      {selectedPhotoIndex === null && (
        <div className="fixed inset-0 bg-ink/80 z-[55] flex items-center justify-center p-4">
          <div className="sticker-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b-2 border-ink/10 bg-paper">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl text-ink">📸 Photo Gallery <span className="text-ink/40">({photos.length})</span></h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0" aria-label="Close photo gallery">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <SaveAllPhotos photos={allPhotosForFilter} packId={packId ?? 'scavenger'} />
              {/* Filter and Sort dropdowns */}
              {allPhotosForFilter.length > 0 && (
                <>
                  <select
                    value={currentFilter || 'all'}
                    onChange={(e) => setCurrentFilter(e.target.value === 'all' ? null : e.target.value)}
                    className="px-3 py-2 text-sm font-bold text-ink border-2 border-ink/20 rounded-xl bg-white focus:outline-none focus:border-ink"
                  >
                    <option value="all">All photos</option>
                    {Array.from(
                      new Map(allPhotosForFilter.map(p => [p.challengeId, { id: p.challengeId, number: p.challengeNumber, title: p.challengeTitle }]))
                        .values()
                    )
                      .sort((a, b) => a.number - b.number)
                      .map(challenge => (
                        <option key={challenge.id} value={challenge.id}>
                          #{challenge.number} {challenge.title}
                        </option>
                      ))}
                  </select>

                  {/* Sort dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'challenge')}
                    className="px-3 py-2 text-sm font-bold text-ink border-2 border-ink/20 rounded-xl bg-white focus:outline-none focus:border-ink"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="challenge">Sort: Challenge #</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="font-bold text-ink/50">Loading photos…</div>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-ink/50">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-display text-xl">No photos yet</p>
                <p className="text-sm font-semibold">Tap the green camera button to fill this up!</p>
              </div>
            ) : (
              // Large view - bigger single column cards
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl border-2 border-ink bg-cream shadow-sticker-sm overflow-hidden transition-transform hover:-translate-y-0.5"
                  >
                    {/* Whole keepsake card, never cropped (older photos keep their original label) */}
                    <button
                      type="button"
                      className="paper-dots block aspect-[4/5] w-full p-3"
                      onClick={() => setSelectedPhotoIndex(index)}
                      aria-label={`View photo for #${photo.challengeNumber} ${photo.challengeTitle} full screen`}
                    >
                      <img
                        src={photo.imageData}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </button>

                    {/* Actions bar */}
                    <div className="p-4 flex items-center justify-between border-t-2 border-ink/10 bg-paper">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="truncate text-sm font-extrabold text-ink">
                          #{photo.challengeNumber} {photo.challengeTitle}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-ink/60">
                          <Calendar className="w-3 h-3" />
                          {new Date(photo.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => handleDownload(photo)}
                          title="Save"
                          aria-label={`Save photo #${photo.challengeNumber}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => handleShare(photo)}
                          title="Share"
                          aria-label={`Share photo #${photo.challengeNumber}`}
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-coral-edge hover:bg-coral-soft hover:text-coral-edge"
                          onClick={() => handleDelete(photo)}
                          title="Delete"
                          aria-label={`Delete photo #${photo.challengeNumber}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Full-screen viewer: the card gets its own row; controls live in the
          top and bottom bars (and side gutters on wider screens), so they
          never sit on top of the baked caption. */}
      {viewerOpen && getSelectedPhoto() && (() => {
        const photo = getSelectedPhoto()!;
        const index = selectedPhotoIndex!;
        const atStart = index === 0;
        const atEnd = index === photos.length - 1;
        const navButton = 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-cream/25 bg-cream/10 text-cream transition-colors hover:bg-cream/20 disabled:cursor-not-allowed disabled:opacity-30';
        return (
          <div
            ref={swipeRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${index + 1} of ${photos.length}: #${photo.challengeNumber} ${photo.challengeTitle}`}
            className="fixed inset-0 z-[60] flex flex-col bg-[#1F1842] text-cream"
            style={{ backgroundImage: 'radial-gradient(rgba(253,246,236,0.06) 1.1px, transparent 1.1px)', backgroundSize: '22px 22px' }}
          >
            {/* Top bar */}
            <div className="safe-top flex-shrink-0">
              <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 pt-3 sm:px-5 [@media(max-height:500px)]:pt-1.5">
                <span className="flex-shrink-0 rounded-full border-2 border-ink bg-sun px-3 py-1 font-display text-lg leading-none text-ink tabular-nums shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]">
                  {index + 1}<span className="text-ink/60"> / {photos.length}</span>
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-cream/85">
                  #{photo.challengeNumber} {photo.challengeTitle}
                </p>
                <button
                  ref={closeViewerRef}
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="btn-3d btn-white flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ink [@media(max-height:500px)]:h-10 [@media(max-height:500px)]:w-10"
                  aria-label="Close photo viewer"
                >
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Card */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-3 sm:px-24 [@media(max-height:500px)]:py-2">
              <img
                key={photo.id}
                src={photo.imageData}
                alt={`Photo for #${photo.challengeNumber} ${photo.challengeTitle}`}
                draggable={false}
                className="animate-pop-in max-h-full max-w-full select-none rounded-xl object-contain shadow-[0_0_0_2px_rgba(253,246,236,0.85),6px_6px_0_2px_rgba(0,0,0,0.4)]"
              />
              <button onClick={() => navigatePhoto(-1)} disabled={atStart} aria-label="Previous photo" className={`${navButton} absolute left-5 top-1/2 hidden -translate-y-1/2 sm:flex`}>
                <ChevronLeft className="h-7 w-7" strokeWidth={3} />
              </button>
              <button onClick={() => navigatePhoto(1)} disabled={atEnd} aria-label="Next photo" className={`${navButton} absolute right-5 top-1/2 hidden -translate-y-1/2 sm:flex`}>
                <ChevronRight className="h-7 w-7" strokeWidth={3} />
              </button>
            </div>

            {/* Bottom toolbar */}
            <div className="flex-shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 [@media(max-height:500px)]:pb-[max(0.4rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex max-w-md items-center justify-between gap-2 max-[359px]:gap-1.5">
                <button onClick={() => navigatePhoto(-1)} disabled={atStart} aria-label="Previous photo" className={`${navButton} sm:hidden`}>
                  <ChevronLeft className="h-6 w-6" strokeWidth={3} />
                </button>
                <div className="flex flex-1 items-center justify-center gap-2 max-[359px]:gap-1.5">
                  <button
                    onClick={() => handleDownload(photo)}
                    className="btn-3d btn-white inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-2xl px-3.5 font-extrabold max-[359px]:px-0 text-ink [@media(max-height:500px)]:min-h-10"
                  >
                    <Download className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /><span className="max-[359px]:sr-only">Save</span>
                  </button>
                  <button
                    onClick={() => handleShare(photo)}
                    className="btn-3d btn-sun inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-2xl px-3.5 font-extrabold max-[359px]:px-0 text-ink [@media(max-height:500px)]:min-h-10"
                  >
                    <Share className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /><span className="max-[359px]:sr-only">Share</span>
                  </button>
                  <button
                    onClick={() => handleDelete(photo)}
                    aria-label="Delete photo"
                    className="btn-3d btn-coral flex h-12 w-12 items-center justify-center rounded-2xl text-ink [@media(max-height:500px)]:h-10 [@media(max-height:500px)]:w-10"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={2.75} />
                  </button>
                </div>
                <button onClick={() => navigatePhoto(1)} disabled={atEnd} aria-label="Next photo" className={`${navButton} sm:hidden`}>
                  <ChevronRight className="h-6 w-6" strokeWidth={3} />
                </button>
              </div>
              {photos.length > 1 && (
                <p className="mt-2 text-center text-xs font-bold text-cream/55 sm:hidden">Swipe for more photos</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center z-[70] p-4">
          <div className="sticker-card animate-pop-in p-6 max-w-md w-full">
            <h3 className="font-display text-2xl text-ink mb-2">Delete Photo?</h3>
            <p className="font-semibold text-ink/70 mb-2">
              This will permanently delete the photo for:
            </p>
            <p className="text-coral-edge font-extrabold mb-6">
              #{photoToDelete.challengeNumber} {photoToDelete.challengeTitle}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="btn-3d btn-white flex-1 text-ink px-4 py-3 rounded-full font-extrabold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn-3d btn-coral flex-1 text-ink px-4 py-3 rounded-full font-extrabold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
