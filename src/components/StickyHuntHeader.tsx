import { ArrowRight, Camera, Home, MapPinned } from 'lucide-react';

interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  onResume: () => void;
  photoCount?: number;
  /** Exit-to-home affordance; only rendered when provided. */
  onExit?: () => void;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, onResume, photoCount = 0, onExit }: StickyHuntHeaderProps) {
  return (
    <div className="safe-top fixed left-0 right-0 top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        {/* Left: home + gallery + path */}
        <div className="flex min-w-0 items-center gap-2">
          {onExit && (
            <button
              onClick={onExit}
              className="btn-3d btn-white inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
              aria-label="Back to home"
            >
              <Home className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          <button
            onClick={onOpenGallery}
            className="btn-3d btn-white relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
            aria-label={`Open photo gallery${photoCount > 0 ? ` (${photoCount} photos)` : ''}`}
          >
            <Camera className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            <span className="hidden sm:inline">Gallery</span>
            {photoCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-sun px-1 text-[10px] font-black text-ink">
                {photoCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-grape-soft px-2.5 py-1.5 text-ink">
            <MapPinned className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            <span className="hidden text-xs font-extrabold uppercase tracking-wide sm:inline">Path</span>
            <span className="font-display text-lg leading-none">{pathId}</span>
          </div>

          <button
            onClick={onChangePath}
            className="rounded-xl px-2 py-2 text-sm font-extrabold text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            Change
          </button>
        </div>

        {/* Right: resume */}
        <button
          onClick={onResume}
          className="btn-3d btn-go inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold text-white sm:px-4"
        >
          <span>Resume Hunt</span>
          <ArrowRight className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
