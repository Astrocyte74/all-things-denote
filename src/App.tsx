import { lazy, Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Header } from '@/sections/Header';
import { PathSelection } from '@/sections/PathSelection';
import { Rules } from '@/sections/Rules';
import { Categories } from '@/sections/Categories';
import { BonusSection } from '@/sections/BonusSection';
import { Footer } from '@/sections/Footer';
import { StartOverDialog } from '@/components/StartOverDialog';
import { GameLibrary, type GameSummary } from '@/sections/GameLibrary';
import { PACKS, getPackById, DEFAULT_PACK_ID } from '@/data/packs';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Toaster } from '@/components/ui/sonner';
import { OfflineNotice } from '@/components/OfflineNotice';
import { getPhotoCount } from '@/lib/photoStorage';
import { resetGame } from '@/lib/resetGame';
import { cleanTeamName, TEAM_NAME_LIMIT } from '@/lib/teamName';
import { openReview, openReviewHome, readReviewRoute, type ReviewRoute, type EventAccess, type ReviewSnapshot } from '@/lib/sharedReview';
import { eventHuntId, makeEventHunt, type EventHunt } from '@/lib/eventHunt';
import { recordEventProgress, startProgressSync } from '@/lib/eventProgress';
import { startPhotoSync } from '@/lib/photoSync';
import { startPhotoStatusSync } from '@/lib/photoStatus';
import { PhotoAutoSendControl } from '@/components/shared-review/PhotoAutoSendControl';
import './App.css';

const SharedReview = lazy(() => import('@/components/SharedReview').then(module => ({ default: module.SharedReview })));

