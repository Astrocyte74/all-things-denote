import { useState, useRef } from 'react';
import { Header } from '@/sections/Header';
import { PathSelection } from '@/sections/PathSelection';
import { Rules } from '@/sections/Rules';
import { Categories } from '@/sections/Categories';
import { BonusSection } from '@/sections/BonusSection';
import { Footer } from '@/sections/Footer';
import { getPathById } from '@/data/paths';
import { usePersistedState } from '@/hooks/usePersistedState';
import './App.css';

type AppState = 'landing' | 'path-selection' | 'rules' | 'hunt';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [selectedPathId, setSelectedPathId] = usePersistedState<string>('selectedPathId', '');
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
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
    setAppState('rules');
    // Scroll to rules section
    setTimeout(() => {
      rulesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleChangePath = () => {
    setAppState('path-selection');
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

      {/* Rules */}
      {(appState === 'rules' || appState === 'hunt') && (
        <div ref={rulesRef}>
          <Rules isVisible={appState === 'rules'} collapsed={appState === 'hunt'} />
          {appState === 'rules' && (
            <div className="py-8 bg-gray-50 text-center">
              <button
                onClick={handleStartHunt}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Start the Hunt with Path {selectedPathId}!
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hunt */}
      {appState === 'hunt' && selectedPath && (
        <>
          <Categories
            isVisible={true}
            selectedPathId={selectedPathId}
            pathOrder={selectedPath.order}
            onAllComplete={handleAllCategoriesComplete}
            onChangePath={handleChangePath}
            bonusUnlocked={bonusUnlocked}
          />
          <BonusSection isVisible={true} isUnlocked={bonusUnlocked} />
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;
