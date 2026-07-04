import { useMemo } from 'react';

const COLORS = ['#FFB020', '#FF6B6B', '#38B6FF', '#2FBF71', '#7A6CF0', '#FFD84D', '#FF9DE2'];

// Deterministic pseudo-random in [0, 1) so render stays pure (seeded per burst+piece).
function prand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface ConfettiBurstProps {
  /** Increment to fire a new burst; 0 renders nothing */
  burstKey: number;
  className?: string;
}

/** A one-shot confetti explosion centered on its parent (parent needs position:relative). */
export function ConfettiBurst({ burstKey, className }: ConfettiBurstProps) {
  const pieces = useMemo(() => {
    if (burstKey === 0) return [];
    return Array.from({ length: 26 }, (_, i) => {
      const rnd = (salt: number) => prand(burstKey * 1000 + i * 31 + salt);
      const angle = (Math.PI * 2 * i) / 26 + rnd(1) * 0.5;
      const dist = 70 + rnd(2) * 110;
      return {
        id: `${burstKey}-${i}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40 + rnd(3) * 40,
        r: (rnd(4) - 0.5) * 720,
        color: COLORS[i % COLORS.length],
        delay: rnd(5) * 0.08,
        round: rnd(6) > 0.6,
      };
    });
  }, [burstKey]);

  if (pieces.length === 0) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-visible ${className ?? ''}`} aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            ['--cf-x' as string]: `${p.x}px`,
            ['--cf-y' as string]: `${p.y}px`,
            ['--cf-r' as string]: `${p.r}deg`,
          }}
        />
      ))}
    </div>
  );
}
