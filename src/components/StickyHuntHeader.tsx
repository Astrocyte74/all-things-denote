interface StickyHuntHeaderProps {
  pathId: string;
  onChangePath: () => void;
  onOpenGallery: () => void;
  photoCount?: number;
}

export function StickyHuntHeader({ pathId, onChangePath, onOpenGallery, photoCount = 0 }: StickyHuntHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Path Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Path</span>
            <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-lg">
              {pathId}
            </span>
          </div>
          <button
            onClick={onChangePath}
            className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
          >
            Change
          </button>
        </div>

        {/* View Gallery */}
        <button
          onClick={onOpenGallery}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <span>📸</span>
          <span>View Gallery</span>
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
