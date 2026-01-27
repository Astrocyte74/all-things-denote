import { useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, Challenge } from '@/types';

interface PhotoCaptureProps {
  challenge: Challenge;
  category: Category;
  onCaptureComplete?: (challengeId: string) => void;
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

export function PhotoCapture({ challenge, category, onCaptureComplete }: PhotoCaptureProps) {
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
        const frameHeight = 180; // Frame overlay height - increased for better text visibility
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
        const fontSize1 = Math.max(28, Math.floor(width * 0.04)); // Responsive but with minimum
        ctx.font = `${fontSize1}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const row1Y = height + 24;
        ctx.fillText(`${categoryIcon} ${category.title}`, padding, row1Y);

        // Row 2: Challenge number + title
        const fontSize2 = Math.max(32, Math.floor(width * 0.048)); // Responsive but with minimum
        ctx.font = `bold ${fontSize2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        const row2Y = row1Y + fontSize1 + 8;
        ctx.fillText(`#${challenge.number} ${challenge.title}`, padding, row2Y);

        // Row 3: Date (right-aligned)
        const fontSize3 = Math.max(22, Math.floor(width * 0.032)); // Responsive but with minimum
        ctx.font = `${fontSize3}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'right';
        const dateStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        ctx.fillText(dateStr, width - padding, row2Y + fontSize2 + 10);

        // Export canvas to blob and trigger download
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Format filename: scavenger-hunt-#[number]-[title].jpg
            const sanitizedTitle = challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const filename = `scavenger-hunt-${challenge.number}-${sanitizedTitle}.jpg`;

            // Try Web Share API first (better for mobile - can save to Photos)
            if (navigator.share && navigator.canShare && blob instanceof File) {
              try {
                const file = new File([blob], filename, { type: 'image/jpeg' });
                if (navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    files: [file],
                    title: `Challenge #${challenge.number}`,
                    text: challenge.title
                  });
                  // Success - user shared/saved the photo
                  toast.success('Photo saved!', {
                    description: `Challenge #${challenge.number} marked complete`
                  });
                  if (onCaptureComplete) {
                    onCaptureComplete(challenge.id);
                  }
                  URL.revokeObjectURL(imageUrl);
                  return;
                }
              } catch (shareError) {
                // Share was cancelled or failed, fall through to download
                if ((shareError as Error).name !== 'AbortError') {
                  console.log('Share failed, falling back to download:', shareError);
                }
              }
            }

            // Fallback: Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            URL.revokeObjectURL(url);

            // Show success toast
            toast.success('Photo downloaded!', {
              description: `Check your Downloads folder. Challenge #${challenge.number} marked complete`
            });

            // Mark challenge as complete
            if (onCaptureComplete) {
              onCaptureComplete(challenge.id);
            }
          } else {
            toast.error('Failed to save photo');
          }

          // Cleanup original image URL
          URL.revokeObjectURL(imageUrl);
        }, 'image/jpeg', 0.95);
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
  }, [challenge, category, onCaptureComplete]);

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
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
        title="Take Photo"
        aria-label="Take photo for this challenge"
      >
        <Camera className="w-5 h-5" />
      </button>
    </>
  );
}
