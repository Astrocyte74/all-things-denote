import { Check } from 'lucide-react';
import { StickerArt } from '@/components/StickerArt';
import type { GamePack } from '@/types';

interface PackPickerProps {
  packs: GamePack[];
  activePackId: string;
  onPick: (id: string) => void;
}

/**
 * Landing-page game picker. Sits above the active pack's hero so users can
 * switch games. Renders nothing when there's only one pack.
 */
export function PackPicker({ packs, activePackId, onPick }: PackPickerProps) {
  if (packs.length < 2) return null;

  return (
    <div className="paper-dots border-b-2 border-ink/10 pb-6 pt-4">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <p className="mb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink/50">
          Choose your game
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {packs.map((pack) => {
            const isActive = pack.id === activePackId;
            return (
              <button
                key={pack.id}
                onClick={() => onPick(pack.id)}
                aria-pressed={isActive}
                className={`sticker-card relative flex items-center gap-3 p-3 text-left transition-transform duration-150 ${
                  isActive ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'hover:-translate-y-0.5'
                }`}
              >
                <div className="flex-shrink-0">
                  <StickerArt
                    name={pack.mascotArt}
                    emoji={pack.mascotEmoji}
                    alt={pack.mascotAlt}
                    className="h-12 w-12"
                    emojiSize="2rem"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg leading-tight text-ink">{pack.title}</div>
                  <div className="truncate text-xs font-semibold text-ink/60">
                    {pack.setting.replace(/^the /, '')}
                  </div>
                </div>
                {isActive && (
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-go text-white">
                    <Check className="h-4 w-4" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
