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
}

// Icon emoji mapping
const iconEmojiMap: Record<string, string> = {
  'Lightbulb': '💡',
  'Target': '🎯',
  'Heart': '❤️',
  'BookOpen': '📖',
  'Globe': '🌍'
};

export function PhotoGallery({ isOpen, onClose, onPhotoCountChange }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Swipe navigation for slideshow
  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => navigatePhoto(1),
    onSwipeRight: () => navigatePhoto(-1),
    threshold: 50
  });

  // Load photos when gallery opens
  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const allPhotos = await getAllPhotos();
      // Sort by timestamp (newest first)
      setPhotos(allPhotos.sort((a, b) => b.timestamp - a.timestamp));
      onPhotoCountChange?.(allPhotos.length);
    } catch (error) {
      console.error('Failed to load photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      // Remove from state
      const newPhotos = photos.filter(p => p.id !== photoId);
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

      // If no photos left, close gallery
      if (photos.length === 1) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to delete photo');
    }
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
      {/* Gallery Modal */}
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Photo Gallery</h2>
              <p className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''} captured</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
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
                      {/* Challenge badge - always visible */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {iconEmojiMap[photo.categoryIcon] || '📸'}
                          </span>
                          <span className="text-white/80 text-sm">{photo.categoryTitle}</span>
                        </div>
                        <h3 className="text-white font-bold text-lg">
                          #{photo.challengeNumber} {photo.challengeTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="p-4 flex items-center justify-between border-t bg-gray-50">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(photo.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
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
                          onClick={() => handleDelete(photo.id)}
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

          {/* Photo info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{iconEmojiMap[getSelectedPhoto()!.categoryIcon] || '📸'}</span>
                <span className="text-white/80">{getSelectedPhoto()!.categoryTitle}</span>
              </div>
              <div className="text-white/60 text-sm">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            </div>
            <h3 className="text-white text-xl font-bold">
              #{getSelectedPhoto()!.challengeNumber} {getSelectedPhoto()!.challengeTitle}
            </h3>
            <p className="text-white/60 text-sm mt-1">
              {new Date(getSelectedPhoto()!.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-6 right-6 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/90 hover:bg-white"
              onClick={() => getSelectedPhoto() && handleDownload(getSelectedPhoto()!)}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/90 hover:bg-white"
              onClick={() => getSelectedPhoto() && handleShare(getSelectedPhoto()!)}
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => getSelectedPhoto() && handleDelete(getSelectedPhoto()!.id)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {photos.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === selectedPhotoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
