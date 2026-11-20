import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Map, ChevronLeft, ChevronRight, Maximize2, EyeOff } from 'lucide-react';
import type { Category as CategoryType, Challenge } from '@/types';
import { useToggle } from '@/hooks/useToggle';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSwipe } from '@/hooks/useSwipe';
import { useTripleTap } from '@/hooks/useTripleTap';
import { HuntMenu } from '@/components/HuntMenu';
import { StickyHuntHeader } from '@/components/StickyHuntHeader';
import type { EventHunt } from '@/lib/eventHunt';
import { PhotoCapture } from '@/components/PhotoCapture';
import { PhotoGallery } from '@/components/PhotoGallery';
import { StickerArt } from '@/components/StickerArt';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ScriptureClue } from '@/components/ScriptureClue';
import { FinishScreen } from '@/components/FinishScreen';
import { getCategoryTheme, readableTextOn } from '@/lib/theme';
import { getPhotoCount, getPhotosByChallenge, type StoredPhoto } from '@/lib/photoStorage';

function TeamStoryIdeas({ ideas }: { ideas: string[] }) {
  return (
    <details className="mx-auto mt-3 max-w-md rounded-xl border border-ink/20 bg-paper text-sm text-ink">
      <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 font-extrabold focus-visible:outline-offset-2">
        Need a story idea?
      </summary>
      <div className="px-4 pb-4">
        <p className="font-semibold">For your team only. Try one of these or choose your own.</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          {ideas.map(idea => <li key={idea}>{idea}</li>)}
        </ul>
      </div>
    </details>
  );
}

interface CategoriesProps {
  eventHunt?: EventHunt | null;
  onHome: () => void;
  onEditTeam?: () => void;
  onFocusModeChange?: (focused: boolean) => void;
  isVisible: boolean;
  selectedPathId: string;
  pathOrder: number[];
  onAllComplete: () => void;
  bonusUnlocked: boolean;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  /** Reports finished/total challenge counts so the sticky header can show progress. */
  onProgressChange?: (completed: number, total: number) => void;
  onCompletedChange?: (ids: string[]) => void;
  /** Active pack id — used to namespace progress/photos per game. */
  packId: string;
  huntId?: string;
  categories: CategoryType[];
  cluePrompt?: string;
  teamName?: string;
  onReset: (returnFocus: HTMLButtonElement | null) => void;
  /** Finish-screen entry to shared review for this game. */
  onShareWithEvent?: () => void;
}

