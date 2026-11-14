import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Map, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, RotateCcw, EyeOff } from 'lucide-react';
import type { Category as CategoryType, Challenge } from '@/types';
import { useToggle } from '@/hooks/useToggle';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSwipe } from '@/hooks/useSwipe';
import { useTripleTap } from '@/hooks/useTripleTap';
import { PhotoCapture } from '@/components/PhotoCapture';
import { PhotoGallery } from '@/components/PhotoGallery';
import { StickerArt } from '@/components/StickerArt';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ScriptureClue } from '@/components/ScriptureClue';
import { FinishScreen } from '@/components/FinishScreen';
import { getCategoryTheme, readableTextOn } from '@/lib/theme';
import { getPhotoCount, getPhotosByChallenge, type StoredPhoto } from '@/lib/photoStorage';

interface CategoriesProps {
  photoSyncControl?: import('react').ReactNode;
  isVisible: boolean;
  selectedPathId: string;
  pathOrder: number[];
  onAllComplete: () => void;
  bonusUnlocked: boolean;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  onPhotoCountChange: (count: number) => void;
  /** Reports finished/total challenge counts so the sticky header can show progress. */
  onProgressChange?: (completed: number, total: number) => void;
  onCompletedChange?: (ids: string[]) => void;
  /** Active pack id — used to namespace progress/photos per game. */
  packId: string;
  huntId?: string;
  categories: CategoryType[];
  teamName?: string;
  onReset: () => void;
  /** Finish-screen entry to shared review for this game. */
  onShareWithEvent?: () => void;
}

