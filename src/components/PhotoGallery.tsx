import { useState, useEffect } from 'react';
import { X, Download, Trash2, Image as ImageIcon, ExternalLink, Grid, List, Calendar, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllPhotos, deletePhoto, getPhotoCount, type StoredPhoto } from '@/lib/photoStorage';
import { Button } from '@/components/ui/button';

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
  const [selectedPhoto, setSelectedPhoto] = useState<StoredPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'large'>('grid');

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
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
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
            <div className="flex items-center gap-2">
              {/* View toggle buttons */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('large')}
                  className={`p-2 transition-colors ${
                    viewMode === 'large'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  title="Large view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
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
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.imageData}
                      alt={photo.challengeTitle}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(photo);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(photo);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(photo.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Challenge badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">
                        #{photo.challengeNumber} {photo.challengeTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'large' ? (
              // Large view - bigger single column cards
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    {/* Photo - larger, taller aspect ratio */}
                    <div
                      className="aspect-[4/3] bg-gray-100 cursor-pointer relative group"
                      onClick={() => setSelectedPhoto(photo)}
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
            ) : (
              // List view
              <div className="space-y-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-4 bg-gray-50 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div
                      className="flex-shrink-0 w-24 h-24 bg-gray-200 cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.imageData}
                        alt={photo.challengeTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {iconEmojiMap[photo.categoryIcon] || '📸'}
                        </span>
                        <span className="text-xs text-gray-500">{photo.categoryTitle}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        #{photo.challengeNumber} {photo.challengeTitle}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(photo.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pr-3">
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Photo Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <X className="w-8 h-8" />
          </button>

          <img
            src={selectedPhoto.imageData}
            alt={selectedPhoto.challengeTitle}
            className="max-w-full max-h-full object-contain"
          />

          {/* Photo info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{iconEmojiMap[selectedPhoto.categoryIcon] || '📸'}</span>
              <span className="text-white/80">{selectedPhoto.categoryTitle}</span>
            </div>
            <h3 className="text-white text-xl font-bold">
              #{selectedPhoto.challengeNumber} {selectedPhoto.challengeTitle}
            </h3>
            <p className="text-white/60 text-sm mt-1">
              {new Date(selectedPhoto.timestamp).toLocaleDateString('en-US', {
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
              onClick={() => handleDownload(selectedPhoto)}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/90 hover:bg-white"
              onClick={() => handleShare(selectedPhoto)}
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDelete(selectedPhoto.id)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
