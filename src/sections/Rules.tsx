import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, ChevronDown, ChevronUp, Heart, Map, PersonStanding } from 'lucide-react';
import type { Rule } from '@/types';
import qrCode from '/qr.png';

interface RulesProps {
  isVisible: boolean;
  collapsed?: boolean;
  onChangePath?: () => void;
  currentPathId?: string;
  onBack?: () => void;
  onStart?: () => void;
  rules: Rule[];
}

const ruleMeta: Record<string, { icon: React.ReactNode; color: string }> = {
  'rule-1': { icon: <Camera className="h-5 w-5" strokeWidth={2.5} />, color: '#38B6FF' },
  'rule-2': { icon: <PersonStanding className="h-5 w-5" strokeWidth={2.5} />, color: '#FFB020' },
  'rule-3': { icon: <Heart className="h-5 w-5" strokeWidth={2.5} />, color: '#FF6B6B' },
};

export function Rules({ collapsed = false, onChangePath, currentPathId = 'A', onBack, onStart, rules }: RulesProps) {
  const [isExpandedState, setIsExpandedState] = useState(!collapsed);
  const isExpanded = collapsed ? isExpandedState : true;

  if (collapsed && !isExpanded) {
    return (
      <section className="border-t-2 border-ink/10 bg-paper py-6 text-center">
        <button onClick={() => setIsExpandedState(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink/30 px-4 py-2 text-sm font-extrabold text-ink/70 hover:text-ink">
          Show game rules <ChevronDown className="h-4 w-4" strokeWidth={3} />
        </button>
      </section>
    );
  }

  const playRules = rules.filter(rule => rule.id !== 'rule-4' && rule.id !== 'rule-5');

  return (
    <section className={`paper-dots py-6 md:py-10 ${onStart ? 'pb-32' : ''}`}>
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        {onBack && (
          <button onClick={onBack} className="btn-3d btn-white mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back
          </button>
        )}
        <div className="mb-5 text-center">
          {!collapsed && (
            <p className="mx-auto mb-3 inline-block rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-bold text-ink">
              Step 2 of 2
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-display text-4xl text-ink md:text-5xl">How to play</h2>
            {collapsed && (
              <button onClick={() => setIsExpandedState(false)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-extrabold text-ink/70 hover:bg-ink/5">
                Hide <ChevronUp className="h-4 w-4" strokeWidth={3} />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-ink/80">Snap photos, talk it over, and explore together.</p>
        </div>

        {/* Rules are information, not buttons, so they stay flat (no pressable shadow) */}
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {playRules.map(rule => {
            const meta = ruleMeta[rule.id];
            return (
              <div key={rule.id} className="flat-card p-3.5 md:p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-ink" style={{ backgroundColor: meta.color }}>
                    {meta.icon}
                  </span>
                  <h3 className="font-display text-xl leading-tight text-ink">{rule.title}</h3>
                </div>
                <ul className="space-y-1 pl-4 text-sm font-semibold leading-snug text-ink/80">
                  {rule.description.split('\n').map((item, index) => <li key={index} className="list-disc">{item.replace(/^[•]\s*/, '')}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        {onChangePath && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/20 bg-grape-soft px-4 py-2">
            <div className="flex items-center gap-2 text-ink">
              <Map className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-extrabold">Your team: Path {currentPathId}</p>
                <p className="text-xs font-semibold text-ink/70">Each team picks a different path.</p>
              </div>
            </div>
            <button onClick={onChangePath} aria-label="Change Path" className="min-h-11 rounded-xl px-2 text-sm font-extrabold text-ink underline underline-offset-4 hover:bg-white/60">Change</button>
          </div>
        )}

        {rules.some(rule => rule.id === 'rule-5') && (
          <details className="mt-6 rounded-2xl border-2 border-ink/20 bg-cream p-3 text-ink">
            <summary className="cursor-pointer py-1 text-sm font-extrabold">Invite another team</summary>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
              <img src={qrCode} alt="QR code to open the hunt" className="h-28 w-28 rounded-xl border-2 border-ink bg-white p-2" />
              <p className="max-w-sm text-center text-sm font-semibold text-ink/80 sm:text-left">Scan with another phone’s camera to join. Each team needs at least one phone running the hunt.</p>
            </div>
          </details>
        )}
      </div>

      {/* Sticky start bar, same pattern as the path screen, so the main action never sits below the fold */}
      {onStart && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div className="mx-auto max-w-md">
            <button onClick={onStart} className="btn-3d btn-go flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 font-display text-xl tracking-wide text-ink">
              Start the hunt on Path {currentPathId} <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
