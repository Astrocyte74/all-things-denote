import { ArrowRight, Camera, MapPinned } from 'lucide-react';

interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  onResume: () => void;
  photoCount?: number;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, onResume, photoCount = 0 }: StickyHuntHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm safe-top">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Gallery + Path + Change (Gallery lives on the left to match the focus-mode toolbar) */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onOpenGallery}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            aria-label={`Open photo gallery${photoCount > 0 ? ` (${photoCount} photos)` : ''}`}
          >
            <Camera className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Gallery</span>
            {photoCount > 0 && (
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-bold text-purple-700">{photoCount}</span>
            )}
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-purple-800">
            <MapPinned className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-semibold">Path</span>
            <span className="font-black text-lg leading-none">{pathId}</span>
          </div>
          <button
            onClick={onChangePath}
            className="rounded-lg px-2 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            Change
          </button>
        </div>

        {/* Right: Resume Hunt — the obvious way back into focus mode (mirrors the focus-mode "Overview" button position) */}
        <button
          onClick={onResume}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-green-600 px-3 sm:px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700"
        >
          <span>Resume Hunt</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
