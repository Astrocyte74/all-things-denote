import { StickerArt } from '@/components/StickerArt';

export function Footer() {
  return (
    <footer className="border-t-2 border-ink/10 bg-paper py-10">
      <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
        <StickerArt
          name="camera"
          emoji="📸"
          alt="Camera"
          className="mx-auto h-16 w-16 animate-bob-slow"
          emojiSize="2.5rem"
        />
        <p className="mt-2 font-display text-2xl text-ink">Happy Hunting!</p>
        <p className="mt-2 text-sm font-semibold text-ink/50">
          Follow store policies, be kind to shoppers and employees, and have fun.
        </p>
      </div>
    </footer>
  );
}
