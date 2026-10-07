import { ArrowRight, Camera, ChevronDown, Home, MapPinned, MoreHorizontal, RotateCcw } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  onResume: () => void;
  photoCount?: number;
  onExit?: () => void;
  onStartOver?: () => void;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, onResume, photoCount = 0, onExit, onStartOver }: StickyHuntHeaderProps) {
  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
      <nav aria-label="Hunt controls" className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
          <button
            onClick={onChangePath}
            aria-label={`Change path, current path ${pathId}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border-2 border-ink bg-grape-soft px-2 text-ink hover:bg-grape/20 sm:gap-1.5 sm:px-2.5"
          >
            <MapPinned className="hidden h-4 w-4 sm:block" strokeWidth={2.5} />
            <span className="text-xs font-extrabold">Path</span>
            <span className="font-display text-lg">{pathId}</span>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={onResume}
            aria-label="Resume Hunt"
            className="btn-3d btn-go inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-extrabold text-white sm:px-4"
          >
            <span>Resume<span className="hidden sm:inline"> Hunt</span></span>
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
          {(onExit || onStartOver) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button aria-label="More hunt options" className="btn-3d btn-white flex h-11 w-11 items-center justify-center rounded-xl text-ink">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={3} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={12} className="sticker-card z-[60] min-w-48 p-2 text-sm font-extrabold text-ink">
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
