import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StickerArtProps {
  /** File name (without extension) inside /public/art */
  name: string;
  /** Emoji shown if the art PNG hasn't been generated yet */
  emoji: string;
  alt: string;
  className?: string;
  /** Font size for the emoji fallback */
  emojiSize?: string;
}

/**
 * Renders a generated sticker illustration from /art/{name}.png,
 * gracefully falling back to a big emoji when the file is missing.
 */
export function StickerArt({ name, emoji, alt, className, emojiSize = '3rem' }: StickerArtProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center select-none', className)}
      >
        <span className="leading-none drop-shadow-sm" style={{ fontSize: emojiSize }}>
          {emoji}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}art/${name}.png`}
      alt={alt}
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('object-contain select-none', className)}
    />
  );
}
