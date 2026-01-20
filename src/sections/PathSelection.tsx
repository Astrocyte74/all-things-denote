import { useState, useEffect } from 'react';
import { Map, ChevronRight, Shuffle, ArrowRight, ArrowLeft, Repeat, Zap } from 'lucide-react';
import { PATHS, getPathById } from '@/data/paths';
import { Button } from '@/components/ui/button';

interface PathSelectionProps {
  onPathSelected: (pathId: string) => void;
  isVisible: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'A': <ArrowRight className="w-5 h-5" />,
  'B': <ArrowLeft className="w-5 h-5" />,
  'C': <Repeat className="w-5 h-5" />,
  'D': <Map className="w-5 h-5" />,
  'E': <Shuffle className="w-5 h-5" />,
  'F': <Zap className="w-5 h-5" />
};

export function PathSelection({ onPathSelected, isVisible }: PathSelectionProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [isVisible]);

  const handleSelectPath = (pathId: string) => {
    setSelectedPath(pathId);
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onPathSelected(selectedPath);
    }
  };

  const selectedPathData = selectedPath ? getPathById(selectedPath) : null;

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50 relative">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Path
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Select a path for your group. Each path presents the challenges in a different order to keep groups spread out!
          </p>
          
          {selectedPathData && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Selected: {selectedPathData.name}
              </p>
              <p className="text-blue-600 text-sm mt-1">
                {selectedPathData.description}
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PATHS.map((path, index) => (
            <div
              key={path.id}
              className={`transform transition-all duration-500 ${
                isAnimated 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => handleSelectPath(path.id)}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedPath === path.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    selectedPath === path.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {iconMap[path.id]}
                  </div>
                  <h3 className="font-bold text-gray-900">
                    {path.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {path.description}
                </p>
                <div className="mt-3 text-xs text-gray-500">
                  Challenge order: {path.order.slice(0, 5).join(', ')}...
                </div>
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={handleConfirm}
            disabled={!selectedPath}
            size="lg"
            className={`px-8 py-6 text-lg rounded-full transition-all duration-300 ${
              selectedPath
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Hunt with Path {selectedPath || ''}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
