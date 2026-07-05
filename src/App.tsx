import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Header } from '@/sections/Header';
import { PathSelection } from '@/sections/PathSelection';
import { Rules } from '@/sections/Rules';
import { Categories, type CategoriesHandle } from '@/sections/Categories';
import { BonusSection } from '@/sections/BonusSection';
import { Footer } from '@/sections/Footer';
import { StickyHuntHeader } from '@/components/StickyHuntHeader';
import { StartOverDialog } from '@/components/StartOverDialog';
import { PackPicker } from '@/sections/PackPicker';
import { PACKS, getPackById, DEFAULT_PACK_ID } from '@/data/packs';
import { setActivePack } from '@/lib/theme';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

type AppState = 'landing' | 'path-selection' | 'rules' | 'hunt';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [activePackId, setActivePackId] = usePersistedState<string>('activePackId', DEFAULT_PACK_ID);
  // Per-pack path memory: { scavenger: 'A', creation: 'C' } so switching packs
  // doesn't lose each game's chosen path.
  const [pathByPack, setPathByPack] = usePersistedState<Record<string, string>>('pathByPack', {});
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [pathSelectionOpen, setPathSelectionOpen] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const rulesRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<CategoriesHandle>(null);

  const pack = getPackById(activePackId);

  // Keep the theme lookups + (via Categories' packId prop) progress/photo keys
  // in sync with whichever pack is active.
  useEffect(() => {
    setActivePack(pack);
  }, [pack]);

  const selectedPathId = pathByPack[pack.id] ?? '';

  const setSelectedPathId = (pathId: string) => {
    setPathByPack((prev) => ({ ...prev, [pack.id]: pathId }));
  };

  // ── Pack + flow handlers ────────────────────────────────────────────────
  const handlePickPack = (id: string) => {
    setActivePackId(id);
    setBonusUnlocked(false);
    setAppState('landing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStart = () => {
    // Always start at Step 1 (path selection). A previously chosen path is
    // pre-selected there so the user can confirm it or pick a different one.
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    if (appState === 'rules' || appState === 'landing') {
      setAppState('path-selection');
    } else {
      setPathSelectionOpen(true);
    }
  };

  const handleStartHunt = () => {
    setAppState('hunt');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToLanding = () => {
    setAppState('landing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToPathSelection = () => {
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStartOverProgress = () => {
    categoriesRef.current?.resetProgress();
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStartOverAll = () => {
    categoriesRef.current?.resetAll();
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleAllCategoriesComplete = () => {
    setBonusUnlocked(true);
  };

  const selectedPath = pack.paths.find((p) => p.id === selectedPathId);

  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
      {/* Landing Page — pack picker, then the active pack's hero */}
      {appState === 'landing' && (
        <>
          <PackPicker packs={PACKS} activePackId={pack.id} onPick={handlePickPack} />
          <Header pack={pack} onStart={handleStart} />
        </>
      )}

      {/* Path Selection */}
      {appState === 'path-selection' && (
        <PathSelection
          onPathSelected={handlePathSelected}
          isVisible={appState === 'path-selection'}
          onBack={handleBackToLanding}
          initialPathId={selectedPathId}
          paths={pack.paths}
        />
      )}

      {/* Rules (shown at top during rules phase) */}
      {appState === 'rules' && (
        <div ref={rulesRef}>
          <Rules isVisible={true} collapsed={false} onChangePath={handleChangePath} currentPathId={selectedPathId || 'A'} onBack={handleBackToPathSelection} rules={pack.rules} />
          <div className="paper-dots border-t-2 border-ink/10 py-10 text-center">
            <button
              onClick={handleStartHunt}
              className="btn-3d btn-go inline-flex items-center gap-3 rounded-full px-10 py-5 font-display text-2xl tracking-wide text-white"
            >
              Start the {pack.title} — Path {selectedPathId}!
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
            onResume={() => categoriesRef.current?.resume()}
            photoCount={photoCount}
            onExit={handleBackToLanding}
            onStartOver={() => setStartOverOpen(true)}
          />

          <Categories
            ref={categoriesRef}
            isVisible={true}
            selectedPathId={selectedPathId}
            pathOrder={selectedPath.order}
            onAllComplete={handleAllCategoriesComplete}
            bonusUnlocked={bonusUnlocked}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            onPhotoCountChange={setPhotoCount}
            packId={pack.id}
            categories={pack.categories}
          />
          <BonusSection isVisible={true} isUnlocked={bonusUnlocked} bonusItems={pack.bonusItems} />
          <Footer pack={pack} />
          {/* Collapsed rules at bottom during hunt */}
          <Rules isVisible={false} collapsed={true} onChangePath={handleChangePath} currentPathId={selectedPathId || 'A'} onBack={handleBackToPathSelection} rules={pack.rules} />

          {/* Path Selection Modal */}
          {pathSelectionOpen && (
            <div className="fixed inset-0 bg-ink/70 z-50">
              <div className="h-full overflow-y-auto">
                <button
                  onClick={() => setPathSelectionOpen(false)}
                  className="btn-3d btn-white absolute right-4 top-4 z-50 rounded-full p-2 text-ink md:right-8 md:top-6"
                  aria-label="Close path selection"
                >
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
                <PathSelection
                  onPathSelected={handlePathSelected}
                  isVisible={true}
                  initialPathId={selectedPathId}
                  paths={pack.paths}
                />
              </div>
            </div>
          )}

          {/* Start Over dialog */}
          <StartOverDialog
            isOpen={startOverOpen}
            onClose={() => setStartOverOpen(false)}
            onResetProgress={handleStartOverProgress}
            onResetAll={handleStartOverAll}
          />
        </>
      )}

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App;
