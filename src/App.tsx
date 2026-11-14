import { useState, useRef, useEffect, useCallback } from 'react';
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
import { OfflineNotice } from '@/components/OfflineNotice';
import { toast } from 'sonner';
import './App.css';

type AppState = 'landing' | 'path-selection' | 'rules' | 'hunt';

function findExistingHunts(): Record<string, boolean> {
  const existing: Record<string, boolean> = {};
  for (const pack of PACKS) {
    try {
      const completed = JSON.parse(localStorage.getItem(`completedChallenges:${pack.id}`) ?? '[]');
      existing[pack.id] = Array.isArray(completed) && completed.length > 0;
    } catch { /* Ignore malformed or unavailable old storage. */ }
  }
  return existing;
}

function App() {
  const [existingHunts] = useState(findExistingHunts);
  const [savedAppState, setAppState] = usePersistedState<AppState>('huntScreen', 'landing');
  const [startedByPack, setStartedByPack] = usePersistedState<Record<string, boolean>>('startedByPack', existingHunts);
  const [activePackId, setActivePackId] = usePersistedState<string>('activePackId', DEFAULT_PACK_ID);
  // Per-pack path memory: { scavenger: 'A', creation: 'C' } so switching packs
  // doesn't lose each game's chosen path.
  const [pathByPack, setPathByPack] = usePersistedState<Record<string, string>>('pathByPack', {});
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 15 });
  const [pathSelectionOpen, setPathSelectionOpen] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const rulesRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<CategoriesHandle>(null);

  const handleProgressChange = useCallback((completed: number, total: number) => {
    setProgress(previous =>
      previous.completed === completed && previous.total === total
        ? previous
        : { completed, total }
    );
  }, []);

  const pack = getPackById(activePackId);

  // Keep the theme lookups + (via Categories' packId prop) progress/photo keys
  // in sync with whichever pack is active.
  useEffect(() => {
    setActivePack(pack);
  }, [pack]);

  const selectedPathId = pathByPack[pack.id] ?? '';
  const selectedPath = pack.paths.find((p) => p.id === selectedPathId);
  const appState = ['landing', 'path-selection', 'rules', 'hunt'].includes(savedAppState)
    && (savedAppState !== 'hunt' || selectedPath) ? savedAppState : 'landing';
  const canResume = Boolean(selectedPath && startedByPack[pack.id]);

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
    setStartedByPack(prev => ({ ...prev, [pack.id]: true }));
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
    setBonusUnlocked(false);
    setStartedByPack(prev => ({ ...prev, [pack.id]: false }));
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStartOverAll = async () => {
    try {
      await categoriesRef.current?.resetAll();
      setBonusUnlocked(false);
      setStartedByPack(prev => ({ ...prev, [pack.id]: false }));
      setAppState('path-selection');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      toast.error('Could not clear photos. Your hunt is still here; please retry.');
    }
  };

  const handleAllCategoriesComplete = useCallback(() => {
    setBonusUnlocked(true);
  }, []);

  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
      {/* Landing Page — pack picker, then the active pack's hero */}
      {appState === 'landing' && (
        <>
          <PackPicker packs={PACKS} activePackId={pack.id} onPick={handlePickPack} />
          <Header pack={pack} onStart={handleStart} onContinue={canResume ? handleStartHunt : undefined} />
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
          categories={pack.categories}
        />
      )}

      {/* Rules (shown at top during rules phase) */}
      {appState === 'rules' && (
        <div ref={rulesRef}>
          <Rules isVisible={true} collapsed={false} onChangePath={handleChangePath} currentPathId={selectedPathId || 'A'} onBack={handleBackToPathSelection} onStart={handleStartHunt} rules={pack.rules} />
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
            completed={progress.completed}
            total={progress.total}
            photoCount={photoCount}
            onExit={handleBackToLanding}
            onStartOver={() => setStartOverOpen(true)}
          />

          <Categories
            key={pack.id}
            ref={categoriesRef}
            isVisible={true}
            selectedPathId={selectedPathId}
            pathOrder={selectedPath.order}
            onAllComplete={handleAllCategoriesComplete}
            bonusUnlocked={bonusUnlocked}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            onPhotoCountChange={setPhotoCount}
            onProgressChange={handleProgressChange}
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
                  categories={pack.categories}
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
      <OfflineNotice />
      <Toaster />
    </div>
  );
}

export default App;
