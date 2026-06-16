import { Camera, MapPinned } from 'lucide-react';

interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  photoCount?: number;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, photoCount = 0 }: StickyHuntHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm safe-top">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Path Info */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-purple-800">
            <MapPinned className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-semibold">Path</span>
            <span className="font-black text-lg leading-none">
              {pathId}
            </span>
          </div>
          <button
            onClick={onChangePath}
            className="rounded-lg px-2 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            Change
          </button>
        </div>

        {/* View Gallery */}
        <button
          onClick={onOpenGallery}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 sm:px-4"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Gallery</span>
          {photoCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {photoCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
