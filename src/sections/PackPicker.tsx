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
    <div className="paper-dots border-b-2 border-ink/10 pb-4 pt-4">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div role="group" aria-label="Choose your game" className="grid grid-cols-2 gap-3">
          {packs.map((pack) => {
            const isActive = pack.id === activePackId;
            return (
              <button
                key={pack.id}
                onClick={() => onPick(pack.id)}
                aria-pressed={isActive}
                className={`sticker-card relative flex min-w-0 items-center gap-2 p-2 text-left transition-transform duration-150 sm:gap-3 sm:p-3 ${
                  isActive ? '!bg-sun-soft' : 'hover:-translate-y-0.5'
                }`}
              >
                <div className="flex-shrink-0">
                  <StickerArt
                    name={pack.mascotArt}
                    emoji={pack.mascotEmoji}
                    alt=""
                    className="h-8 w-8 sm:h-12 sm:w-12"
                    emojiSize="2rem"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base leading-tight text-ink sm:text-lg">{pack.title}</div>
                  <div className="truncate text-xs font-semibold text-ink/70">
                    {pack.locationLabel ?? pack.setting}
                  </div>
                </div>
                {isActive && (
                  <span className="absolute -right-1 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-go text-white sm:static sm:h-7 sm:w-7 sm:flex-shrink-0">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={4} />
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
