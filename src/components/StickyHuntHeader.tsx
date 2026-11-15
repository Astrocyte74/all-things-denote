import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface StickyHuntHeaderProps {
  pathId: string;
  teamName?: string;
  completed: number;
  total: number;
  onResume: () => void;
  menu: ReactNode;
}

/** The checklist is an optional detour, with a way back that stays visible
 * even after scrolling through the list. Team/path are context, not shortcuts. */
export function StickyHuntHeader({ pathId, teamName, completed, total, onResume, menu }: StickyHuntHeaderProps) {
  return <header className="safe-top fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
    <nav aria-label="Hunt controls" className="mx-auto max-w-3xl px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onResume} className="btn-3d btn-go inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-ink"><ArrowLeft className="h-4 w-4 flex-shrink-0" strokeWidth={3} /> Back to current clue</button>
        {menu}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-ink/65">
        <p className="min-w-0 truncate">{teamName ? `${teamName} · ` : ''}Path {pathId}</p>
        <p role="status" aria-label={`${completed} of ${total} clues done`} className="flex-shrink-0">{completed} of {total} found</p>
      </div>
    </nav>
  </header>;
}
