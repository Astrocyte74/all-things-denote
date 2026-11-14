import type { Category, Challenge } from '@/types';
import { getCategoryTheme } from '@/lib/theme';

export async function processPhoto(file: File, challenge: Challenge, category: Category, pathId?: string): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not open this photo. Try a JPEG or PNG image.'));
      img.src = imageUrl;
    });
    // Create canvas with high resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not process this photo.');
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

    // Draw frame overlay — colors come from the active pack's theme.
    const theme = getCategoryTheme(category.id);
    const colors = { from: theme.main, to: theme.edge };

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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not process this photo.')), 'image/jpeg', 0.92);
    });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read this photo.'));
      reader.onabort = () => reject(new Error('Reading the photo was interrupted.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