type AppState = 'library' | 'game' | 'path-selection' | 'rules' | 'hunt';

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
  useEffect(startProgressSync, []);
  useEffect(startPhotoSync, []);
  useEffect(startPhotoStatusSync, []);
  const [existingHunts] = useState(findExistingHunts);
  const [savedAppState, setAppState] = usePersistedState<AppState>('huntScreen', 'library');
  const [startedByPack, setStartedByPack] = usePersistedState<Record<string, boolean>>('startedByPack', existingHunts);
  const [activePackId, setActivePackId] = usePersistedState<string>('activePackId', DEFAULT_PACK_ID);
  // Per-pack path memory: { scavenger: 'A', creation: 'C' } so switching packs
  // doesn't lose each game's chosen path.
  const [pathByPack, setPathByPack] = usePersistedState<Record<string, string>>('pathByPack', {});
  const [teamNameByPack, setTeamNameByPack] = usePersistedState<Record<string, string>>('teamNameByPack', {});
  const [eventHunt, setEventHunt] = usePersistedState<EventHunt | null>('activeEventHunt:v1', null);
  const [savedEventHunts, setSavedEventHunts] = usePersistedState<Record<string, EventHunt>>('eventHunts:v1', eventHunt ? { [eventHuntId(eventHunt.event.id, eventHunt.team.id)]: eventHunt } : {});
  const [photoCountsByPack, setPhotoCountsByPack] = useState<Record<string, number>>({});
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [pathSelectionOpen, setPathSelectionOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const rulesRef = useRef<HTMLDivElement>(null);
  // Shared review lives in the URL hash (private links + QR open it directly).
  // It overlays the app; hunt state underneath is untouched.
  const [reviewRoute, setReviewRoute] = useState<ReviewRoute | null>(readReviewRoute);
  useEffect(() => {
    const onHash = () => setReviewRoute(readReviewRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const leaveReview = () => {
    // pushState (not hash='') leaves a clean URL; browser Back returns to the event.
    history.pushState(null, '', location.pathname + location.search);
    setReviewRoute(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleProgressChange = useCallback((completed: number, total: number) => {
    setProgress(previous =>
      previous.completed === completed && previous.total === total
        ? previous
        : { completed, total }
    );
  }, []);

  const pack = getPackById(activePackId);

  const activeEvent = eventHunt?.event.packId === pack.id ? eventHunt : null;
  const huntId = activeEvent ? eventHuntId(activeEvent.event.id, activeEvent.team.id) : undefined;
  const selectedPathId = activeEvent?.pathId ?? pathByPack[pack.id] ?? '';
  const selectedPath = pack.paths.find((p) => p.id === selectedPathId);
  const appState = ['library', 'game', 'path-selection', 'rules', 'hunt'].includes(savedAppState)
    && (savedAppState !== 'hunt' || selectedPath) ? savedAppState : 'library';
  const teamNameInput = activeEvent?.team.name ?? teamNameByPack[pack.id] ?? '';
  const teamName = cleanTeamName(teamNameInput);
  const handleCompletedChange = useCallback((ids: string[]) => {
    if (activeEvent) recordEventProgress(activeEvent, ids);
  }, [activeEvent]);

  useEffect(() => {
    if (appState !== 'library') return;
    let cancelled = false;
    void Promise.all(PACKS.map(async game => [game.id, await getPhotoCount(game.id, null)] as const))
      .then(entries => { if (!cancelled) setPhotoCountsByPack(Object.fromEntries(entries)); })
      .catch(() => { /* Saved paths/progress still expose reset if photo storage is unavailable. */ });
    return () => { cancelled = true; };
  }, [appState, libraryRevision]);

  useEffect(() => {
    if (libraryRevision > 0 && !resetTarget && appState === 'library') {
      document.getElementById('game-library-title')?.focus();
    }
  }, [libraryRevision, resetTarget, appState]);

  const [resetReturnFocus, setResetReturnFocus] = useState<HTMLElement | null>(null);
  const [focusedHunt, setFocusedHunt] = useState(true);
  const canResume = Boolean(selectedPath && startedByPack[pack.id]);
  const summaries: Record<string, GameSummary> = Object.fromEntries(PACKS.map(game => {
    const ids = game.categories.flatMap(category => category.challenges.map(challenge => challenge.id));
    let completed = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(`completedChallenges:${game.id}`) ?? '[]');
      if (Array.isArray(saved)) completed = ids.filter(id => saved.includes(id)).length;
    } catch { /* An unavailable save starts with no completed challenges. */ }
    const pathId = game.paths.find(path => path.id === pathByPack[game.id])?.id;
    return [game.id, { completed, total: ids.length, started: Boolean(pathId && (startedByPack[game.id] || completed)), pathId, teamName: cleanTeamName(teamNameByPack[game.id]), hasSavedData: Boolean(pathId || teamNameByPack[game.id] || completed || photoCountsByPack[game.id]) }];
  }));

  const setSelectedPathId = (pathId: string) => {
    setPathByPack((prev) => ({ ...prev, [pack.id]: pathId }));
  };

  const handleTeamNameChange = (name: string) => {
    setTeamNameByPack(prev => ({ ...prev, [pack.id]: name.slice(0, TEAM_NAME_LIMIT) }));
  };

  // ── Pack + flow handlers ────────────────────────────────────────────────
  const handlePickPack = (id: string) => {
    setEventHunt(null);
    setActivePackId(id);
    setBonusUnlocked(false);
    setGalleryOpen(false);
    setProgress({ completed: summaries[id].completed, total: summaries[id].total });
    setAppState('game');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleResumePack = (id: string) => {
    handlePickPack(id);
    setStartedByPack(prev => ({ ...prev, [id]: true }));
    setAppState('hunt');
  };

  const prepareEventHunt = (access: EventAccess, snapshot: ReviewSnapshot, play = false) => {
    const next = makeEventHunt(access, snapshot);
    if (!next) return;
    const scope = eventHuntId(next.event.id, next.team.id);
    const scanned = reviewRoute?.screen === 'event' ? reviewRoute.access : null;
    next.joinToken = scanned?.role === 'join' && scanned.eventId === next.event.id
      ? scanned.token : savedEventHunts[scope]?.joinToken;
    setEventHunt(next);
    setSavedEventHunts(previous => ({ ...previous, [scope]: next }));
    setActivePackId(next.event.packId);
    setBonusUnlocked(false);
    setGalleryOpen(false);
    setPathSelectionOpen(false);
    setProgress({ completed: 0, total: 0 });
    setAppState(startedByPack[scope] ? 'hunt' : 'rules');
    if (play) leaveReview();
  };
  const returnToEvent = () => {
    if (activeEvent) openReview(activeEvent.access);
    else openReviewHome(pack.id);
  };

  const handleStart = () => {
    // Always start at Step 1 (path selection). A previously chosen path is
    // pre-selected there so the user can confirm it or pick a different one.
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePathSelected = (pathId: string) => {
    setSelectedPathId(pathId);
    setTeamNameByPack(prev => ({ ...prev, [pack.id]: teamName }));
    setPathSelectionOpen(false);

    // If we're in initial flow (landing/path-selection), go to rules
    if (appState === 'game' || appState === 'path-selection') {
      setAppState('rules');
      setTimeout(() => {
        rulesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    // If we're in hunt mode, stay there (modal closes, game continues)
  };

  const handleChangePath = () => {
    if (activeEvent) { returnToEvent(); return; }
    if (appState === 'rules' || appState === 'game') {
      setAppState('path-selection');
    } else {
      setPathSelectionOpen(true);
    }
  };

  const handleStartHunt = () => {
    setStartedByPack(prev => ({ ...prev, [huntId ?? pack.id]: true }));
    setAppState('hunt');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToLanding = () => {
    setAppState('library');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToPathSelection = () => {
    if (activeEvent) { returnToEvent(); return; }
    setAppState('path-selection');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleResetGame = async (deletePhotos: boolean) => {
    if (!resetTarget) return;
    const id = resetTarget;
    const scope = appState !== 'library' && id === pack.id ? huntId : undefined;
    await resetGame(id, deletePhotos, scope);
    if (scope && activeEvent) recordEventProgress(activeEvent, []);
    setStartedByPack(prev => ({ ...prev, [scope ?? id]: false }));
    if (deletePhotos && !scope) {
      setPathByPack(prev => { const next = { ...prev }; delete next[id]; return next; });
      setTeamNameByPack(prev => { const next = { ...prev }; delete next[id]; return next; });
      setPhotoCountsByPack(prev => ({ ...prev, [id]: 0 }));
    }
    setLibraryRevision(previous => previous + 1);
    if (id === pack.id) setBonusUnlocked(false);
    if (appState !== 'library') {
      setActivePackId(id);
      setGalleryOpen(false);
      setPathSelectionOpen(false);
      setAppState(scope ? 'rules' : 'path-selection');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleAllCategoriesComplete = useCallback(() => {
    setBonusUnlocked(true);
  }, []);

  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
      {reviewRoute ? (
        <Suspense fallback={<p role="status" className="p-8 text-center font-display text-2xl">Opening group events…</p>}>
        <SharedReview
          route={reviewRoute}
          onBack={() => { leaveReview(); setAppState('library'); }}
          onPlay={(access, snapshot) => prepareEventHunt(access, snapshot, true)}
          onJoined={(access, snapshot) => prepareEventHunt(access, snapshot, true)}
        />
        </Suspense>
      ) : <>
      {appState === 'library' && Object.keys(savedEventHunts).length > 0 && (
        <details open={Boolean(activeEvent)} className="mx-auto max-w-5xl px-4 pt-5 text-ink">
          <summary className="min-h-11 cursor-pointer rounded-2xl border-2 border-ink bg-sky-soft p-3 font-extrabold">Saved team hunts on this device ({Object.keys(savedEventHunts).length})</summary>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(savedEventHunts).map(([id, saved]) => <li key={id} className="sticker-card bg-cream p-4">
              <p className="font-display text-xl">{saved.event.title}</p>
              <p className="text-sm font-semibold">{getPackById(saved.event.packId).title} · {saved.team.name} · Path {saved.pathId}</p>
              <p className="mt-1 text-sm text-ink/70">Saved here for offline play, even after the cloud event ends.</p>
              <button className="btn-3d btn-white mt-3 min-h-11 rounded-2xl px-4 font-extrabold" onClick={() => { setEventHunt(saved); setActivePackId(saved.event.packId); setBonusUnlocked(false); setGalleryOpen(false); setProgress({completed:0,total:0}); setAppState(startedByPack[id] ? 'hunt' : 'rules'); }}>Continue {saved.team.name}</button>
            </li>)}
          </ul>
        </details>
      )}
      {appState === 'library' && <GameLibrary packs={PACKS} summaries={summaries} onSelect={handlePickPack} onResume={handleResumePack} onReset={setResetTarget} onOpenSharedReview={intent => openReviewHome(undefined, intent)} />}
      {appState === 'game' && <Header hunt={activeEvent} pack={pack} onBack={handleBackToLanding} onStart={handleStart} onContinue={canResume ? handleStartHunt : undefined} />}

      {/* Path Selection */}
      {appState === 'path-selection' && (
        <PathSelection
          onPathSelected={handlePathSelected}
          isVisible={appState === 'path-selection'}
          onBack={() => setAppState('game')}
          initialPathId={selectedPathId}
          teamName={teamNameInput} onTeamNameChange={handleTeamNameChange}
          paths={pack.paths}
          categories={pack.categories}
        />
      )}

      {activeEvent && appState === 'rules' && <div className="bg-sky-soft px-4 py-4 text-center"><p className="font-extrabold">{activeEvent.event.title} · {teamName} · Path {selectedPathId}</p><p className="mx-auto mt-1 max-w-lg text-sm font-semibold">Clue progress syncs to your leader when online. Choose below how to send photos.</p><button onClick={returnToEvent} className="mt-1 min-h-11 font-bold underline">Back to event</button></div>}
      {activeEvent && appState === 'rules' && <div className="mx-auto max-w-3xl px-4 pt-4"><PhotoAutoSendControl hunt={activeEvent} /></div>}
      {/* Rules (shown at top during rules phase) */}
      {appState === 'rules' && (
        <div ref={rulesRef}>
          <Rules hunt={activeEvent} isVisible={true} collapsed={false} onChangePath={activeEvent ? undefined : handleChangePath} currentPathId={selectedPathId || 'A'} onBack={activeEvent ? undefined : handleBackToPathSelection} onStart={handleStartHunt} rules={pack.rules} />
        </div>
      )}

      {/* Hunt */}
      {appState === 'hunt' && selectedPath && (
        <>
          <Categories
            key={huntId ?? pack.id}
            teamName={teamName}
            onReset={target => { setResetReturnFocus(target); setResetTarget(pack.id); }}
            onShareWithEvent={returnToEvent}
            isVisible={true}
            selectedPathId={selectedPathId}
            pathOrder={selectedPath.order}
            onAllComplete={handleAllCategoriesComplete}
            bonusUnlocked={bonusUnlocked}
            galleryOpen={galleryOpen}
            setGalleryOpen={setGalleryOpen}
            onProgressChange={handleProgressChange}
            eventHunt={activeEvent}
            onHome={handleBackToLanding}
            onEditTeam={handleChangePath}
            onFocusModeChange={setFocusedHunt}
            cluePrompt={pack.cluePrompt}
            onCompletedChange={handleCompletedChange}
            packId={pack.id}
            huntId={huntId}
            categories={pack.categories}
          />
          {!focusedHunt && <>
          <BonusSection isVisible={true} isUnlocked={bonusUnlocked} total={progress.total} bonusItems={pack.bonusItems} />
          <Footer pack={pack} />
          {/* Collapsed rules at bottom during hunt */}
          <Rules hunt={activeEvent} isVisible={false} collapsed={true} onChangePath={activeEvent ? undefined : handleChangePath} currentPathId={selectedPathId || 'A'} onBack={activeEvent ? undefined : handleBackToPathSelection} rules={pack.rules} />

          </>}

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
                  teamName={teamNameInput} onTeamNameChange={handleTeamNameChange}
                  paths={pack.paths}
                  categories={pack.categories}
                />
              </div>
            </div>
          )}

        </>
      )}

      <StartOverDialog
        returnFocus={resetReturnFocus}
        isOpen={resetTarget !== null}
        eventTeam={appState !== 'library' ? activeEvent?.team.name : undefined}
        gameTitle={resetTarget ? getPackById(resetTarget).title : undefined}
        onClose={() => setResetTarget(null)}
        onResetProgress={() => handleResetGame(false)}
        onResetAll={() => handleResetGame(true)}
      />
      </>}

      {/* Toast notifications */}
      <OfflineNotice sharedReview={Boolean(reviewRoute)} />
      <Toaster />
    </div>
  );
}

export default App;
