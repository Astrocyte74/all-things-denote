import { useState, useEffect } from 'react';
import type { BonusItem } from '@/types';
import { getBonusArt } from '@/lib/theme';
import { StickerArt } from '@/components/StickerArt';
import { ConfettiBurst } from '@/components/ConfettiBurst';

interface BonusSectionProps {
  isVisible: boolean;
  isUnlocked: boolean;
  bonusItems: BonusItem[];
}

const bonusColors = ['#38B6FF', '#FFFDF7', '#FF6B6B', '#7A6CF0'];
const bonusSofts = ['#E0F3FF', '#FFFDF7', '#FFE7E4', '#ECE9FF'];

export function BonusSection({ isVisible, isUnlocked, bonusItems }: BonusSectionProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (isVisible && isUnlocked) {
      setTimeout(() => setIsAnimated(true), 300);
      setTimeout(() => setBurstKey(1), 600);
    }
  }, [isVisible, isUnlocked]);

  if (!isUnlocked) return null;

  return (
    <section className="paper-dots relative overflow-hidden border-t-2 border-ink py-16 md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-10 text-center">
          {/* Celebration header */}
          <div className="relative mx-auto w-fit">
            <ConfettiBurst burstKey={burstKey} />
            <StickerArt
              name="trophy"
              emoji="🏆"
              alt="Trophy"
              className="animate-pop-in mx-auto h-28 w-28 animate-bob md:h-36 md:w-36"
              emojiSize="5rem"
            />
          </div>

          <div className="mt-2">
            <span className="inline-flex rotate-[-2deg] items-center gap-2 rounded-full border-2 border-ink bg-sun px-4 py-1.5 font-display text-sm tracking-wide text-ink shadow-sticker-sm">
              🎉 Bonus Round Unlocked!
            </span>
          </div>
          <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
            You Did <span className="text-sticker-sun">All 15!</span>
          </h2>
          <p className="mt-2 font-semibold text-ink/70">
            Four more finds for the champions. Tap a card to reveal its meaning.
          </p>

          {/* Analogy tip */}
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border-2 border-dashed border-ink/30 bg-leaf-soft p-4 text-left">
            <p className="font-extrabold text-leaf-edge">
              💡 Leader tip: triple-tap the progress bar to reveal every gospel analogy
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink/60">
              Perfect for when the group is ready to talk about what they found.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bonusItems.map((item, index) => {
            const isFlipped = flippedCard === item.id;
            const art = getBonusArt(item.id);

            return (
              <div
                key={item.id}
                className={`transform transition-all duration-500 ${
                  isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 100}ms`, perspective: '1000px' }}
              >
                <div
                  className="relative h-64 cursor-pointer transition-transform duration-700"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                  onClick={() => setFlippedCard(isFlipped ? null : item.id)}
                >
                  {/* Front */}
                  <div
                    className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-ink p-6 shadow-sticker"
                    style={{ backfaceVisibility: 'hidden', backgroundColor: bonusSofts[index] }}
                  >
                    <div className={index % 2 === 0 ? 'animate-bob' : 'animate-bob-slow'}>
                      <StickerArt
                        name={art?.art ?? 'mascot'}
                        emoji={art?.emoji ?? '⭐'}
                        alt={item.title}
                        className="h-24 w-24"
                        emojiSize="4rem"
                      />
                    </div>
                    <h3 className="mt-3 text-center font-display text-xl text-ink">{item.title}</h3>
                    <p className="mt-1 text-center text-sm font-semibold text-ink/60">{item.hint}</p>
                    <span className="mt-3 rounded-full border-2 border-ink/20 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink/50">
                      Tap to reveal
                    </span>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-ink p-6 shadow-sticker"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      backgroundColor: bonusColors[index] === '#FFFDF7' ? '#2E2459' : bonusColors[index],
                    }}
                  >
                    <StickerArt
                      name={art?.art ?? 'mascot'}
                      emoji={art?.emoji ?? '⭐'}
                      alt={item.title}
                      className="h-14 w-14"
                      emojiSize="2.5rem"
                    />
                    <h3 className="mt-2 text-center font-display text-lg text-white">{item.title}</h3>
                    <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-white/90">
                      {item.connection}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