export function Categories({ isVisible, selectedPathId, pathOrder, onAllComplete, bonusUnlocked, galleryOpen, setGalleryOpen, onProgressChange, onCompletedChange, packId, huntId, categories, cluePrompt, teamName, onReset, onShareWithEvent, eventHunt, onHome, onEditTeam, onFocusModeChange }: CategoriesProps) {
  const [expandedCategoryState, setExpandedCategoryState] = useState<{
    pathId: string;
    categoryId: string | null | undefined;
  }>({ pathId: selectedPathId, categoryId: undefined });
  const [completedChallenges, setCompletedChallenges] = usePersistedState<Set<string>>(`completedChallenges:${huntId ?? packId}`, new Set());
  useEffect(() => { onCompletedChange?.([...completedChallenges]); }, [completedChallenges, onCompletedChange]);
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayModeChallenge, setDisplayModeChallenge] = useState<{category: CategoryType; challengeIndex: number; allChallenges: Challenge[]; flatIndex: number} | null>(null);
  const { value: showAnalogiesEarly, toggle: toggleAnalogiesEarly } = useToggle(`showAnalogiesEarly:${huntId ?? packId}`, false);
  const [challengePhotoCounts, setChallengePhotoCounts] = useState<Record<string, number>>(() => ({}));
  const [challengePhotos, setChallengePhotos] = useState<Record<string, StoredPhoto[]>>(() => ({}));
  const [galleryFilterChallengeId, setGalleryFilterChallengeId] = useState<string | null>(null);
  const [photoCount, onPhotoCountChange] = useState(0);
  const checklistHeading = useRef<HTMLHeadingElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [lastChallengeByPath, setLastChallengeByPath] = usePersistedState<Record<string, string>>(`lastChallenge:${huntId ?? packId}`, {});
  const [recoveryPaths, setRecoveryPaths] = usePersistedState<Set<string>>(`recoveryPaths:${huntId ?? packId}`, new Set());
  const [reviewingCompleted, setReviewingCompleted] = useState(false);

  const celebrate = useCallback(() => setBurstKey(k => k + 1), []);

  // Keep the carousel in exact route order, even when a route crosses categories.
  const orderedChallenges = useMemo(() => {
    const all = categories.flatMap(category => category.challenges);
    return pathOrder.length ? pathOrder.map(number => all[number - 1]).filter(Boolean) : all;
  }, [categories, pathOrder]);

  // The overview groups challenges for easier scanning.
  const orderedCategoryData = useMemo(() => {
    if (pathOrder.length === 0) return categories;

    // Flatten all challenges and reorder them
    const allChallenges = categories.flatMap(cat => cat.challenges);
    const orderedChallenges = pathOrder.map(num => allChallenges[num - 1]).filter(Boolean);

    // Group challenges by category, but reorder categories based on first challenge in path
    const categoryGroups: Record<string, Challenge[]> = {};

    orderedChallenges.forEach(challenge => {
      const category = categories.find(cat => cat.challenges.some(c => c.id === challenge.id));
      if (category) {
        if (!categoryGroups[category.id]) {
          categoryGroups[category.id] = [];
        }
        categoryGroups[category.id].push(challenge);
      }
    });

    // Build result array with categories ordered by their first challenge in the path
    const result: CategoryType[] = [];
    const processedCategories = new Set<string>();

    orderedChallenges.forEach(challenge => {
      const category = categories.find(cat => cat.challenges.some(c => c.id === challenge.id));
      if (category && !processedCategories.has(category.id)) {
        result.push({
          ...category,
          challenges: categoryGroups[category.id]!
        });
        processedCategories.add(category.id);
      }
    });

    return result;
  }, [pathOrder, categories]);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 200);
    }
  }, [isVisible]);

  // Load photo count on mount
  useEffect(() => {
    getPhotoCount(packId, huntId ?? null).then(onPhotoCountChange);
  }, [onPhotoCountChange, packId, huntId]);

  // Load photo counts per challenge
  useEffect(() => {
    const loadChallengePhotos = async () => {
      const allChallenges = orderedCategoryData.flatMap(cat => cat.challenges);
      const photoCountMap: Record<string, number> = {};
      const photosMap: Record<string, StoredPhoto[]> = {};

      for (const challenge of allChallenges) {
        const photos = await getPhotosByChallenge(challenge.id, huntId ?? null);
        photoCountMap[challenge.id] = photos.length;
        photosMap[challenge.id] = photos;
      }

      setChallengePhotoCounts(photoCountMap);
      setChallengePhotos(photosMap);
    };

    loadChallengePhotos();
  }, [orderedCategoryData, huntId]);

  // Handle photo saved callback
  const handlePhotoSaved = useCallback(async () => {
    const count = await getPhotoCount(packId, huntId ?? null);
    onPhotoCountChange(count);

    // Update challenge photo counts and photos
    const photoCountMap: Record<string, number> = {};
    const photosMap: Record<string, StoredPhoto[]> = {};
    const allChallenges = orderedCategoryData.flatMap(cat => cat.challenges);

    for (const challenge of allChallenges) {
      const photos = await getPhotosByChallenge(challenge.id, huntId ?? null);
      photoCountMap[challenge.id] = photos.length;
      photosMap[challenge.id] = photos;
    }

    setChallengePhotoCounts(photoCountMap);
    setChallengePhotos(photosMap);
  }, [orderedCategoryData, onPhotoCountChange, packId, huntId]);

  // Handle gallery photo count change
  const handleGalleryPhotoCountChange = useCallback((count: number) => {
    onPhotoCountChange(count);
  }, [onPhotoCountChange]);

  // Check if all challenges are complete
  useEffect(() => {
    const allChallenges = orderedChallenges;
    const allCompleted = allChallenges.length > 0 && allChallenges.every(c => completedChallenges.has(c.id));
    if (allCompleted) {
      onAllComplete();
    }
  }, [completedChallenges, orderedChallenges, onAllComplete]);

  const defaultExpandedCategory = useMemo(() => {
    if (!isVisible || orderedCategoryData.length === 0) return null;

    const firstIncompleteCategory = orderedCategoryData.find(category =>
      category.challenges.some(challenge => !completedChallenges.has(challenge.id))
    );

    return firstIncompleteCategory?.id ?? orderedCategoryData[0]?.id ?? null;
  }, [completedChallenges, isVisible, orderedCategoryData]);

  const effectiveExpandedCategory = expandedCategoryState.pathId === selectedPathId
    ? (expandedCategoryState.categoryId === undefined ? defaultExpandedCategory : expandedCategoryState.categoryId)
    : defaultExpandedCategory;

  const toggleCategory = (id: string) => {
    setExpandedCategoryState({
      pathId: selectedPathId,
      categoryId: effectiveExpandedCategory === id ? null : id
    });
  };

  const toggleChallenge = (challengeId: string) => {
    setReviewingCompleted(false);
    const newCompleted = new Set(completedChallenges);
    if (newCompleted.has(challengeId)) {
      newCompleted.delete(challengeId);
    } else {
      newCompleted.add(challengeId);
      celebrate();
    }
    setCompletedChallenges(newCompleted);
  };

  // Idempotent completion used for photo capture: taking another photo on an
  // already-complete task must never mark it incomplete.
  const markChallengeComplete = useCallback((challengeId: string) => {
    setReviewingCompleted(false);
    setCompletedChallenges(prev => {
      if (prev.has(challengeId)) return prev;
      celebrate();
      return new Set(prev).add(challengeId);
    });
  }, [setCompletedChallenges, celebrate]);

  const getTotalProgress = useCallback(() => {
    const allChallenges = orderedChallenges;
    const completed = allChallenges.filter(c => completedChallenges.has(c.id)).length;
    return { completed, total: allChallenges.length };
  }, [orderedChallenges, completedChallenges]);

  const totalProgress = getTotalProgress();

  useEffect(() => {
    onProgressChange?.(totalProgress.completed, totalProgress.total);
  }, [onProgressChange, totalProgress.completed, totalProgress.total]);

  const enterDisplayMode = (category: CategoryType, challengeIndex: number) => {
    const allChallenges = orderedChallenges;
    const flatIndex = allChallenges.findIndex(c => c.id === category.challenges[challengeIndex].id);
    setDisplayModeChallenge({ category, challengeIndex, allChallenges, flatIndex });
    setLastChallengeByPath(prev => ({ ...prev, [selectedPathId]: category.challenges[challengeIndex].id }));
  };

  const exitDisplayMode = () => {
    setDisplayModeChallenge(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => checklistHeading.current?.focus({ preventScroll: true }));
  };

  // Restore the current clue after a checklist detour, including completed clues.
  // A new hunt falls back to its first unfinished clue.
  const openNextIncomplete = useCallback((restore = false) => {
    const allChallenges = orderedChallenges;
    const saved = restore ? allChallenges.find(c => c.id === lastChallengeByPath[selectedPathId]) : undefined;
    const firstIncomplete = saved ?? allChallenges.find(c => !completedChallenges.has(c.id)) ?? allChallenges[0];
    if (!firstIncomplete) return;
    const category = orderedCategoryData.find(cat => cat.challenges.some(c => c.id === firstIncomplete.id));
    if (!category) return;
    const challengeIndex = category.challenges.findIndex(c => c.id === firstIncomplete.id);
    const flatIndex = allChallenges.indexOf(firstIncomplete);
    setDisplayModeChallenge({ category, challengeIndex, allChallenges, flatIndex });
    if (lastChallengeByPath[selectedPathId] !== firstIncomplete.id) {
      setLastChallengeByPath(prev => ({ ...prev, [selectedPathId]: firstIncomplete.id }));
    }
  }, [orderedCategoryData, orderedChallenges, completedChallenges, lastChallengeByPath, selectedPathId, setLastChallengeByPath]);

  // Auto-open the carousel once per path when the hunt starts (or the path changes).
  // useLayoutEffect sets it before first paint so the busy checklist never flashes.
  // The ref guard (keyed by selectedPathId) ensures exiting to Overview never reopens it.
  const autoOpenedForPath = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!isVisible) return;
    if (autoOpenedForPath.current === selectedPathId) return;
    autoOpenedForPath.current = selectedPathId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time open on hunt start / path change
    openNextIncomplete(true);
  }, [isVisible, selectedPathId, openNextIncomplete]);

  const currentIndex = displayModeChallenge?.flatIndex ?? -1;
  const inRecovery = recoveryPaths.has(selectedPathId) && totalProgress.completed < totalProgress.total;
  const seekUnfinished = inRecovery || currentIndex === orderedChallenges.length - 1;
  // Start after the current clue and wrap in path order, including on a second skip.
  const nextUnfinished = seekUnfinished && displayModeChallenge
    ? [...orderedChallenges.slice(currentIndex + 1), ...orderedChallenges.slice(0, currentIndex)]
        .find(clue => !completedChallenges.has(clue.id))
    : undefined;
  const nextIndex = seekUnfinished
    ? (nextUnfinished ? orderedChallenges.indexOf(nextUnfinished) : -1)
    : currentIndex + 1;

  const navigateDisplayMode = (direction: 'prev' | 'next') => {
    if (!displayModeChallenge) return;

    const { allChallenges, flatIndex } = displayModeChallenge;
    const newFlatIndex = direction === 'prev' ? Math.max(0, flatIndex - 1) : nextIndex;
    if (newFlatIndex < 0) return;
    if (direction === 'next' && nextUnfinished && !inRecovery) {
      setRecoveryPaths(paths => new Set(paths).add(selectedPathId));
    }

    if (newFlatIndex !== flatIndex) {
      const newChallenge = allChallenges[newFlatIndex];
      const newCategory = orderedCategoryData.find(cat => cat.challenges.some(c => c.id === newChallenge.id));
      if (newCategory) {
        const challengeIndex = newCategory.challenges.findIndex(c => c.id === newChallenge.id);
        setDisplayModeChallenge({
          category: newCategory,
          challengeIndex,
          allChallenges,
          flatIndex: newFlatIndex
        });
        setLastChallengeByPath(prev => ({ ...prev, [selectedPathId]: newChallenge.id }));
      }
    }
  };

  // Swipe gesture handlers
  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => navigateDisplayMode('next'),
    onSwipeRight: () => navigateDisplayMode('prev'),
    threshold: 50
  });

  // Gospel analogies show when: bonus is unlocked OR user knows the secret (triple tap)
  const shouldShowAnalogies = () => {
    return bonusUnlocked || showAnalogiesEarly;
  };

  const allComplete = totalProgress.total > 0 && totalProgress.completed === totalProgress.total;

  useLayoutEffect(() => { onFocusModeChange?.(Boolean(displayModeChallenge) && (!allComplete || reviewingCompleted)); }, [displayModeChallenge, allComplete, reviewingCompleted, onFocusModeChange]);
  const huntMenu = <HuntMenu triggerRef={menuTrigger}
    photoCount={photoCount}
    onGallery={() => { setGalleryFilterChallengeId(null); setGalleryOpen(true); }}
    onChecklist={displayModeChallenge || allComplete ? () => { if (allComplete) setReviewingCompleted(true); exitDisplayMode(); } : undefined} eventHunt={eventHunt} onEvent={onShareWithEvent}
    onEditTeam={eventHunt ? undefined : onEditTeam} onStartOver={() => onReset(menuTrigger.current)} onHome={onHome} />;
  const closeGallery = () => { setGalleryOpen(false); setGalleryFilterChallengeId(null); requestAnimationFrame(() => menuTrigger.current?.focus({ preventScroll: true })); };

  if (allComplete && !reviewingCompleted) {
    return <><div className="safe-top fixed inset-x-0 top-0 z-50 flex justify-end bg-paper/95 px-4 py-3">{huntMenu}</div><FinishScreen teamName={teamName} onShareWithEvent={onShareWithEvent} packId={packId} huntId={huntId} pathId={selectedPathId} total={totalProgress.total}
      onReview={() => { setReviewingCompleted(true); setDisplayModeChallenge(null); }}
      onPhotosChanged={handlePhotoSaved}
      galleryOpen={galleryOpen} setGalleryOpen={setGalleryOpen}
    /></>;
  }

  // ============ FOCUS MODE (one challenge at a time) ============
  if (displayModeChallenge) {
    const { category, challengeIndex, allChallenges, flatIndex } = displayModeChallenge;
    const challenge = category.challenges[challengeIndex];
    const isCompleted = completedChallenges.has(challenge.id);
    const showAnalogies = shouldShowAnalogies() || isCompleted;
    const theme = getCategoryTheme(category.id);
    const shots = challengePhotos[challenge.id] ?? [];

    return (
      <>
      <div
        ref={swipeRef}
        className="paper-dots fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: theme.soft }}
      >
        {/* The clue is the primary view. Optional tools have one labeled entry. */}
        <header className="mx-auto flex w-full max-w-2xl flex-shrink-0 items-center gap-3 px-4 pb-2 pt-[max(.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1" role="status" aria-label={`${totalProgress.completed} of ${totalProgress.total} clues done`}>
            <p className="truncate font-display text-lg text-ink">{category.title}</p>
            <p className="text-xs font-bold text-ink/65"><span role="progressbar" aria-label="Hunt progress" aria-valuemin={0} aria-valuemax={totalProgress.total} aria-valuenow={totalProgress.completed}>{totalProgress.completed} of {totalProgress.total} found</span> · Path {selectedPathId}</p>
          </div>
          {huntMenu}
        </header>

        {/* Challenge card */}
        {/* min-h-0 + my-auto (not items-center): a centered flex item taller than the
            scroll area can't be scrolled back to its top, clipping the card after a photo
            adds the "Your shots" strip. Auto margins center when there's room and collapse
            to 0 when overflowing, keeping the top reachable. */}
        <div key={challenge.id} data-testid="clue-scroll" className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto overscroll-contain px-3 pb-3 pt-4 sm:px-4">
          <div className="flat-card relative my-auto w-full max-w-2xl px-4 pb-4 pt-4 md:px-8 md:pb-6">
            <ConfettiBurst burstKey={burstKey} />

            {/* Challenge number: a sticker stuck on the card corner */}
            <span
              className="absolute -left-1 -top-3 flex h-10 min-w-10 rotate-[-8deg] items-center justify-center rounded-xl border-2 border-ink px-1 font-display text-lg"
              style={{ backgroundColor: theme.main, color: readableTextOn(theme.main), boxShadow: '3px 3px 0 0 #2E2459' }}
              aria-label={`Clue #${challenge.number}`}
            >
              #{challenge.number}
            </span>

            <div className="flex items-center justify-center gap-3 pl-5">
              <StickerArt name={theme.art} emoji={theme.emoji} alt="" className="h-12 w-12 flex-shrink-0" emojiSize="2.75rem" />
              <h3 className="font-display text-2xl leading-tight text-ink md:text-3xl">{challenge.title}</h3>
            </div>

            {challenge.scriptureClue && <ScriptureClue clue={challenge.scriptureClue} />}

            {/* What to photograph. Never a spoiler (the gospel connection is separate), so it always shows. */}
            {challenge.photoTarget && (
              <p className="mx-auto mt-3 max-w-md text-center text-base font-semibold leading-snug text-ink/80">
                {challenge.photoTarget}
              </p>
            )}

            {!isCompleted && !galleryOpen && challenge.teamStoryIdeas && <TeamStoryIdeas ideas={challenge.teamStoryIdeas} />}

            {/* Completion. The camera in the bottom bar is the main action (taking a photo
                completes the challenge), so "Mark as done" stays a quiet fallback. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {isCompleted ? (
                <>
                  <span
                    role="status"
                    className="animate-stamp-in inline-flex items-center gap-2 rounded-full border-2 border-ink bg-sun px-3 py-1 font-display text-base text-ink"
                  >
                    <Check className="h-5 w-5" strokeWidth={3.5} />
                    Nailed it!
                  </span>
                  <button
                    onClick={() => toggleChallenge(challenge.id)}
                    className="min-h-11 rounded-full px-4 text-sm font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink"
                  >
                    Undo
                  </button>
                </>
              ) : (
                <button
                  onClick={() => toggleChallenge(challenge.id)}
                  className="btn-3d btn-white inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-display text-base tracking-wide text-ink"
                >
                  <span className="h-4 w-4 rounded-full border-[3px] border-current" />
                  Mark as done
                </button>
              )}
            </div>

            {/* Gospel connection */}
            {showAnalogies ? (
              <div
                className="mt-4 rounded-2xl border-2 border-ink/15 p-3"
                style={{ backgroundColor: theme.soft }}
              >
                <p className="text-sm font-extrabold" style={{ color: theme.text }}>
                  💡 Discuss your discovery
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-snug" style={{ color: theme.text }}>
                  {challenge.gospelConnection}
                </p>
                {challenge.scripture && (
                  <p className="mt-2 text-sm font-bold italic opacity-80" style={{ color: theme.text }}>
                    {challenge.scripture}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/25 bg-paper p-3 text-center">
                <p className="text-base font-semibold italic text-ink/70">
                  🤔 {cluePrompt ?? (challenge.scriptureClue ? 'Which words in the verse fit what you found?' : 'What made your team choose this? Point out the detail that connects it to the gospel for you.')}
                </p>
              </div>
            )}

            {/* Photo thumbnails for this challenge */}
            {shots.length > 0 && (
              <div className="mt-5 border-t-2 border-dashed border-ink/10 pt-4">
                <p className="mb-2 text-center text-sm font-extrabold text-ink/70">
                  Your shots
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {shots.slice(0, 4).map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setGalleryFilterChallengeId(challenge.id);
                        setGalleryOpen(true);
                      }}
                      className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-ink shadow-sticker-sm transition-transform hover:-translate-y-0.5"
                      title={`View photo ${idx + 1}`}
                    >
                      <img src={photo.imageData} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {shots.length > 4 && (
                    <button
                      onClick={() => {
                        setGalleryFilterChallengeId(challenge.id);
                        setGalleryOpen(true);
                      }}
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink/40 bg-paper text-sm font-extrabold text-ink/70 hover:bg-white"
                    >
                      +{shots.length - 4}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* First-run hint only: gone as soon as the team finishes one challenge */}
            {totalProgress.completed === 0 && (
              <p className="mt-3 text-center text-xs font-semibold text-ink/70">
                Tap the camera to take a photo; that counts as done. Swipe to move between clues.
              </p>
            )}
          </div>
        </div>

        {/* One compact navigation dock. The camera stays reachable while reading. */}
        <nav aria-label="Clue navigation" className="flex-shrink-0 border-t-2 border-ink bg-cream px-4 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-1 min-[360px]:gap-3">
            <button onClick={() => navigateDisplayMode('prev')} disabled={flatIndex === 0} className="btn-3d btn-white flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-ink" aria-label="Previous clue">
              <ChevronLeft className="h-6 w-6" strokeWidth={3} />
            </button>
            <PhotoCapture teamName={teamName} key={challenge.id} pathId={selectedPathId}
              challenge={challenge} category={category} onCaptureComplete={markChallengeComplete}
              onPhotoSaved={handlePhotoSaved} packId={packId} huntId={huntId} variant="display" pulse={!isCompleted}
            />
            <button onClick={() => navigateDisplayMode('next')} disabled={nextIndex < 0} className={`btn-3d ${isCompleted ? 'btn-sky' : 'btn-white'} flex h-12 ${nextUnfinished ? 'w-[5.75rem] shrink-0 px-1' : 'w-12'} flex-col items-center justify-center rounded-2xl text-ink`} aria-label={nextUnfinished ? `Next unfinished clue, #${nextUnfinished.number}` : 'Next clue'}>
              {nextUnfinished ? <>
                <span className="text-[11px] font-extrabold leading-tight">Next unfinished</span>
                <span className="inline-flex items-center text-sm font-extrabold">#{nextUnfinished.number}<ChevronRight className="h-4 w-4" strokeWidth={3} /></span>
              </> : <ChevronRight className="h-6 w-6" strokeWidth={3} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] font-bold text-ink/65">Step {flatIndex + 1} of {allChallenges.length}</p>
        </nav>
      </div>

      {/* Photo Gallery Modal */}
      <PhotoGallery
        isOpen={galleryOpen}
        onClose={closeGallery}
        returnLabel="Back to current clue"
        onPhotoCountChange={handleGalleryPhotoCountChange}
        filterChallengeId={galleryFilterChallengeId}
        packId={packId} huntId={huntId}
      />
      </>
    );
  }

  // ============ OVERVIEW (checklist) ============
  return (
    <>
    <StickyHuntHeader pathId={selectedPathId} teamName={teamName} completed={totalProgress.completed} total={totalProgress.total} onResume={() => { openNextIncomplete(true); requestAnimationFrame(() => menuTrigger.current?.focus({ preventScroll: true })); }} menu={huntMenu} />
    <section className="paper-dots relative pb-16 pt-28 md:pb-20 md:pt-32">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        {allComplete && <button onClick={() => setReviewingCompleted(false)} className="btn-3d btn-go mb-6 w-full rounded-full px-5 py-3 font-bold text-ink">See hunt celebration & photos</button>}
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 ref={checklistHeading} tabIndex={-1} className="font-display text-4xl text-ink outline-none md:text-5xl">
            Hunt checklist
          </h2>
          <p className="mt-2 font-semibold text-ink/70">
            Browse all clues. “Back to current clue” returns you to where you were.
          </p>

          <div className="mt-6">
            <ProgressBar
              completed={totalProgress.completed}
              total={totalProgress.total}
              onTripleTap={toggleAnalogiesEarly}
              bonusUnlocked={bonusUnlocked}
              showAnalogies={showAnalogiesEarly}
            />
          </div>
        </div>

        <div className="space-y-5">
          {orderedCategoryData.map((category, index) => {
            const progress = { completed: category.challenges.filter(c => completedChallenges.has(c.id)).length, total: category.challenges.length };
            const isExpanded = effectiveExpandedCategory === category.id;
            const theme = getCategoryTheme(category.id);
            const categoryDone = progress.completed === progress.total;

            return (
              <div
                key={category.id}
                className={`min-w-0 transform transition-all duration-500 ${
                  isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className={`sticker-card overflow-hidden transition-shadow ${isExpanded ? 'shadow-sticker-lg' : ''}`}>
                  {/* Category header */}
                  <button
                    type="button"
                    className="w-full p-4 text-left sm:p-5"
                    style={{ backgroundColor: theme.soft }}
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <StickerArt
                          name={theme.art}
                          emoji={theme.emoji}
                          alt={category.title}
                          className="h-14 w-14 flex-shrink-0"
                          emojiSize="2.4rem"
                        />
                        <h3 className="font-display text-xl leading-tight text-ink sm:text-2xl">
                          {category.title}
                        </h3>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-extrabold ${
                            categoryDone ? 'bg-go text-ink' : 'bg-white text-ink'
                          }`}
                        >
                          {categoryDone ? '✓ ' : ''}{progress.completed}/{progress.total}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-6 w-6 text-ink" strokeWidth={3} />
                        ) : (
                          <ChevronDown className="h-6 w-6 text-ink" strokeWidth={3} />
                        )}
                      </div>
                    </div>

                    {/* Category progress bar */}
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-ink/60 bg-white">
                      <div
                        className="progress-stripes h-full rounded-full transition-all duration-500"
                        style={{ width: `${(progress.completed / progress.total) * 100}%`, backgroundColor: theme.main }}
                      />
                    </div>
                  </button>

                  {/* Challenges — expandable */}
                  <div className={`overflow-hidden border-t-2 transition-all duration-500 ${
                    isExpanded ? 'max-h-none border-ink/10' : 'max-h-0 border-transparent'
                  }`}>
                    <div className="space-y-3 p-4 sm:p-5">
                      {category.challenges.map((challenge, challengeIndex) => {
                        const isCompleted = completedChallenges.has(challenge.id);
                        const showAnalogies = shouldShowAnalogies() || isCompleted;

                        return (
                          <div
                            key={challenge.id}
                            className={`transform transition-all duration-300 ${
                              isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                            }`}
                            style={{ transitionDelay: `${challengeIndex * 50}ms` }}
                          >
                            <div className={`rounded-2xl border-2 p-3 transition-colors sm:p-4 ${
                              isCompleted
                                ? 'border-go/60 bg-go-soft'
                                : 'border-ink/10 bg-paper hover:border-ink/25'
                            }`}>
                              <div className="flex items-start gap-3">
                                {/* Check button */}
                                <button
                                  onClick={() => toggleChallenge(challenge.id)}
                                  aria-label={isCompleted ? `Mark ${challenge.title} incomplete` : `Mark ${challenge.title} complete`}
                                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                    isCompleted
                                      ? 'border-ink bg-go text-ink shadow-sticker-sm'
                                      : 'border-ink/30 bg-white hover:border-go hover:bg-go-soft'
                                  }`}
                                >
                                  {isCompleted && <Check className="h-5 w-5" strokeWidth={3.5} />}
                                </button>

                                <div className="min-w-0 flex-1">
                                  {/* The number badge sits inside the title button so it flows with the text and never costs its own line.
                                      Tapping the title opens focus mode: a bigger target than the old small icon. */}
                                  <button
                                    onClick={() => enterDisplayMode(category, challengeIndex)}
                                    title="Open in focus mode"
                                    className="block w-full rounded-md text-left leading-snug"
                                  >
                                    <span
                                      className="mr-2 inline-block rounded-lg border-2 border-ink px-1.5 py-0.5 align-middle font-display text-xs"
                                      style={{ backgroundColor: theme.main, color: readableTextOn(theme.main) }}
                                    >
                                      #{challenge.number}
                                    </span>
                                    <span className={`align-middle font-body text-base font-extrabold ${isCompleted ? 'text-ink/70 line-through' : 'text-ink'}`}>
                                      {challenge.title}
                                    </span>
                                  </button>
                                  {(challengePhotoCounts[challenge.id] ?? 0) > 0 && (
                                    <button
                                      onClick={() => {
                                        setGalleryFilterChallengeId(challenge.id);
                                        setGalleryOpen(true);
                                      }}
                                      className="mt-1.5 inline-flex items-center gap-1 rounded-full border-2 border-ink/20 bg-sky-soft px-2 py-0.5 text-xs font-extrabold text-ink transition-colors hover:border-ink/50"
                                      title={`View ${challengePhotoCounts[challenge.id] ?? 0} photo${(challengePhotoCounts[challenge.id] ?? 0) !== 1 ? 's' : ''} in gallery`}
                                    >
                                      <Camera className="h-3 w-3" strokeWidth={3} />
                                      <span>{challengePhotoCounts[challenge.id] ?? 0}</span>
                                    </button>
                                  )}

                                  {challenge.scriptureClue && <ScriptureClue clue={challenge.scriptureClue} />}
                                  <div className="mt-1.5 space-y-2">
                                    {showAnalogies ? (
                                      <>
                                        {challenge.photoTarget && (
                                          <div className="flex items-start gap-2 text-sm font-semibold text-ink/70">
                                            <Camera className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.5} style={{ color: theme.main }} />
                                            <span>{challenge.photoTarget}</span>
                                          </div>
                                        )}
                                        <div
                                          className="flex items-start gap-2 rounded-xl border-2 border-ink/10 p-2.5 text-sm font-semibold"
                                          style={{ backgroundColor: theme.soft, color: theme.text }}
                                        >
                                          <span className="mt-0.5 flex-shrink-0">💡</span>
                                          <span>{challenge.gospelConnection}</span>
                                        </div>
                                        {challenge.scripture && (
                                          <div className="text-xs font-bold italic text-ink/70">
                                            {challenge.scripture}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      /* What to look for. Teams can discuss a clue after completing it. */
                                      challenge.photoTarget && (
                                        <p className="text-sm font-semibold leading-snug text-ink/70">{challenge.photoTarget}</p>
                                      )
                                    )}
                                  </div>

                                  {!isCompleted && !galleryOpen && challenge.teamStoryIdeas && <TeamStoryIdeas ideas={challenge.teamStoryIdeas} />}

                                  {/* Photo thumbnails */}
                                  {(challengePhotos[challenge.id] ?? []).length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {(challengePhotos[challenge.id] ?? []).slice(0, 4).map((photo, idx) => (
                                        <button
                                          key={photo.id}
                                          onClick={() => {
                                            setGalleryFilterChallengeId(challenge.id);
                                            setGalleryOpen(true);
                                          }}
                                          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 border-ink/60 transition-transform hover:-translate-y-0.5"
                                          title={`View ${challenge.title} photo ${idx + 1}`}
                                        >
                                          <img src={photo.imageData} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                                        </button>
                                      ))}
                                      {(challengePhotos[challenge.id] ?? []).length > 4 && (
                                        <button
                                          onClick={() => {
                                            setGalleryFilterChallengeId(challenge.id);
                                            setGalleryOpen(true);
                                          }}
                                          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink/30 bg-white text-sm font-extrabold text-ink/70"
                                        >
                                          +{(challengePhotos[challenge.id] ?? []).length - 4}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions: one camera button on phones; focus-mode shortcut too on wider screens */}
                                <div className="flex flex-shrink-0 items-center gap-2">
                                  <button
                                    onClick={() => enterDisplayMode(category, challengeIndex)}
                                    className="hidden flex-shrink-0 rounded-xl border-2 border-ink/15 bg-white p-2 text-ink/70 transition-colors hover:border-ink/40 hover:text-ink sm:block"
                                    title="Focus Mode"
                                    aria-label={`Open ${challenge.title} in focus mode`}
                                  >
                                    <Maximize2 className="h-5 w-5" strokeWidth={2.5} />
                                  </button>

                                  <PhotoCapture teamName={teamName} pathId={selectedPathId}
                                    challenge={challenge}
                                    category={category}
                                    onCaptureComplete={markChallengeComplete}
                                    onPhotoSaved={handlePhotoSaved}
                                    packId={packId} huntId={huntId}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>

    {/* Photo Gallery Modal */}
    <PhotoGallery
      isOpen={galleryOpen}
      onClose={closeGallery}
      returnLabel="Back to checklist"
      onPhotoCountChange={handleGalleryPhotoCountChange}
      onPhotoDeleted={handlePhotoSaved}
      filterChallengeId={galleryFilterChallengeId}
      packId={packId} huntId={huntId}
    />
  </>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  completed: number;
  total: number;
  onTripleTap: () => void;
  bonusUnlocked: boolean;
  showAnalogies: boolean;
}

function ProgressBar({ completed, total, onTripleTap, bonusUnlocked, showAnalogies }: ProgressBarProps) {
  const progressBarRef = useTripleTap<HTMLDivElement>({
    onTripleTap,
    tapThreshold: 3,
    timeThreshold: 500
  });

  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-1.5 flex items-end justify-between px-1">
        <span className="text-sm font-extrabold text-ink/70">Progress</span>
        <span className="font-display text-lg leading-none text-ink">{completed} <span className="text-ink/70">/ {total}</span></span>
      </div>
      <div
        ref={progressBarRef}
        className="group relative h-6 cursor-pointer overflow-hidden rounded-full border-2 border-ink bg-white shadow-sticker-sm"
        title={bonusUnlocked ? 'Triple tap to toggle gospel analogies' : ''}
      >
        <div
          className="progress-stripes h-full rounded-full bg-go transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {bonusUnlocked && !showAnalogies && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink/15 bg-cream px-3 py-1.5 text-xs font-bold text-ink/70">
            <Map className="h-3 w-3" />
            Triple tap the bar to reveal all gospel analogies
          </span>
        </div>
      )}

      {showAnalogies && (
        <div className="mt-2 text-center">
          <button
            onClick={onTripleTap}
            className="mx-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-ink/70 transition-colors hover:text-ink"
          >
            <EyeOff className="h-3 w-3" />
            Hide gospel analogies
          </button>
        </div>
      )}
    </div>
  );
}
