import { useState } from 'react';
import { ArrowRight, Camera, Share2, ShoppingCart, Users } from 'lucide-react';
import { ShareModal } from '@/components/ShareModal';
import { StickerArt } from '@/components/StickerArt';

interface HeaderProps {
  onStart: () => void;
}

export function Header({ onStart }: HeaderProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);

  return (
    <section className="paper-dots relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Share button */}
      <button
        onClick={() => setShareModalOpen(true)}
        className="btn-3d btn-white absolute right-4 top-4 z-20 rounded-2xl p-3 text-ink md:right-8 md:top-6"
        title="Share this scavenger hunt"
        aria-label="Share this scavenger hunt"
      >
        <Share2 className="h-5 w-5" />
      </button>

      {/* Floating decorative stickers */}
      <div className="pointer-events-none absolute left-[6%] top-[12%] hidden rotate-[-8deg] opacity-90 sm:block" style={{ ['--bob-tilt' as string]: '-8deg' }}>
        <div className="animate-bob-slow rounded-2xl border-2 border-ink bg-sun p-3 shadow-sticker">
          <Camera className="h-7 w-7 text-ink" strokeWidth={2.5} />
        </div>
      </div>
      <div className="pointer-events-none absolute right-[8%] top-[22%] hidden rotate-[10deg] opacity-90 sm:block" style={{ ['--bob-tilt' as string]: '10deg' }}>
        <div className="animate-bob-slower rounded-2xl border-2 border-ink bg-sky p-3 shadow-sticker">
          <ShoppingCart className="h-7 w-7 text-ink" strokeWidth={2.5} />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[18%] left-[10%] hidden rotate-[6deg] opacity-90 md:block" style={{ ['--bob-tilt' as string]: '6deg' }}>
        <div className="animate-bob rounded-2xl border-2 border-ink bg-coral p-3 shadow-sticker">
          <span className="block text-2xl leading-none">✨</span>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* Mascot */}
        <div className="animate-pop-in mb-2">
          <StickerArt
            name="mascot"
            emoji="🛒"
            alt="Scavenger hunt mascot — a happy shopping cart with a camera"
            className="h-36 w-36 animate-bob md:h-48 md:w-48"
            emojiSize="6.5rem"
          />
        </div>

        {/* Title */}
        <p className="animate-rise-in mb-2 rounded-full border-2 border-ink bg-cream px-4 py-1 font-body text-xs font-extrabold uppercase tracking-[0.2em] text-ink shadow-sticker-sm" style={{ animationDelay: '0.1s' }}>
          Gospel Analogies · Youth Activity
        </p>
        <h1 className="animate-rise-in font-display text-5xl leading-[0.95] md:text-7xl" style={{ animationDelay: '0.18s' }}>
          <span className="block text-ink">Scavenger</span>
          <span className="text-sticker-sun block text-6xl md:text-8xl">Hunt!</span>
        </h1>

        <p className="animate-rise-in mt-5 max-w-md text-base font-semibold text-ink/80 md:text-lg" style={{ animationDelay: '0.26s' }}>
          Team up, race the aisles, and snap 15 photos of everyday things
          that secretly teach gospel truths.
        </p>

        {/* Scripture ticket */}
        <blockquote className="animate-rise-in mt-6 max-w-md rotate-[-1deg] rounded-2xl border-2 border-dashed border-ink/40 bg-cream px-5 py-4" style={{ animationDelay: '0.34s' }}>
          <p className="text-sm italic leading-relaxed text-ink/70">
            “All things denote there is a God; yea, even the earth, and all
            things that are upon the face of it…”
          </p>
          <cite className="mt-1 block text-xs font-bold not-italic text-ink/50">— Alma 30:44</cite>
        </blockquote>

        {/* Stat chips */}
        <div className="animate-rise-in mt-6 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '0.42s' }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sky-soft px-3 py-1.5 text-sm font-extrabold text-ink shadow-sticker-sm">
            <Camera className="h-4 w-4" /> 15 photos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-grape-soft px-3 py-1.5 text-sm font-extrabold text-ink shadow-sticker-sm">
            <Users className="h-4 w-4" /> 6 team paths
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral-soft px-3 py-1.5 text-sm font-extrabold text-ink shadow-sticker-sm">
            <ShoppingCart className="h-4 w-4" /> store ready
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="btn-3d btn-go animate-rise-in mt-8 inline-flex items-center gap-3 rounded-full px-10 py-5 font-display text-2xl tracking-wide text-white"
          style={{ animationDelay: '0.5s' }}
        >
          Start the Hunt
          <ArrowRight className="h-6 w-6" strokeWidth={3} />
        </button>
        <p className="animate-rise-in mt-3 text-xs font-bold uppercase tracking-widest text-ink/40" style={{ animationDelay: '0.58s' }}>
          No sign-up · works offline-ish · free
        </p>
      </div>

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} />
    </section>
  );
}
