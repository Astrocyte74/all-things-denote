import { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Heart, Map, PersonStanding, Smartphone } from 'lucide-react';
import { rules } from '@/data/scavengerData';
import qrCode from '/qr.png';

interface RulesProps {
  isVisible: boolean;
  collapsed?: boolean;
  onChangePath?: () => void;
  currentPathId?: string;
}

const ruleMeta: Record<string, { icon: React.ReactNode; color: string; soft: string }> = {
  'rule-1': { icon: <Camera className="h-8 w-8" strokeWidth={2.5} />, color: '#38B6FF', soft: '#E0F3FF' },
  'rule-2': { icon: <PersonStanding className="h-8 w-8" strokeWidth={2.5} />, color: '#FFB020', soft: '#FFF4D9' },
  'rule-3': { icon: <Heart className="h-8 w-8" strokeWidth={2.5} />, color: '#FF6B6B', soft: '#FFE7E4' },
  'rule-4': { icon: <Map className="h-8 w-8" strokeWidth={2.5} />, color: '#2FBF71', soft: '#DFF6E9' },
  'rule-5': { icon: <Smartphone className="h-8 w-8" strokeWidth={2.5} />, color: '#7A6CF0', soft: '#ECE9FF' },
};

export function Rules({ collapsed = false, onChangePath, currentPathId = 'A' }: RulesProps) {
  const [isExpandedState, setIsExpandedState] = useState(!collapsed);
  const isExpanded = collapsed ? isExpandedState : true;

  // Collapsed state — small toggle row at the bottom of the hunt
  if (collapsed && !isExpanded) {
    return (
      <section className="border-t-2 border-ink/10 bg-paper py-6">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <button
            onClick={() => setIsExpandedState(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink/20 px-4 py-2 text-sm font-extrabold text-ink/50 transition-colors hover:border-ink/40 hover:text-ink"
          >
            Show Game Rules
            <ChevronDown className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="paper-dots py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-10 text-center">
          {!collapsed && (
            <p className="mx-auto mb-3 inline-block rounded-full border-2 border-ink bg-cream px-4 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-ink shadow-sticker-sm">
              Step 2 of 2
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-display text-4xl text-ink md:text-5xl">
              How to <span className="text-sticker-sun">Play</span>
            </h2>
            {collapsed && (
              <button
                onClick={() => setIsExpandedState(false)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold text-ink/50 hover:bg-ink/5 hover:text-ink"
              >
                Hide <ChevronUp className="h-4 w-4" strokeWidth={3} />
              </button>
            )}
          </div>
          <p className="mt-2 font-semibold text-ink/70">Five quick rules, then you're off!</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule, index) => {
            const meta = ruleMeta[rule.id];
            return (
              <div
                key={rule.id}
                className="animate-rise-in sticker-card relative flex h-full flex-col p-6"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {/* Step number badge */}
                <span className="absolute -left-2 -top-3 flex h-9 w-9 rotate-[-6deg] items-center justify-center rounded-full border-2 border-ink bg-cream font-display text-lg text-ink shadow-sticker-sm">
                  {index + 1}
                </span>

                <div className="mb-4 flex items-center gap-4">
                  <span
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-ink text-white"
                    style={{ backgroundColor: meta.color, boxShadow: '3px 3px 0 0 #2E2459' }}
                  >
                    {meta.icon}
                  </span>
                  <h3 className="font-display text-2xl leading-tight text-ink">{rule.title}</h3>
                </div>

                {rule.id === 'rule-5' ? (
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="rotate-[-2deg] rounded-2xl border-2 border-ink bg-white p-2 shadow-sticker-sm">
                      <img src={qrCode} alt="Scan to join" className="h-28 w-28" />
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-ink/70">
                      Scan with your phone camera — every team needs at least one
                      phone running the hunt.
                    </p>
                  </div>
                ) : rule.id === 'rule-4' && onChangePath ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3">
                    <div className="text-center">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-ink/50">Your path</div>
                      <div
                        className="mt-1 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink font-display text-4xl text-white"
                        style={{ backgroundColor: meta.color, boxShadow: '3px 3px 0 0 #2E2459' }}
                      >
                        {currentPathId}
                      </div>
                    </div>
                    <p className="text-center text-xs font-semibold text-ink/60">
                      Different paths = different orders. Each team picks its own!
                    </p>
                    <button
                      onClick={onChangePath}
                      className="btn-3d btn-white rounded-full px-5 py-2 text-sm font-extrabold text-ink"
                    >
                      Change Path
                    </button>
                  </div>
                ) : (
                  <ul className="flex-1 space-y-2.5">
                    {rule.description.split('\n').map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink text-[10px] font-black text-ink"
                          style={{ backgroundColor: meta.soft }}
                        >
                          ✓
                        </span>
                        <span className="text-sm font-semibold leading-relaxed text-ink/75">
                          {item.replace(/^[•]\s*/, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Filler card to balance the grid: quick pep talk */}
          <div
            className="animate-rise-in flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-ink/30 bg-sun-soft/60 p-6 text-center"
            style={{ animationDelay: '0.4s' }}
          >
            <span className="text-4xl">🏁</span>
            <h3 className="mt-2 font-display text-2xl text-ink">That's It!</h3>
            <p className="mt-1 text-sm font-semibold text-ink/70">
              Grab your team, keep your eyes open, and look for the deeper
              meaning in ordinary things.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