export function Categories({ isVisible, selectedPathId, pathOrder, onAllComplete, bonusUnlocked, galleryOpen, setGalleryOpen, onPhotoCountChange, onProgressChange, onCompletedChange, packId, huntId, categories, teamName, onReset, onShareWithEvent, photoSyncControl }: CategoriesProps) {
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
  const [burstKey, setBurstKey] = useState(0);
  const [lastChallengeByPath, setLastChallengeByPath] = usePersistedState<Record<string, string>>(`lastChallenge:${huntId ?? packId}`, {});
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

  // challenge id -> its category's theme (used to color the progress pips)
  const themeByChallengeId = useMemo(() => {
    const map: Record<string, ReturnType<typeof getCategoryTheme>> = {};
    categories.forEach((cat) => {
      const catTheme = getCategoryTheme(cat.id);
      cat.challenges.forEach((c) => { map[c.id] = catTheme; });
    });
    return map;
  }, [categories]);

  const enterDisplayMode = (category: CategoryType, challengeIndex: number) => {
    const allChallenges = orderedChallenges;
    const flatIndex = allChallenges.findIndex(c => c.id === category.challenges[challengeIndex].id);
    setDisplayModeChallenge({ category, challengeIndex, allChallenges, flatIndex });
    setLastChallengeByPath(prev => ({ ...prev, [selectedPathId]: category.challenges[challengeIndex].id }));
  };

  const exitDisplayMode = () => {
    setDisplayModeChallenge(null);
  };

  // Open the carousel on the first incomplete challenge (used by the auto-open
  // effect, the Overview "Resume Hunt" button, and the "Next up" card).
  const openNextIncomplete = useCallback((restore = false) => {
    const allChallenges = orderedChallenges;
    const saved = restore ? allChallenges.find(c => c.id === lastChallengeByPath[selectedPathId]) : undefined;
    const firstIncomplete = saved ?? allChallenges.find(c => !completedChallenges.has(c.id));
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

  const navigateDisplayMode = (direction: 'prev' | 'next') => {
    if (!displayModeChallenge) return;

    const { allChallenges, flatIndex } = displayModeChallenge;
    let newFlatIndex = flatIndex;

    if (direction === 'prev') {
      newFlatIndex = Math.max(0, flatIndex - 1);
    } else {
      newFlatIndex = Math.min(allChallenges.length - 1, flatIndex + 1);
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

  const allOrderedChallenges = orderedChallenges;
  const nextChallenge = allOrderedChallenges.find(challenge => !completedChallenges.has(challenge.id));
  const allComplete = totalProgress.total > 0 && totalProgress.completed === totalProgress.total;

  if (allComplete && !reviewingCompleted) {
    return <FinishScreen teamName={teamName} onReset={onReset} onShareWithEvent={onShareWithEvent} packId={packId} huntId={huntId} pathId={selectedPathId} total={totalProgress.total}
      onReview={() => { setReviewingCompleted(true); setDisplayModeChallenge(null); }}
      onPhotosChanged={handlePhotoSaved}
      galleryOpen={galleryOpen} setGalleryOpen={setGalleryOpen}
    />;
  }

  // ============ FOCUS MODE (one challenge at a time) ============
  if (displayModeChallenge) {
    const { category, challengeIndex, allChallenges, flatIndex } = displayModeChallenge;
    const challenge = category.challenges[challengeIndex];
    const isCompleted = completedChallenges.has(challenge.id);
    const showAnalogies = shouldShowAnalogies() || Boolean(challenge.scriptureClue && isCompleted);
    const isLastChallenge = flatIndex >= allChallenges.length - 1;
    const totalPhotos = Object.values(challengePhotoCounts).reduce((sum, n) => sum + n, 0);
    const theme = getCategoryTheme(category.id);
    const shots = challengePhotos[challenge.id] ?? [];

    return (
      <>
      <div
        ref={swipeRef}
        className="paper-dots fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: theme.soft }}
      >
        {/* Progress pips: one per challenge in path order, filled with that challenge's category color */}
        <div
          className="mx-auto flex w-full max-w-2xl flex-shrink-0 gap-1 px-4 pt-4"
          role="progressbar"
          aria-label="Hunt progress"
          aria-valuemin={0}
          aria-valuemax={totalProgress.total}
          aria-valuenow={totalProgress.completed}
          aria-valuetext={`${totalProgress.completed} of ${totalProgress.total} done`}
        >
          {allChallenges.map((c, i) => {
            const done = completedChallenges.has(c.id);
            return (
              <span
                key={c.id}
                className="pip"
                data-done={done}
                data-current={i === flatIndex}
                style={done ? { backgroundColor: themeByChallengeId[c.id]?.main } : undefined}
              />
            );
          })}
        </div>

        {/* Top toolbar */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 pt-4">
          <button
            onClick={() => { setGalleryFilterChallengeId(null); setGalleryOpen(true); }}
            className="btn-3d btn-white relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
            aria-label="Open photo gallery"
          >
            <Camera className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Gallery</span>
            {totalPhotos > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-sun px-1 text-[10px] font-black text-ink">
                {totalPhotos}
              </span>
            )}
          </button>

          <span
            className="rounded-full border-2 border-ink px-3 py-1 font-display text-sm"
            style={{ backgroundColor: theme.main, color: readableTextOn(theme.main) }}
          >
            {category.title}
          </span>

          <button
            onClick={exitDisplayMode}
            className="btn-3d btn-white inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
            aria-label="Back to all tasks overview"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Overview</span>
          </button>
        </div>

        {photoSyncControl && <div className="mx-4 mt-2 flex-shrink-0">{photoSyncControl}</div>}
        {huntId && onShareWithEvent && <button onClick={onShareWithEvent} className="mx-4 mt-3 min-h-10 flex-shrink-0 rounded-xl border-2 border-ink bg-cream px-3 text-sm font-extrabold text-ink">Back to event · send photos</button>}

        {/* Challenge card */}
        {/* min-h-0 + my-auto (not items-center): a centered flex item taller than the
            scroll area can't be scrolled back to its top, clipping the card after a photo
            adds the "Your shots" strip. Auto margins center when there's room and collapse
            to 0 when overflowing, keeping the top reachable. */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 pt-9">
          <div className="flat-card relative my-auto w-full max-w-2xl px-6 pb-6 pt-8 md:px-8 md:pb-8">
            <ConfettiBurst burstKey={burstKey} />

            {/* Challenge number: a sticker stuck on the card corner */}
            <span
              className="absolute -left-2 -top-5 flex h-14 w-14 rotate-[-8deg] items-center justify-center rounded-2xl border-2 border-ink font-display text-3xl md:h-16 md:w-16 md:text-4xl"
              style={{ backgroundColor: theme.main, color: readableTextOn(theme.main), boxShadow: '3px 3px 0 0 #2E2459' }}
              aria-label={`Challenge ${challenge.number}`}
            >
              {challenge.number}
            </span>

            {/* Category art tells you which theme you're in at a glance */}
            <div className="flex justify-center">
              <StickerArt
                name={theme.art}
                emoji={theme.emoji}
                alt=""
                className="h-24 w-24 md:h-32 md:w-32"
                emojiSize="5rem"
              />
            </div>

            <h3 className="mt-3 text-center font-display text-2xl leading-tight text-ink md:text-4xl">
              {challenge.title}
            </h3>

            {challenge.scriptureClue && <ScriptureClue clue={challenge.scriptureClue} />}

            {/* What to photograph. Never a spoiler (the gospel connection is separate), so it always shows. */}
            {challenge.photoTarget && (
              <p className="mx-auto mt-3 max-w-md text-center text-base font-semibold leading-snug text-ink/80">
                {challenge.photoTarget}
              </p>
            )}

            {/* Completion. The camera in the bottom bar is the main action (taking a photo
                completes the challenge), so "Mark as done" stays a quiet fallback. */}
            <div className="mt-6 flex flex-col items-center gap-3">
              {isCompleted ? (
                <>
                  <span
                    role="status"
                    className="animate-stamp-in inline-flex items-center gap-2 rounded-full border-2 border-ink bg-sun px-5 py-2 font-display text-xl text-ink"
                  >
                    <Check className="h-5 w-5" strokeWidth={3.5} />
                    Nailed it!
                  </span>
                  <button
                    onClick={() => isLastChallenge ? exitDisplayMode() : navigateDisplayMode('next')}
                    className="btn-3d btn-sky animate-pop-in flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-display text-lg tracking-wide text-ink"
                  >
                    {isLastChallenge ? 'See overview' : 'Next challenge'}
                    {isLastChallenge ? <LayoutGrid className="h-5 w-5" strokeWidth={2.5} /> : <ChevronRight className="h-5 w-5" strokeWidth={3} />}
                  </button>
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
                className="mt-6 rounded-2xl border-2 border-ink/15 p-5"
                style={{ backgroundColor: theme.soft }}
              >
                <p className="text-sm font-extrabold" style={{ color: theme.text }}>
                  💡 {challenge.scriptureClue ? 'Discuss your discovery' : 'Gospel connection'}
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-snug" style={{ color: theme.text }}>
                  {challenge.gospelConnection}
                </p>
                {challenge.scripture && (
                  <p className="mt-2 text-sm font-bold italic opacity-80" style={{ color: theme.text }}>
                    {challenge.scripture}
                  </p>
                )}
                {challenge.photoTarget && !challenge.scriptureClue && (
                  <p className="mt-3 border-t-2 border-dashed border-ink/10 pt-3 text-sm font-semibold opacity-80" style={{ color: theme.text }}>
                    📸 Photo hint: {challenge.photoTarget}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/25 bg-paper p-5 text-center">
                <p className="text-lg font-semibold italic text-ink/70">
                  🤔 {challenge.scriptureClue ? 'Which words in the scripture connect to your object? Explain your thinking.' : 'Talk it over: what gospel truth hides in this one?'}
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
              <p className="mt-6 text-center text-sm font-semibold text-ink/70">
                Tap the camera to take a photo; that counts as done. Swipe to move between challenges.
              </p>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex-shrink-0 border-t-2 border-ink bg-cream/90 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between text-sm font-extrabold text-ink/70">
            <span>Challenge {flatIndex + 1} of {allChallenges.length}</span>
            <span>Path {selectedPathId}</span>
          </div>

          <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between gap-3">
            <button
              onClick={() => navigateDisplayMode('prev')}
              disabled={flatIndex === 0}
              className="btn-3d btn-white rounded-2xl p-4 text-ink"
              aria-label="Previous challenge"
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={3} />
            </button>

            <PhotoCapture teamName={teamName} key={challenge.id} pathId={selectedPathId}
              challenge={challenge}
              category={category}
              onCaptureComplete={markChallengeComplete}
              onPhotoSaved={handlePhotoSaved}
              packId={packId} huntId={huntId}
              variant="display"
              pulse={!isCompleted}
            />

            <button
              onClick={() => navigateDisplayMode('next')}
              disabled={flatIndex === allChallenges.length - 1}
              className="btn-3d btn-white rounded-2xl p-4 text-ink"
              aria-label="Next challenge"
            >
              <ChevronRight className="h-7 w-7" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Gallery Modal */}
      <PhotoGallery
        isOpen={galleryOpen}
        onClose={() => {
          setGalleryOpen(false);
          setGalleryFilterChallengeId(null);
        }}
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
    <section className={`paper-dots relative pb-16 md:pb-20 ${huntId ? "pt-36 md:pt-40" : "pt-24 md:pt-28"}`}>
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        {allComplete && <button onClick={() => setReviewingCompleted(false)} className="btn-3d btn-go mb-6 w-full rounded-full px-5 py-3 font-bold text-ink">See hunt celebration & photos</button>}
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-4xl text-ink md:text-5xl">
            Hunt checklist
          </h2>
          <p className="mt-2 font-semibold text-ink/70">
            Work down your path, snap photos, check things off.
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

        {/* Next up card: the one big green button on this screen */}
        {nextChallenge && (
          <div className="flat-card mb-6 !bg-sun-soft p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-left">
                <span
                  className="flex h-14 w-14 flex-shrink-0 rotate-[-5deg] items-center justify-center rounded-2xl border-2 border-ink bg-sun font-display text-2xl text-ink"
                  style={{ boxShadow: '2px 2px 0 0 #2E2459' }}
                >
                  {nextChallenge.number}
                </span>
                <div>
                  <div className="text-sm font-extrabold text-ink/70">Next up</div>
                  <div className="font-display text-xl leading-tight text-ink">{nextChallenge.title}</div>
                  <div className="text-sm font-semibold text-ink/70">{nextChallenge.photoTarget}</div>
                </div>
              </div>
              <button
                onClick={() => openNextIncomplete()}
                className="btn-3d btn-go inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-lg tracking-wide text-ink"
              >
                Resume hunt
                <ChevronRight className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

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
                        const showAnalogies = shouldShowAnalogies() || Boolean(challenge.scriptureClue && isCompleted);

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
                                      /* What to look for. The gospel connection stays hidden until the leader reveals it. */
                                      challenge.photoTarget && (
                                        <p className="text-sm font-semibold leading-snug text-ink/70">{challenge.photoTarget}</p>
                                      )
                                    )}
                                  </div>

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

        {/* Reset */}
        <div className="mt-10 text-center">
          <button
            onClick={onReset}
            className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Start over
          </button>

        </div>
      </div>
    </section>

    {/* Photo Gallery Modal */}
    <PhotoGallery
      isOpen={galleryOpen}
      onClose={() => {
        setGalleryOpen(false);
        setGalleryFilterChallengeId(null);
      }}
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
