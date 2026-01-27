import { useState, useEffect } from 'react';
import { X, Download, Trash2, Image as ImageIcon, ExternalLink, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getAllPhotos, deletePhoto, getPhotoCount, type StoredPhoto } from '@/lib/photoStorage';
import { Button } from '@/components/ui/button';
import { useSwipe } from '@/hooks/useSwipe';

interface PhotoGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCountChange?: (count: number) => void;
  onPhotoDeleted?: () => void; // Callback when a photo is deleted
  filterChallengeId?: string | null; // If provided, only show photos for this challenge
}

export function PhotoGallery({ isOpen, onClose, onPhotoCountChange, onPhotoDeleted, filterChallengeId }: PhotoGalleryProps) {
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

  const loadPhotos = async () => {
    setLoading(true);
    try {
      // Get all photos first (for filter options
      const allPhotos = await getAllPhotos();
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
  };

  // Load photos when gallery opens, filter changes, or sort changes
  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen, currentFilter, sortBy]);

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

      // Update selected index if needed
      if (selectedPhotoIndex !== null) {
        if (newPhotos.length === 0) {
          setSelectedPhotoIndex(null);
        } else if (selectedPhotoIndex >= newPhotos.length) {
          setSelectedPhotoIndex(newPhotos.length - 1);
        }
      }

      toast.success('Photo deleted');

      // Update photo count
      const newCount = await getPhotoCount();
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
      link.download = `scavenger-hunt-${photo.challengeNumber}-${photo.challengeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Photo downloaded');
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

      const filename = `scavenger-hunt-${photo.challengeNumber}-${photo.challengeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Challenge #${photo.challengeNumber}`,
          text: photo.challengeTitle
        });
        toast.success('Photo shared!');
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
        <div className="fixed inset-0 bg-black/80 z-[55] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Photo Gallery ({photos.length})</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter and Sort dropdowns */}
              {allPhotosForFilter.length > 0 && (
                <>
                  <select
                    value={currentFilter || 'all'}
                    onChange={(e) => setCurrentFilter(e.target.value === 'all' ? null : e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <div className="text-gray-500">Loading photos...</div>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No photos yet</p>
                <p className="text-sm">Take photos to see them here!</p>
              </div>
            ) : (
              // Large view - bigger single column cards
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    {/* Photo - larger, taller aspect ratio */}
                    <div
                      className="aspect-[4/3] bg-gray-100 cursor-pointer relative group"
                      onClick={() => setSelectedPhotoIndex(index)}
                    >
                      <img
                        src={photo.imageData}
                        alt={photo.challengeTitle}
                        className="w-full h-full object-cover"
                      />
                      {/* Challenge number badge overlay */}
                      <div className="absolute top-2 left-2 bg-purple-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                        #{photo.challengeNumber}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="p-4 flex items-center justify-between border-t bg-gray-50">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(photo.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-purple-600">
                          Tap photo to view full screen
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(photo)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleShare(photo)}
                          title="Share"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(photo)}
                          title="Delete"
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

      {/* Full Screen Slideshow Viewer */}
      {selectedPhotoIndex !== null && getSelectedPhoto() && (
        <div
          ref={swipeRef}
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2 bg-black/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous button */}
          <button
            onClick={() => navigatePhoto(-1)}
            disabled={selectedPhotoIndex === 0}
            className="absolute left-4 z-10 text-white/80 hover:text-white p-3 bg-black/20 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-8">
            <img
              src={getSelectedPhoto()!.imageData}
              alt={getSelectedPhoto()!.challengeTitle}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Next button */}
          <button
            onClick={() => navigatePhoto(1)}
            disabled={selectedPhotoIndex === photos.length - 1}
            className="absolute right-4 z-10 text-white/80 hover:text-white p-3 bg-black/20 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Action buttons */}
          <div className="absolute bottom-20 right-6 flex gap-2 z-20">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/90 hover:bg-white shadow-lg"
              onClick={() => getSelectedPhoto() && handleDownload(getSelectedPhoto()!)}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/90 hover:bg-white shadow-lg"
              onClick={() => getSelectedPhoto() && handleShare(getSelectedPhoto()!)}
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="shadow-lg"
              onClick={() => getSelectedPhoto() && handleDelete(getSelectedPhoto()!)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Photo counter overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pb-8">
            <div className="flex items-center justify-between">
              <div className="text-white/60 text-sm">
                Swipe to navigate
              </div>
              <div className="text-white font-bold text-lg">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Photo?</h3>
            <p className="text-gray-600 mb-2">
              This will permanently delete the photo for:
            </p>
            <p className="text-purple-600 font-semibold mb-6">
              #{photoToDelete.challengeNumber} {photoToDelete.challengeTitle}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors"
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
