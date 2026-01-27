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
  pathId?: string;
};

// Category color mapping for canvas gradients
const categoryColors: Record<string, { from: string; to: string }> = {
  'faith': { from: '#3B82F6', to: '#22D3EE' },      // blue-500 to cyan-400
  'choices': { from: '#A855F7', to: '#F472B6' },    // purple-500 to pink-400
  'service': { from: '#EF4444', to: '#FB923C' },    // red-500 to orange-400
  'scriptures': { from: '#22C55E', to: '#34D399' }, // green-500 to emerald-400
  'community': { from: '#EAB308', to: '#F59E0B' }   // yellow-500 to amber-400
};

export function PhotoCapture({ challenge, category, onCaptureComplete, onPhotoSaved, variant = 'default', pathId }: PhotoCaptureProps) {
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
        const frameHeight = 300; // More height for 2 lines of text
        const padding = 24; // Padding on sides
        const topPadding = 12; // Minimal top padding
        const lineHeight = 1.1; // Tighter line height

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

        const availableWidth = width - (padding * 2);
        let currentY = height + topPadding; // Start with minimal top padding

        // Row 1: Team Path (centered, at the very top) - only if pathId provided
        if (pathId) {
          const fontSizePath = Math.max(32, Math.floor(width * 0.035)); // Much smaller for better fit
          ctx.font = `bold ${fontSizePath}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
          ctx.textAlign = 'center';
          ctx.fillText(`Path ${pathId}`, width / 2, currentY);
          ctx.textAlign = 'left';
          currentY += fontSizePath + 4; // Tight spacing after path
        }

        // Row 2: Challenge number + title (with wrapping support)
        const fontSizeTitle = Math.max(36, Math.floor(width * 0.04)); // Smaller for better fit
        ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';

        const titleText = `#${challenge.number} ${challenge.title}`;
        const words = titleText.split(' ');
        let line = '';
        const lines: string[] = [];

        // Wrap text to fit within max width
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > availableWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Draw each line of the title with proper line height
        const titleLineHeight = Math.floor(fontSizeTitle * lineHeight);
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i].trim(), padding, currentY);
          currentY += titleLineHeight;
        }

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
                pathId: pathId, // Save the team path
                imageData: base64data,
                timestamp: Date.now()
              };

              // Save to IndexedDB
              await savePhoto(storedPhoto);

              // Show success toast (short duration, top position to avoid blocking camera)
              toast.success('Photo saved to gallery!', {
                description: `Challenge #${challenge.number} marked complete`,
                duration: 2000,
                position: 'top-center'
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
