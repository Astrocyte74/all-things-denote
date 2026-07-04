import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Map, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, RotateCcw, EyeOff } from 'lucide-react';
import { categories } from '@/data/scavengerData';
import type { Category as CategoryType, Challenge } from '@/types';
import { useToggle } from '@/hooks/useToggle';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSwipe } from '@/hooks/useSwipe';
import { useTripleTap } from '@/hooks/useTripleTap';
import { PhotoCapture } from '@/components/PhotoCapture';
import { PhotoGallery } from '@/components/PhotoGallery';
import { StickerArt } from '@/components/StickerArt';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { getCategoryTheme } from '@/lib/theme';
import { getPhotoCount, getPhotosByChallenge, type StoredPhoto } from '@/lib/photoStorage';

interface CategoriesProps {
  isVisible: boolean;
  selectedPathId: string;
  pathOrder: number[];
  onAllComplete: () => void;
  bonusUnlocked: boolean;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  onPhotoCountChange: (count: number) => void;
}

export type CategoriesHandle = {
  /** Re-open the focus-mode carousel on the next incomplete challenge. */
  resume: () => void;
};

export const Categories = forwardRef<CategoriesHandle, CategoriesProps>(function Categories({ isVisible, selectedPathId, pathOrder, onAllComplete, bonusUnlocked, galleryOpen, setGalleryOpen, onPhotoCountChange }, ref) {
  const [expandedCategoryState, setExpandedCategoryState] = useState<{
    pathId: string;
    categoryId: string | null | undefined;
  }>({ pathId: selectedPathId, categoryId: undefined });
  const [completedChallenges, setCompletedChallenges, clearCompletedChallenges] = usePersistedState<Set<string>>('completedChallenges', new Set());
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayModeChallenge, setDisplayModeChallenge] = useState<{category: CategoryType; challengeIndex: number; allChallenges: Challenge[]; flatIndex: number} | null>(null);
  const { value: showAnalogiesEarly, toggle: toggleAnalogiesEarly } = useToggle('showAnalogiesEarly', false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [challengePhotoCounts, setChallengePhotoCounts] = useState<Record<string, number>>(() => ({}));
  const [challengePhotos, setChallengePhotos] = useState<Record<string, StoredPhoto[]>>(() => ({}));
  const [galleryFilterChallengeId, setGalleryFilterChallengeId] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const celebrate = useCallback(() => setBurstKey(k => k + 1), []);

  // Reorder ALL challenges based on selected path and regroup into categories
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
  }, [pathOrder]);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 200);
    }
  }, [isVisible]);

  // Load photo count on mount
  useEffect(() => {
    getPhotoCount().then(onPhotoCountChange);
  }, [onPhotoCountChange]);

  // Load photo counts per challenge
  useEffect(() => {
    const loadChallengePhotos = async () => {
      const allChallenges = orderedCategoryData.flatMap(cat => cat.challenges);
      const photoCountMap: Record<string, number> = {};
      const photosMap: Record<string, StoredPhoto[]> = {};

      for (const challenge of allChallenges) {
        const photos = await getPhotosByChallenge(challenge.id);
        photoCountMap[challenge.id] = photos.length;
        photosMap[challenge.id] = photos;
      }

      setChallengePhotoCounts(photoCountMap);
      setChallengePhotos(photosMap);
    };

    loadChallengePhotos();
  }, [orderedCategoryData]);

  // Handle photo saved callback
  const handlePhotoSaved = useCallback(async () => {
    const count = await getPhotoCount();
    onPhotoCountChange(count);

    // Update challenge photo counts and photos
    const photoCountMap: Record<string, number> = {};
    const photosMap: Record<string, StoredPhoto[]> = {};
    const allChallenges = orderedCategoryData.flatMap(cat => cat.challenges);

    for (const challenge of allChallenges) {
      const photos = await getPhotosByChallenge(challenge.id);
      photoCountMap[challenge.id] = photos.length;
      photosMap[challenge.id] = photos;
    }

    setChallengePhotoCounts(photoCountMap);
    setChallengePhotos(photosMap);
  }, [orderedCategoryData, onPhotoCountChange]);

  // Handle gallery photo count change
  const handleGalleryPhotoCountChange = useCallback((count: number) => {
    onPhotoCountChange(count);
  }, [onPhotoCountChange]);

  // Check if all challenges are complete
  useEffect(() => {
    const allChallenges = orderedCategoryData.flatMap(c => c.challenges);
    const allCompleted = allChallenges.length > 0 && allChallenges.every(c => completedChallenges.has(c.id));
    if (allCompleted) {
      onAllComplete();
    }
  }, [completedChallenges, orderedCategoryData, onAllComplete]);

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
    setCompletedChallenges(prev => {
      if (prev.has(challengeId)) return prev;
      celebrate();
      return new Set(prev).add(challengeId);
    });
  }, [setCompletedChallenges, celebrate]);

  const handleResetProgress = () => {
    clearCompletedChallenges();
    if (showAnalogiesEarly) {
      toggleAnalogiesEarly();
    }
    setShowResetConfirm(false);
  };

  const getTotalProgress = useCallback(() => {
    const allChallenges = orderedCategoryData.flatMap(c => c.challenges);
    const completed = allChallenges.filter(c => completedChallenges.has(c.id)).length;
    return { completed, total: allChallenges.length };
  }, [orderedCategoryData, completedChallenges]);

  const totalProgress = getTotalProgress();

  const enterDisplayMode = (category: CategoryType, challengeIndex: number) => {
    const allChallenges = orderedCategoryData.flatMap(c => c.challenges);
    const flatIndex = allChallenges.findIndex(c => c.id === category.challenges[challengeIndex].id);
    setDisplayModeChallenge({ category, challengeIndex, allChallenges, flatIndex });
  };

  const exitDisplayMode = () => {
    setDisplayModeChallenge(null);
  };

  // Open the carousel on the first incomplete challenge (used by the auto-open
  // effect, the Overview "Resume Hunt" button, and the "Next up" card).
  const openNextIncomplete = useCallback(() => {
    const allChallenges = orderedCategoryData.flatMap(c => c.challenges);
    const firstIncomplete = allChallenges.find(c => !completedChallenges.has(c.id));
    if (!firstIncomplete) return;
    const category = orderedCategoryData.find(cat => cat.challenges.some(c => c.id === firstIncomplete.id));
    if (!category) return;
    const challengeIndex = category.challenges.findIndex(c => c.id === firstIncomplete.id);
    const flatIndex = allChallenges.indexOf(firstIncomplete);
    setDisplayModeChallenge({ category, challengeIndex, allChallenges, flatIndex });
  }, [orderedCategoryData, completedChallenges]);

  // Auto-open the carousel once per path when the hunt starts (or the path changes).
  // useLayoutEffect sets it before first paint so the busy checklist never flashes.
  // The ref guard (keyed by selectedPathId) ensures exiting to Overview never reopens it.
  const autoOpenedForPath = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!isVisible) return;
    if (autoOpenedForPath.current === selectedPathId) return;
    autoOpenedForPath.current = selectedPathId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time open on hunt start / path change
    openNextIncomplete();
  }, [isVisible, selectedPathId, openNextIncomplete]);

  // Let the parent (sticky header "Resume Hunt" button) re-enter focus mode.
  useImperativeHandle(ref, () => ({ resume: openNextIncomplete }), [openNextIncomplete]);

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

  const allOrderedChallenges = orderedCategoryData.flatMap(category => category.challenges);
  const nextChallenge = allOrderedChallenges.find(challenge => !completedChallenges.has(challenge.id));

  // ============ FOCUS MODE (one challenge at a time) ============
  if (displayModeChallenge) {
    const { category, challengeIndex, allChallenges, flatIndex } = displayModeChallenge;
    const challenge = category.challenges[challengeIndex];
    const isCompleted = completedChallenges.has(challenge.id);
    const showAnalogies = shouldShowAnalogies();
    const isLastChallenge = flatIndex >= allChallenges.length - 1;
    const totalPhotos = Object.values(challengePhotoCounts).reduce((sum, n) => sum + n, 0);
    const theme = getCategoryTheme(category.id);

    return (
      <>
      <div
        ref={swipeRef}
        className="paper-dots fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: theme.soft }}
      >
        {/* Progress strip */}
        <div className="h-2.5 w-full flex-shrink-0 border-b-2 border-ink bg-white/60">
          <div
            className="progress-stripes h-full transition-all duration-500"
            style={{
              width: `${totalProgress.total > 0 ? (totalProgress.completed / totalProgress.total) * 100 : 0}%`,
              backgroundColor: theme.main,
            }}
          />
        </div>

        {/* Top toolbar */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 pt-4">
          <button
            onClick={() => { setGalleryFilterChallengeId(null); setGalleryOpen(true); }}
            className="btn-3d btn-white relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
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
            className="rounded-full border-2 border-ink px-3 py-1 font-display text-sm text-white"
            style={{ backgroundColor: theme.main }}
          >
            {category.title}
          </span>

          <button
            onClick={exitDisplayMode}
            className="btn-3d btn-white inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-ink"
            aria-label="Back to all tasks overview"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Overview</span>
          </button>
        </div>

        {/* Challenge card */}
        {/* min-h-0 + my-auto (not items-center): a centered flex item taller than the
            scroll area can't be scrolled back to its top, clipping the card after a photo
            adds the "Your shots" strip. Auto margins center when there's room and collapse
            to 0 when overflowing, keeping the top reachable. */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4">
          <div className="sticker-card relative my-auto w-full max-w-2xl rotate-[-0.4deg] p-6 md:p-8">
            <ConfettiBurst burstKey={burstKey} />

            {/* Number badge */}
            <div className="mb-4 flex justify-center">
              <span
                className="flex h-20 w-20 rotate-[-5deg] items-center justify-center rounded-3xl border-2 border-ink font-display text-4xl text-white md:h-24 md:w-24 md:text-5xl"
                style={{ backgroundColor: theme.main, boxShadow: '4px 4px 0 0 #2E2459' }}
              >
                {challenge.number}
              </span>
            </div>

            <h3 className="text-center font-display text-2xl leading-tight text-ink md:text-4xl">
              {challenge.title}
            </h3>

            {/* Completion toggle */}
            <div className="mt-5 text-center">
              <button
                onClick={() => toggleChallenge(challenge.id)}
                className={`btn-3d inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 font-display text-lg tracking-wide ${
                  isCompleted ? 'btn-sun text-ink' : 'btn-go text-white'
                }`}
              >
                {isCompleted ? (
                  <>
                    <Check className="h-6 w-6" strokeWidth={3.5} />
                    Nailed It!
                  </>
                ) : (
                  <>
                    <span className="h-5 w-5 rounded-full border-[3px] border-current" />
                    Mark Complete
                  </>
                )}
              </button>

              {isCompleted && (
                <button
                  onClick={() => isLastChallenge ? exitDisplayMode() : navigateDisplayMode('next')}
                  className="btn-3d btn-sky animate-pop-in mt-4 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-display text-lg tracking-wide text-white"
                >
                  {isLastChallenge ? 'See Overview' : 'Next Challenge'}
                  {isLastChallenge ? <LayoutGrid className="h-5 w-5" strokeWidth={2.5} /> : <ChevronRight className="h-5 w-5" strokeWidth={3} />}
                </button>
              )}
            </div>

            {/* Gospel connection */}
            {showAnalogies ? (
              <div
                className="mt-6 rounded-2xl border-2 border-ink/15 p-5"
                style={{ backgroundColor: theme.soft }}
              >
                <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: theme.text }}>
                  💡 Gospel Connection
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-snug" style={{ color: theme.text }}>
                  {challenge.gospelConnection}
                </p>
                {challenge.scripture && (
                  <p className="mt-2 text-sm font-bold italic opacity-80" style={{ color: theme.text }}>
                    {challenge.scripture}
                  </p>
                )}
                {challenge.photoTarget && (
                  <p className="mt-3 border-t-2 border-dashed border-ink/10 pt-3 text-sm font-semibold opacity-80" style={{ color: theme.text }}>
                    📸 Photo hint: {challenge.photoTarget}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/25 bg-paper p-5 text-center">
                <p className="text-lg font-semibold italic text-ink/50">
                  🤔 Talk it over — what gospel truth hides in this one?
                </p>
              </div>
            )}

            {/* Photo thumbnails for this challenge */}
            {(challengePhotos[challenge.id] ?? []).length > 0 && (
              <div className="mt-5 border-t-2 border-dashed border-ink/10 pt-4">
                <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-widest text-ink/50">
                  Your shots
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(challengePhotos[challenge.id] ?? []).slice(0, 4).map((photo, idx) => (
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
                  {(challengePhotos[challenge.id] ?? []).length > 4 && (
                    <button
                      onClick={() => {
                        setGalleryFilterChallengeId(challenge.id);
                        setGalleryOpen(true);
                      }}
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink/40 bg-paper text-sm font-extrabold text-ink/60 hover:bg-white"
                    >
                      +{(challengePhotos[challenge.id] ?? []).length - 4}
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-ink/35">
              Swipe or use arrows to move between challenges
            </p>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex-shrink-0 border-t-2 border-ink bg-cream/90 px-4 pb-5 pt-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between text-xs font-extrabold uppercase tracking-wider text-ink/50">
            <span>Challenge {flatIndex + 1} / {allChallenges.length}</span>
            <span>{totalProgress.completed}/{totalProgress.total} done · Path {selectedPathId}</span>
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

            <PhotoCapture pathId={selectedPathId}
              challenge={challenge}
              category={category}
              onCaptureComplete={markChallengeComplete}
              onPhotoSaved={handlePhotoSaved}
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
      />
      </>
    );
  }

  // ============ OVERVIEW (checklist) ============
  return (
    <>
    <section className="paper-dots relative pb-16 pt-24 md:pb-20 md:pt-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-4xl text-ink md:text-5xl">
            Hunt <span className="text-sticker-sun">Checklist</span>
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

        {/* Next up card */}
        {nextChallenge && (
          <div className="sticker-card mb-8 bg-sun-soft p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-left">
                <span className="flex h-14 w-14 flex-shrink-0 rotate-[-5deg] items-center justify-center rounded-2xl border-2 border-ink bg-sun font-display text-2xl text-white shadow-sticker-sm">
                  {nextChallenge.number}
                </span>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-sun-edge">Next up</div>
                  <div className="font-display text-xl leading-tight text-ink">{nextChallenge.title}</div>
                  <div className="text-sm font-semibold text-ink/60">{nextChallenge.photoTarget}</div>
                </div>
              </div>
              <button
                onClick={openNextIncomplete}
                className="btn-3d btn-go inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-lg tracking-wide text-white"
              >
                Resume Hunt
                <ChevronRight className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {orderedCategoryData.map((category, index) => {
            const progress = { completed: category.challenges.filter(c => completedChallenges.has(c.id)).length, total: category.challenges.length };
            const isExpanded = effectiveExpandedCategory === category.id;
            const theme = getCategoryTheme(category.id);
            const categoryDone = progress.completed === progress.total;

            return (
              <div
                key={category.id}
                className={`transform transition-all duration-500 ${
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
                        <h3 className="truncate font-display text-xl text-ink sm:text-2xl">
                          {category.title}
                        </h3>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-extrabold ${
                            categoryDone ? 'bg-go text-white' : 'bg-white text-ink'
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
                    isExpanded ? 'max-h-[1200px] border-ink/10' : 'max-h-0 border-transparent'
                  }`}>
                    <div className="space-y-3 p-4 sm:p-5">
                      {category.challenges.map((challenge, challengeIndex) => {
                        const isCompleted = completedChallenges.has(challenge.id);
                        const showAnalogies = shouldShowAnalogies();

                        return (
                          <div
                            key={challenge.id}
                            className={`transform transition-all duration-300 ${
                              isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                            }`}
                            style={{ transitionDelay: `${challengeIndex * 50}ms` }}
                          >
                            <div className={`rounded-2xl border-2 p-3.5 transition-colors sm:p-4 ${
                              isCompleted
                                ? 'border-go/60 bg-go-soft'
                                : 'border-ink/10 bg-paper hover:border-ink/25'
                            }`}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                {/* Check button */}
                                <button
                                  onClick={() => toggleChallenge(challenge.id)}
                                  aria-label={isCompleted ? `Mark ${challenge.title} incomplete` : `Mark ${challenge.title} complete`}
                                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                    isCompleted
                                      ? 'border-ink bg-go text-white shadow-sticker-sm'
                                      : 'border-ink/30 bg-white hover:border-go hover:bg-go-soft'
                                  }`}
                                >
                                  {isCompleted && <Check className="h-5 w-5" strokeWidth={3.5} />}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span
                                      className="rounded-lg border-2 border-ink px-1.5 py-0.5 font-display text-xs text-white"
                                      style={{ backgroundColor: theme.main }}
                                    >
                                      #{challenge.number}
                                    </span>
                                    <h4 className={`font-body text-base font-extrabold text-ink ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                      {challenge.title}
                                    </h4>
                                    {(challengePhotoCounts[challenge.id] ?? 0) > 0 && (
                                      <button
                                        onClick={() => {
                                          setGalleryFilterChallengeId(challenge.id);
                                          setGalleryOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-full border-2 border-ink/20 bg-sky-soft px-2 py-0.5 text-xs font-extrabold text-sky-edge transition-colors hover:border-ink/50"
                                        title={`View ${challengePhotoCounts[challenge.id] ?? 0} photo${(challengePhotoCounts[challenge.id] ?? 0) !== 1 ? 's' : ''} in gallery`}
                                      >
                                        <Camera className="h-3 w-3" strokeWidth={3} />
                                        <span>{challengePhotoCounts[challenge.id] ?? 0}</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    {showAnalogies ? (
                                      <>
                                        {challenge.photoTarget && (
                                          <div className="flex items-start gap-2 text-sm font-semibold text-ink/60">
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
                                          <div className="text-xs font-bold italic text-ink/45">
                                            {challenge.scripture}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex items-start gap-2 text-sm font-semibold italic text-ink/40">
                                        <EyeOff className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
                                        <span>Think about the gospel connection…</span>
                                      </div>
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
                                          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink/30 bg-white text-sm font-extrabold text-ink/60"
                                        >
                                          +{(challengePhotos[challenge.id] ?? []).length - 4}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 self-end sm:self-start">
                                  <button
                                    onClick={() => enterDisplayMode(category, challengeIndex)}
                                    className="flex-shrink-0 rounded-xl border-2 border-ink/15 bg-white p-2 text-ink/50 transition-colors hover:border-ink/40 hover:text-ink"
                                    title="Focus Mode"
                                    aria-label={`Open ${challenge.title} in focus mode`}
                                  >
                                    <Maximize2 className="h-5 w-5" strokeWidth={2.5} />
                                  </button>

                                  <PhotoCapture pathId={selectedPathId}
                                    challenge={challenge}
                                    category={category}
                                    onCaptureComplete={markChallengeComplete}
                                    onPhotoSaved={handlePhotoSaved}
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
            onClick={() => setShowResetConfirm(true)}
            className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Reset Progress
          </button>
          {showResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
              <div className="sticker-card animate-pop-in w-full max-w-md p-6 text-left">
                <h3 className="font-display text-2xl text-ink">Reset Progress?</h3>
                <p className="mt-1 font-semibold text-ink/70">This clears every completed challenge. Sure about that?</p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="btn-3d btn-white flex-1 rounded-full px-4 py-2.5 font-extrabold text-ink"
                  >
                    Keep Going
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="btn-3d btn-coral flex-1 rounded-full px-4 py-2.5 font-extrabold text-white"
                  >
                    Yes, Reset
                  </button>
                </div>
              </div>
            </div>
          )}
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
    />
  </>
  );
});

Categories.displayName = 'Categories';

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
        <span className="text-xs font-extrabold uppercase tracking-widest text-ink/50">Progress</span>
        <span className="font-display text-lg leading-none text-ink">{completed} <span className="text-ink/40">/ {total}</span></span>
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
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink/15 bg-cream px-3 py-1.5 text-xs font-bold text-ink/60">
            <Map className="h-3 w-3" />
            Triple tap the bar to reveal all gospel analogies
          </span>
        </div>
      )}

      {showAnalogies && (
        <div className="mt-2 text-center">
          <button
            onClick={onTripleTap}
            className="mx-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-ink/40 transition-colors hover:text-ink"
          >
            <EyeOff className="h-3 w-3" />
            Hide gospel analogies
          </button>
        </div>
      )}
    </div>
  );
}
