import { useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, Challenge } from '@/types';
import { savePhoto, type StoredPhoto } from '@/lib/photoStorage';

interface PhotoCaptureProps {
  challenge: Challenge;
  category: Category;
  onCaptureComplete?: (challengeId: string) => void;
  onPhotoSaved?: () => void; // Callback when photo is saved to gallery
  variant?: 'default' | 'display';
}

// Icon mapping for rendering category icons
const iconEmojiMap: Record<string, string> = {
  'Lightbulb': '💡',
  'Target': '🎯',
  'Heart': '❤️',
  'BookOpen': '📖',
  'Globe': '🌍'
};

// Category color mapping for canvas gradients
const categoryColors: Record<string, { from: string; to: string }> = {
  'faith': { from: '#3B82F6', to: '#22D3EE' },      // blue-500 to cyan-400
  'choices': { from: '#A855F7', to: '#F472B6' },    // purple-500 to pink-400
  'service': { from: '#EF4444', to: '#FB923C' },    // red-500 to orange-400
  'scriptures': { from: '#22C55E', to: '#34D399' }, // green-500 to emerald-400
  'community': { from: '#EAB308', to: '#F59E0B' }   // yellow-500 to amber-400
};

export function PhotoCapture({ challenge, category, onCaptureComplete, onPhotoSaved, variant = 'default' }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create image from file
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Create canvas with high resolution
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(imageUrl);
          toast.error('Failed to process photo');
          return;
        }

        // Set canvas dimensions (higher resolution for better quality)
        const maxWidth = 1920;
        const maxHeight = 1920;
        const frameHeight = 240; // Frame overlay height - increased for larger text
        const padding = 24; // Padding on sides

        let width = img.width;
        let height = img.height;

        // Scale image to fit within max dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height + frameHeight;

        // Draw the photo
        ctx.drawImage(img, 0, 0, width, height);

        // Draw frame overlay
        const colors = categoryColors[category.id] || categoryColors['faith'];

        // Create gradient background for frame
        const gradient = ctx.createLinearGradient(0, height, 0, canvas.height);
        gradient.addColorStop(0, colors.from);
        gradient.addColorStop(1, colors.to);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height, width, frameHeight);

        // Add semi-transparent overlay for better text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, height, width, frameHeight);

        // Configure text styles
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Row 1: Category icon + name
        const categoryIcon = iconEmojiMap[category.icon] || '📸';
        const fontSize1 = Math.max(36, Math.floor(width * 0.055)); // Responsive but with minimum
        ctx.font = `${fontSize1}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const row1Y = height + 24;
        ctx.fillText(`${categoryIcon} ${category.title}`, padding, row1Y);

        // Row 2: Challenge number + title
        const fontSize2 = Math.max(42, Math.floor(width * 0.065)); // Responsive but with minimum
        ctx.font = `bold ${fontSize2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        const row2Y = row1Y + fontSize1 + 10;
        ctx.fillText(`#${challenge.number} ${challenge.title}`, padding, row2Y);

        // Row 3: Date (right-aligned)
        const fontSize3 = Math.max(28, Math.floor(width * 0.04)); // Responsive but with minimum
        ctx.font = `${fontSize3}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'right';
        const dateStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        ctx.fillText(dateStr, width - padding, row2Y + fontSize2 + 12);

        // Export canvas to blob and save to IndexedDB
        canvas.toBlob(async (blob) => {
          if (!blob) {
            toast.error('Failed to process photo');
            URL.revokeObjectURL(imageUrl);
            return;
          }

          try {
            // Convert blob to base64 for storage
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64data = reader.result as string;

              // Create stored photo object
              const storedPhoto: StoredPhoto = {
                id: `${challenge.id}-${Date.now()}`,
                challengeId: challenge.id,
                challengeNumber: challenge.number,
                challengeTitle: challenge.title,
                categoryId: category.id,
                categoryTitle: category.title,
                categoryIcon: category.icon,
                categoryColor: category.color,
                imageData: base64data,
                timestamp: Date.now()
              };

              // Save to IndexedDB
              await savePhoto(storedPhoto);

              // Show success toast
              toast.success('Photo saved to gallery!', {
                description: `Challenge #${challenge.number} marked complete`
              });

              // Mark challenge as complete
              if (onCaptureComplete) {
                onCaptureComplete(challenge.id);
              }

              // Notify parent component
              if (onPhotoSaved) {
                onPhotoSaved();
              }

              // Cleanup
              URL.revokeObjectURL(imageUrl);
            };

            reader.onerror = () => {
              toast.error('Failed to process photo');
              URL.revokeObjectURL(imageUrl);
            };

            reader.readAsDataURL(blob);
          } catch (error) {
            console.error('Failed to save photo:', error);
            toast.error('Failed to save photo to gallery');
            URL.revokeObjectURL(imageUrl);
          }
        }, 'image/jpeg', 0.92); // Slightly lower quality for storage
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        toast.error('Failed to load photo');
      };

      // Load the image
      img.src = imageUrl;

    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Failed to process photo');
    }

    // Reset file input so same file can be selected again
    event.target.value = '';
  }, [challenge, category, onCaptureComplete, onPhotoSaved]);

  const triggerCapture = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        aria-label="Take photo"
      />
      <button
        onClick={triggerCapture}
        className={`flex-shrink-0 rounded-lg transition-colors ${
          variant === 'display'
            ? 'bg-white hover:bg-gray-100 text-purple-600 p-4 shadow-lg hover:shadow-xl'
            : 'text-gray-400 hover:text-gray-600 p-2'
        }`}
        title="Take Photo"
        aria-label="Take photo for this challenge"
      >
        <Camera className={`w-6 h-6 ${variant === 'display' ? 'w-8 h-8' : 'w-5 h-5'}`} />
      </button>
    </>
  );
}
