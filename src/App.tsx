import { useState, useRef } from 'react';
import { Header } from '@/sections/Header';
import { PathSelection } from '@/sections/PathSelection';
import { Rules } from '@/sections/Rules';
import { Categories } from '@/sections/Categories';
import { BonusSection } from '@/sections/BonusSection';
import { Footer } from '@/sections/Footer';
import { StickyHuntHeader } from '@/components/StickyHuntHeader';
import { getPathById } from '@/data/paths';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

type AppState = 'landing' | 'path-selection' | 'rules' | 'hunt';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [selectedPathId, setSelectedPathId] = usePersistedState<string>('selectedPathId', '');
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [pathSelectionOpen, setPathSelectionOpen] = useState(false);
  const rulesRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    // If there's a saved path, go directly to rules
    if (selectedPathId) {
      setAppState('rules');
      setTimeout(() => {
        rulesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setAppState('path-selection');
    }
  };

  const handlePathSelected = (pathId: string) => {
    setSelectedPathId(pathId);
    setPathSelectionOpen(false);

    // If we're in initial flow (landing/path-selection), go to rules
    if (appState === 'landing' || appState === 'path-selection') {
      setAppState('rules');
      setTimeout(() => {
        rulesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    // If we're in hunt mode, stay there (modal closes, game continues)
  };

  const handleChangePath = () => {
    setPathSelectionOpen(true);
  };

  const handleStartHunt = () => {
    setAppState('hunt');
  };

  const handleAllCategoriesComplete = () => {
    setBonusUnlocked(true);
  };

  const selectedPath = getPathById(selectedPathId);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Landing Page */}
      {appState === 'landing' && (
        <Header onStart={handleStart} />
      )}

      {/* Path Selection */}
      {appState === 'path-selection' && (
        <PathSelection
          onPathSelected={handlePathSelected}
          isVisible={appState === 'path-selection'}
        />
      )}

      {/* Rules (shown at top during rules phase) */}
      {appState === 'rules' && (
        <div ref={rulesRef}>
          <Rules isVisible={true} collapsed={false} onChangePath={handleChangePath} />
          <div className="py-8 bg-gray-50 text-center">
            <button
              onClick={handleStartHunt}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Start the Hunt with Path {selectedPathId}!
            </button>
          </div>
        </div>
      )}

      {/* Hunt */}
      {appState === 'hunt' && selectedPath && (
        <>
          {/* Sticky Header */}
          <StickyHuntHeader
            pathId={selectedPathId}
            onChangePath={handleChangePath}
            onOpenGallery={() => setGalleryOpen(true)}
            photoCount={photoCount}
          />

          <Categories
            isVisible={true}
            selectedPathId={selectedPathId}
            pathOrder={selectedPath.order}
            onAllComplete={handleAllCategoriesComplete}
            bonusUnlocked={bonusUnlocked}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            onPhotoCountChange={setPhotoCount}
          />
          <BonusSection isVisible={true} isUnlocked={bonusUnlocked} />
          <Footer />
          {/* Collapsed rules at bottom during hunt */}
          <Rules isVisible={false} collapsed={true} onChangePath={handleChangePath} />

          {/* Path Selection Modal */}
          {pathSelectionOpen && (
            <div className="fixed inset-0 bg-black/60 z-50">
              <div className="h-full overflow-y-auto">
                <PathSelection
                  onPathSelected={handlePathSelected}
                  isVisible={true}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App;
