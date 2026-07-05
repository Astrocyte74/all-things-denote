import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Map, Repeat, Shuffle, Zap } from 'lucide-react';
import { PATHS } from '@/data/paths';

interface PathSelectionProps {
  onPathSelected: (pathId: string) => void;
  isVisible: boolean;
  /** Back-to-previous-screen affordance; only rendered when provided. */
  onBack?: () => void;
}

const pathMeta: Record<string, { icon: React.ReactNode; color: string; soft: string }> = {
  A: { icon: <ArrowRight className="h-5 w-5" strokeWidth={3} />, color: '#FFB020', soft: '#FFF4D9' },
  B: { icon: <ArrowLeft className="h-5 w-5" strokeWidth={3} />, color: '#FF6B6B', soft: '#FFE7E4' },
  C: { icon: <Repeat className="h-5 w-5" strokeWidth={3} />, color: '#38B6FF', soft: '#E0F3FF' },
  D: { icon: <Map className="h-5 w-5" strokeWidth={3} />, color: '#2FBF71', soft: '#DFF6E9' },
  E: { icon: <Shuffle className="h-5 w-5" strokeWidth={3} />, color: '#7A6CF0', soft: '#ECE9FF' },
  F: { icon: <Zap className="h-5 w-5" strokeWidth={3} />, color: '#FF9DE2', soft: '#FFE9F7' },
};

export function PathSelection({ onPathSelected, onBack }: PathSelectionProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  return (
    <section className="paper-dots relative min-h-[100svh] py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4 pb-28 md:px-8">
        {onBack && (
          <button
            onClick={onBack}
            className="btn-3d btn-white animate-rise-in mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </button>
        )}
        <div className="mb-8 text-center">
          <p className="animate-rise-in mx-auto mb-3 inline-block rounded-full border-2 border-ink bg-cream px-4 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-ink shadow-sticker-sm">
            Step 1 of 2
          </p>
          <h2 className="animate-rise-in font-display text-4xl text-ink md:text-5xl" style={{ animationDelay: '0.08s' }}>
            Pick Your <span className="text-sticker-sun">Trail</span>
          </h2>
          <p className="animate-rise-in mx-auto mt-3 max-w-xl font-semibold text-ink/70" style={{ animationDelay: '0.16s' }}>
            Every team does the same 15 challenges — just in a different order,
            so you naturally spread out across the store.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((path, index) => {
            const meta = pathMeta[path.id];
            const isSelected = selectedPath === path.id;
            return (
              <button
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                aria-pressed={isSelected}
                className={`animate-rise-in relative rounded-3xl border-2 border-ink p-5 text-left transition-transform duration-150 ${
                  isSelected ? 'shadow-sticker-lg -translate-y-1' : 'shadow-sticker hover:-translate-y-0.5'
                }`}
                style={{
                  animationDelay: `${0.1 + index * 0.06}s`,
                  backgroundColor: isSelected ? meta.soft : '#FFFDF7',
                }}
              >
                {isSelected && (
                  <span className="animate-stamp-in absolute -right-2 -top-3 inline-flex rotate-[-4deg] items-center gap-1 rounded-full border-2 border-ink bg-go px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sticker-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={4} /> Picked!
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <span
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-ink font-display text-3xl text-white"
                    style={{ backgroundColor: meta.color, boxShadow: '2px 2px 0 0 #2E2459' }}
                  >
                    {path.id}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50">
                      {path.name.split(' - ')[1] ?? path.name}
                    </div>
                    <div className="flex items-center gap-1.5 font-display text-xl text-ink">
                      Path {path.id} {meta.icon}
                    </div>
                  </div>
                </div>

                <p className="mt-3 min-h-[40px] text-sm font-semibold leading-snug text-ink/70">
                  {path.description}
                </p>

                {/* First stops preview */}
                <div className="mt-3 flex items-center gap-1.5 border-t-2 border-dashed border-ink/15 pt-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50">Starts</span>
                  {path.order.slice(0, 4).map(n => (
                    <span
                      key={n}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink/70 bg-white text-[11px] font-extrabold text-ink"
                    >
                      {n}
                    </span>
                  ))}
                  <span className="text-sm font-extrabold text-ink/40">…</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky confirm bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => selectedPath && onPathSelected(selectedPath)}
            disabled={!selectedPath}
            className="btn-3d btn-go w-full rounded-full px-8 py-4 font-display text-xl tracking-wide text-white"
          >
            {selectedPath ? `Let's Go — Path ${selectedPath}!` : 'Pick a path to continue'}
          </button>
        </div>
      </div>
    </section>
  );
}
