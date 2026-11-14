import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

/** Toggle chip used by the create wizard and the join screen. */
export function Chip({ pressed, onClick, children, disabled }: { pressed: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border-2 border-ink px-3.5 text-left text-sm font-extrabold leading-tight text-ink transition-transform disabled:cursor-not-allowed disabled:opacity-45 ${pressed ? '-translate-y-0.5 bg-sun shadow-[2px_2px_0_0_#2E2459]' : 'bg-cream hover:bg-white'}`}
    >
      {pressed && <Check className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={4} aria-hidden="true" />}
      <span className="min-w-0 break-words">{children}</span>
    </button>
  );
}
