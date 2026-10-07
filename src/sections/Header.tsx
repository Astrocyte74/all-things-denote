import { useState } from 'react';
import { ArrowRight, Share2 } from 'lucide-react';
import { ShareModal } from '@/components/ShareModal';
import { StickerArt } from '@/components/StickerArt';
import type { GamePack } from '@/types';

interface HeaderProps {
  pack: GamePack;
  onStart: () => void;
}

// Split a title into two stacked lines for the display heading, breaking on
// the last word (e.g. "Scavenger Hunt" -> ["Scavenger", "Hunt!"]).
function splitTitle(title: string): [string, string] {
  const trimmed = title.trim();
  const space = trimmed.lastIndexOf(' ');
  if (space === -1) return ['', `${trimmed}!`];
  return [trimmed.slice(0, space), `${trimmed.slice(space + 1)}!`];
}

// Where the three floating stickers sit on wide screens. They use the active
// pack's own category art, so each game decorates itself.
const decorSlots = [
  { position: 'left-[5%] top-[14%]', tilt: '-8deg', anim: 'animate-bob-slow' },
  { position: 'right-[7%] top-[26%]', tilt: '9deg', anim: 'animate-bob-slower' },
  { position: 'bottom-[16%] left-[9%]', tilt: '6deg', anim: 'animate-bob' },
];

export function Header({ pack, onStart }: HeaderProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [titleLine1, titleLine2] = splitTitle(pack.title);

  const decor = pack.categories
    .slice(0, decorSlots.length)
    .map((category) => ({ category, theme: pack.categoryTheme[category.id] }))
    .filter((item) => item.theme);

  return (
    <section className="paper-dots relative flex flex-col items-center justify-center overflow-hidden px-4 py-6 md:min-h-[calc(100svh-120px)] md:py-10">
      {/* Floating decorative stickers (wide screens only) */}
      {decor.map(({ category, theme }, i) => {
        const slot = decorSlots[i];
        return (
          <div
            key={category.id}
            aria-hidden="true"
            className={`pointer-events-none absolute hidden lg:block ${slot.position}`}
          >
            <div className={slot.anim} style={{ ['--bob-tilt' as string]: slot.tilt }}>
              <StickerArt name={theme.art} emoji={theme.emoji} alt="" className="h-24 w-24" emojiSize="4.5rem" />
            </div>
          </div>
        );
      })}

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* Mascot */}
        <div className="animate-pop-in mb-3">
          <StickerArt
            name={pack.mascotArt}
            emoji={pack.mascotEmoji}
            alt={pack.mascotAlt}
            className="h-28 w-28 animate-bob md:h-40 md:w-40"
            emojiSize="6.5rem"
          />
        </div>

        {/* Title */}
        <p
          className="animate-rise-in mb-3 rounded-full border-2 border-ink bg-cream px-4 py-1 text-sm font-bold text-ink"
          style={{ animationDelay: '0.1s' }}
        >
          {pack.tagline}
        </p>
        <h1 className="animate-rise-in font-display text-5xl leading-[0.95] md:text-7xl" style={{ animationDelay: '0.18s' }}>
          {titleLine1 && <span className="block text-ink">{titleLine1}</span>}
          <span className="text-sticker-sun block text-6xl md:text-8xl">{titleLine2}</span>
        </h1>

        <p className="animate-rise-in mt-5 max-w-md text-base font-semibold text-ink/80 md:text-lg" style={{ animationDelay: '0.26s' }}>
          {pack.blurb}
        </p>

        <button
          onClick={onStart}
          className="btn-3d btn-go animate-rise-in mt-6 inline-flex items-center gap-3 rounded-full px-8 py-4 font-display text-2xl tracking-wide text-white"
          style={{ animationDelay: '0.3s' }}
        >
          Start the hunt
          <ArrowRight className="h-6 w-6" strokeWidth={3} />
        </button>
        <p className="mt-3 text-sm font-semibold text-ink/70">
          Free, no sign-up. Progress saves on this device.
        </p>

        {/* Scripture ticket */}
        <blockquote className="animate-rise-in mt-6 max-w-md rotate-[-1deg] rounded-2xl border-2 border-dashed border-ink/40 bg-cream px-5 py-4" style={{ animationDelay: '0.34s' }}>
          <p className="text-sm italic leading-relaxed text-ink/70">
            {pack.scriptureQuote}
          </p>
          <cite className="mt-1 block text-xs font-bold not-italic text-ink/70">— {pack.scriptureCitation}</cite>
        </blockquote>

        {/* Facts about the game (flat: they inform, they don't respond to taps) */}
        <div className="animate-rise-in mt-6 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '0.42s' }}>
          {pack.statChips.map((chip, i) => (
            <span
              key={chip.label}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-extrabold text-ink ${
                ['bg-sky-soft', 'bg-grape-soft', 'bg-coral-soft'][i % 3]
              }`}
            >
              <span className="leading-none" aria-hidden="true">{chip.emoji}</span> {chip.label}
            </span>
          ))}
        </div>

        {/* Sharing is occasional, so it sits at the bottom instead of floating over the hero */}
        <button
          onClick={() => setShareModalOpen(true)}
          className="btn-3d btn-white mt-8 inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold text-ink"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.5} />
          Share this hunt
        </button>
      </div>

      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} />
    </section>
  );
}
