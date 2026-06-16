import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Map, Repeat, Shuffle, Zap } from 'lucide-react';
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
    <section className="py-12 md:py-20 bg-gradient-to-b from-white to-gray-50 relative">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Path
          </h2>
          <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
            Give each team a different path so groups naturally spread out and do the same 15 challenges in a different order.
          </p>

          {selectedPathData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left sm:text-center">
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
                aria-pressed={selectedPath === path.id}
                className={`w-full min-h-[180px] p-5 rounded-lg border-2 transition-all duration-300 text-left ${
                  selectedPath === path.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    selectedPath === path.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {iconMap[path.id]}
                  </div>
                  {selectedPath === path.id && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                      <Check className="w-3.5 h-3.5" />
                      Picked
                    </span>
                  )}
                </div>
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Team {index + 1}</div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    Path {path.id}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 min-h-[40px]">
                  {path.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{path.order.length} challenges</span>
                  <span>Starts with #{path.order[0]}</span>
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
            className={`px-8 py-6 text-lg rounded-lg transition-all duration-300 ${
              selectedPath
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedPath ? `Start Hunt with Path ${selectedPath}` : 'Pick a Path to Continue'}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
