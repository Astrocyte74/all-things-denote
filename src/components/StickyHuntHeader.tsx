import { Camera, Home, MoreHorizontal, PencilLine, RotateCcw, Users } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  /** Challenges finished so far, and how many there are in total. */
  completed: number;
  total: number;
  photoCount?: number;
  onExit?: () => void;
  onStartOver?: () => void;
  /** Optional team name; shown compactly beside the path. */
  teamName?: string;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, completed, total, photoCount = 0, onExit, onStartOver, teamName }: StickyHuntHeaderProps) {
  const team = teamName?.trim();
  const editLabel = team ? `Edit team and path. Team ${team}, path ${pathId}` : `Edit team and path. Current path ${pathId}`;
  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
      <nav aria-label="Hunt controls" className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenGallery}
            className="btn-3d btn-white relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-ink"
            aria-label={`Open photo gallery${photoCount > 0 ? ` (${photoCount} photos)` : ''}`}
          >
            <Camera className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Gallery</span>
            {photoCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-sun px-1 text-[10px] font-black text-ink">
                {photoCount}
              </span>
            )}
          </button>
          {/* Team + path chip. Tapping it edits both (same path-selection screen). */}
          <button
            onClick={onChangePath}
            aria-label={editLabel}
            title="Edit team & path"
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl border-2 border-ink bg-grape-soft px-2 text-ink hover:bg-grape/20 sm:px-2.5"
          >
            {team && (
              <span className="flex min-w-0 items-center gap-1">
                <Users className="hidden h-4 w-4 flex-shrink-0 sm:block" strokeWidth={2.5} aria-hidden="true" />
                <span className="min-w-0 max-w-[6.5rem] truncate text-sm font-extrabold sm:max-w-[12rem]">{team}</span>
                <span aria-hidden="true" className="text-ink/40">·</span>
              </span>
            )}
            <span className="flex flex-shrink-0 items-baseline gap-0.5">
              <span className="text-xs font-extrabold">Path</span>
              <span className="font-display text-lg leading-none">{pathId}</span>
            </span>
            <PencilLine className="h-3.5 w-3.5 flex-shrink-0 text-ink/70" strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Progress lives here; the big green Resume button is in the Next up card right below. */}
          <div
            role="status"
            aria-label={`${completed} of ${total} challenges done`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-white px-3"
          >
            <span className="font-display text-lg leading-none text-ink">
              {completed}
              <span className="text-ink/60">/{total}</span>
            </span>
            <span className="hidden text-sm font-extrabold text-ink/70 sm:inline">done</span>
          </div>
          {(onExit || onStartOver) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button aria-label="More hunt options" className="btn-3d btn-white flex h-11 w-11 items-center justify-center rounded-xl text-ink">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={3} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={12} className="sticker-card z-[60] min-w-48 p-2 text-sm font-extrabold text-ink">
                  <DropdownMenu.Item onSelect={onChangePath} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none focus:bg-grape-soft">
                    <PencilLine className="h-4 w-4" /> Edit team & path
                  </DropdownMenu.Item>
                  {onExit && (
                    <DropdownMenu.Item onSelect={onExit} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none focus:bg-grape-soft">
                      <Home className="h-4 w-4" /> Back to home
                    </DropdownMenu.Item>
                  )}
                  {onStartOver && (
                    <DropdownMenu.Item onSelect={onStartOver} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none focus:bg-grape-soft">
                      <RotateCcw className="h-4 w-4" /> Start over
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </nav>
    </div>
  );
}
