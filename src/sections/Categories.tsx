import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Map, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, RotateCcw, EyeOff, Lightbulb, Target, Heart, BookOpen, Globe, type LucideIcon } from 'lucide-react';
import { categories } from '@/data/scavengerData';
import type { Category as CategoryType, Challenge } from '@/types';
import { useToggle } from '@/hooks/useToggle';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSwipe } from '@/hooks/useSwipe';
import { useTripleTap } from '@/hooks/useTripleTap';
import { PhotoCapture } from '@/components/PhotoCapture';
import { PhotoGallery } from '@/components/PhotoGallery';
import { getPhotoCount, getPhotosByChallenge, type StoredPhoto } from '@/lib/photoStorage';

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Heart,
  BookOpen,
  Globe
};

const categoryThemeMap: Record<string, {
  analogyBox: string;
  analogyLabel: string;
  analogyText: string;
}> = {
  faith: {
    analogyBox: 'bg-blue-50 border-blue-100',
    analogyLabel: 'text-blue-800',
    analogyText: 'text-blue-700'
  },
  choices: {
    analogyBox: 'bg-purple-50 border-purple-100',
    analogyLabel: 'text-purple-800',
    analogyText: 'text-purple-700'
  },
  service: {
    analogyBox: 'bg-red-50 border-red-100',
    analogyLabel: 'text-red-800',
    analogyText: 'text-red-700'
  },
  scriptures: {
    analogyBox: 'bg-green-50 border-green-100',
    analogyLabel: 'text-green-800',
    analogyText: 'text-green-700'
  },
  community: {
    analogyBox: 'bg-yellow-50 border-yellow-100',
    analogyLabel: 'text-yellow-900',
    analogyText: 'text-yellow-800'
  }
};

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

export function Categories({ isVisible, selectedPathId, pathOrder, onAllComplete, bonusUnlocked, galleryOpen, setGalleryOpen, onPhotoCountChange }: CategoriesProps) {
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
    }
    setCompletedChallenges(newCompleted);
  };

  // Idempotent completion used for photo capture: taking another photo on an
  // already-complete task must never mark it incomplete.
  const markChallengeComplete = useCallback((challengeId: string) => {
    setCompletedChallenges(prev => prev.has(challengeId) ? prev : new Set(prev).add(challengeId));
  }, [setCompletedChallenges]);

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

  // Gospel analogies show when: bonus is unlocked OR user knows the secret (long press)
  const shouldShowAnalogies = () => {
    return bonusUnlocked || showAnalogiesEarly;
  };

  const allOrderedChallenges = orderedCategoryData.flatMap(category => category.challenges);
  const nextChallenge = allOrderedChallenges.find(challenge => !completedChallenges.has(challenge.id));

  // Display mode component
  if (displayModeChallenge) {
    const { category, challengeIndex, allChallenges, flatIndex } = displayModeChallenge;
    const challenge = category.challenges[challengeIndex];
    const isCompleted = completedChallenges.has(challenge.id);
    const showAnalogies = shouldShowAnalogies();
    const isLastChallenge = flatIndex >= allChallenges.length - 1;
    const totalPhotos = Object.values(challengePhotoCounts).reduce((sum, n) => sum + n, 0);

    const theme = categoryThemeMap[category.id] ?? {
      analogyBox: 'bg-gray-50 border-gray-100',
      analogyLabel: 'text-gray-800',
      analogyText: 'text-gray-700'
    };

    return (
      <>
      <div
        ref={swipeRef}
        className={`fixed inset-0 bg-gradient-to-br ${category.color} z-50 flex flex-col`}
      >
        {/* Progress strip */}
        <div className="h-1.5 w-full flex-shrink-0 bg-black/20">
          <div
            className="h-full bg-white/90 transition-all duration-500"
            style={{ width: `${totalProgress.total > 0 ? (totalProgress.completed / totalProgress.total) * 100 : 0}%` }}
          />
        </div>

        {/* Top toolbar: Gallery (left) + Overview (right) */}
        <button
          onClick={() => { setGalleryFilterChallengeId(null); setGalleryOpen(true); }}
          className="absolute top-5 left-4 z-10 inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-white transition-colors hover:bg-black/30"
          aria-label="Open photo gallery"
        >
          <Camera className="w-5 h-5" />
          <span className="hidden text-sm font-medium sm:inline">Gallery</span>
          {totalPhotos > 0 && (
            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-xs">{totalPhotos}</span>
          )}
        </button>
        <button
          onClick={exitDisplayMode}
          className="absolute top-5 right-4 z-10 inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-white transition-colors hover:bg-black/30"
          aria-label="Back to all tasks overview"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="hidden text-sm font-medium sm:inline">Overview</span>
        </button>

        {/* Single Challenge Display */}
        <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-lg p-6 md:p-8 shadow-2xl max-w-2xl w-full mx-4 my-4">
            {/* EXTRA LARGE Challenge Number */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 font-black px-8 py-6 rounded-lg mb-6 shadow-lg">
                <span className="text-7xl md:text-8xl">#{challenge.number}</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                {challenge.title}
              </h3>

              {/* Completion Toggle Button */}
              <button
                onClick={() => toggleChallenge(challenge.id)}
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border-2 border-gray-200'
                }`}
              >
                {isCompleted ? (
                  <>
                    <Check className="w-6 h-6" />
                    Completed!
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full border-2 border-current" />
                    Mark as Complete
                  </>
                )}
              </button>

              {/* Next Challenge CTA — appears once this task is done */}
              {isCompleted && (
                <button
                  onClick={() => isLastChallenge ? exitDisplayMode() : navigateDisplayMode('next')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
                >
                  {isLastChallenge ? 'See Overview' : 'Next Challenge'}
                  {isLastChallenge ? <LayoutGrid className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              )}
            </div>

            {showAnalogies ? (
              <div className={`rounded-lg border p-6 ${theme.analogyBox}`}>
                <p className={`text-lg font-medium mb-2 ${theme.analogyLabel}`}>
                  Gospel Connection
                </p>
                <p className={`text-xl ${theme.analogyText}`}>
                  {challenge.gospelConnection}
                </p>
                {challenge.scripture && (
                  <p className={`text-lg mt-3 ${theme.analogyText} opacity-80`}>
                    {challenge.scripture}
                  </p>
                )}
                {challenge.photoTarget && (
                  <div className="mt-4 pt-4 border-t border-current/20">
                    <p className={`text-base ${theme.analogyText} opacity-80`}>Photo hint: {challenge.photoTarget}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-6 text-center">
                <p className="text-gray-500 italic text-2xl">
                  Think about the gospel connection...
                </p>
              </div>
            )}

            {/* Photo Thumbnails for this challenge */}
            {(challengePhotos[challenge.id] ?? []).length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Photos for this challenge
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {(challengePhotos[challenge.id] ?? []).slice(0, 4).map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setGalleryFilterChallengeId(challenge.id);
                        setGalleryOpen(true);
                      }}
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-colors flex-shrink-0"
                      title={`View photo ${idx + 1}`}
                    >
                      <img
                        src={photo.imageData}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {(challengePhotos[challenge.id] ?? []).length > 4 && (
                    <button
                      onClick={() => {
                        setGalleryFilterChallengeId(challenge.id);
                        setGalleryOpen(true);
                      }}
                      className="w-20 h-20 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-sm text-gray-600 font-medium flex-shrink-0 border-2 border-dashed border-gray-300"
                    >
                      +{(challengePhotos[challenge.id] ?? []).length - 4}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-lg">
                View each challenge fullscreen for easy reference
              </p>
              <p className="text-gray-500 text-base mt-2">
                Swipe or use arrows to navigate between challenges
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Footer with Info */}
        <div className="bg-black/30 p-4">
          {/* Info Row */}
          <div className="flex items-center justify-between mb-3 text-white text-sm">
            <span className="font-medium">{category.title}</span>
            <span className="text-white/80">
              Challenge {flatIndex + 1} of {allChallenges.length} · {totalProgress.completed}/{totalProgress.total} done · Path {selectedPathId}
            </span>
          </div>

          {/* Navigation Row */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigateDisplayMode('prev')}
              disabled={flatIndex === 0}
              className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 text-white p-4 rounded-lg transition-colors"
              aria-label="Previous challenge"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <PhotoCapture pathId={selectedPathId}
              challenge={challenge}
              category={category}
              onCaptureComplete={markChallengeComplete}
              onPhotoSaved={handlePhotoSaved}
              variant="display"
            />

            <button
              onClick={() => navigateDisplayMode('next')}
              disabled={flatIndex === allChallenges.length - 1}
              className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 text-white p-4 rounded-lg transition-colors"
              aria-label="Next challenge"
            >
              <ChevronRight className="w-8 h-8" />
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

  return (
    <>
    <section className="pt-24 pb-16 md:pt-28 md:pb-20 bg-gradient-to-b from-gray-50 to-white relative">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Hunt Checklist
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Work down your path, take photos, and mark each challenge complete.
          </p>

          {/* Progress Bar with Triple Tap (shows instruction when bonus unlocked) */}
          <ProgressBar
            completed={totalProgress.completed}
            total={totalProgress.total}
            onTripleTap={toggleAnalogiesEarly}
            bonusUnlocked={bonusUnlocked}
            showAnalogies={showAnalogiesEarly}
          />
        </div>

        {nextChallenge && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wide text-blue-700">Next up</div>
                <div className="text-lg font-bold text-gray-900">#{nextChallenge.number} {nextChallenge.title}</div>
                <div className="text-sm text-gray-600">{nextChallenge.photoTarget}</div>
              </div>
              <button
                onClick={openNextIncomplete}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Resume Hunt
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Progress
          </button>
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Progress?</h3>
                <p className="text-gray-600 mb-4">This will clear all completed challenges. Are you sure?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleResetProgress}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {orderedCategoryData.map((category, index) => {
            const progress = { completed: category.challenges.filter(c => completedChallenges.has(c.id)).length, total: category.challenges.length };
            const isExpanded = effectiveExpandedCategory === category.id;

            return (
              <div
                key={category.id}
                className={`transform transition-all duration-500 ${
                  isAnimated
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                  perspective: '1000px'
                }}
              >
                <div
                  className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    isExpanded ? 'ring-2 ring-blue-200' : ''
                  }`}
                  style={{
                    transform: isExpanded ? 'rotateX(2deg)' : 'rotateX(0deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Category Header */}
                  <button
                    type="button"
                    className={`w-full bg-gradient-to-r ${category.color} p-5 text-left`}
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-white">
                          {iconMap[category.icon] ? React.createElement(iconMap[category.icon], { className: "w-6 h-6" }) : null}
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          {category.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-full px-3 py-1 text-sm text-white font-medium">
                          {progress.completed}/{progress.total}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-white" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                      />
                    </div>
                  </button>

                  {/* Challenges - Expandable */}
                  <div className={`overflow-hidden transition-all duration-500 ${
                    isExpanded ? 'max-h-[1000px]' : 'max-h-0'
                  }`}>
                    <div className="p-6 space-y-4">
                      {category.challenges.map((challenge, challengeIndex) => {
                        const isCompleted = completedChallenges.has(challenge.id);
                        const showAnalogies = shouldShowAnalogies();

                        return (
                          <div
                            key={challenge.id}
                            className={`transform transition-all duration-300 ${
                              isExpanded
                                ? 'translate-y-0 opacity-100'
                                : '-translate-y-4 opacity-0'
                            }`}
                            style={{ transitionDelay: `${challengeIndex * 50}ms` }}
                          >
                            <div className={`border rounded-lg p-4 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                            }`}>
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleChallenge(challenge.id)}
                                  aria-label={isCompleted ? `Mark ${challenge.title} incomplete` : `Mark ${challenge.title} complete`}
                                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                                    isCompleted
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  {isCompleted && (
                                    <Check className="w-5 h-5 text-white" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                                      #{challenge.number}
                                    </span>
                                    <h4 className={`font-semibold text-gray-900 ${
                                      isCompleted ? 'line-through' : ''
                                    }`}>
                                      {challenge.title}
                                    </h4>
                                    {/* Photo indicator with count */}
                                    {(challengePhotoCounts[challenge.id] ?? 0) > 0 && (
                                      <button
                                        onClick={() => {
                                          setGalleryFilterChallengeId(challenge.id);
                                          setGalleryOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs px-2 py-1 rounded-full transition-colors"
                                        title={`View ${challengePhotoCounts[challenge.id] ?? 0} photo${(challengePhotoCounts[challenge.id] ?? 0) !== 1 ? 's' : ''} in gallery`}
                                      >
                                        <Camera className="w-3 h-3" />
                                        <span>{challengePhotoCounts[challenge.id] ?? 0} photo{(challengePhotoCounts[challenge.id] ?? 0) !== 1 ? 's' : ''}</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-2 ml-0">
                                    {showAnalogies ? (
                                      <>
                                        {challenge.photoTarget && (
                                          <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <Camera className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                            <span>{challenge.photoTarget}</span>
                                          </div>
                                        )}
                                        <div className="flex items-start gap-2 text-sm text-gray-700 font-medium bg-blue-50 p-2 rounded-lg">
                                          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                          <span>{challenge.gospelConnection}</span>
                                        </div>
                                        {challenge.scripture && (
                                          <div className="text-xs text-gray-500 italic">
                                            {challenge.scripture}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex items-start gap-2 text-sm text-gray-400 italic">
                                        <EyeOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>Think about the gospel connection...</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Photo Thumbnails */}
                                  {(challengePhotos[challenge.id] ?? []).length > 0 && (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                      {(challengePhotos[challenge.id] ?? []).slice(0, 4).map((photo, idx) => (
                                        <button
                                          key={photo.id}
                                          onClick={() => {
                                            setGalleryFilterChallengeId(challenge.id);
                                            setGalleryOpen(true);
                                          }}
                                          className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-colors flex-shrink-0"
                                          title={`View ${challenge.title} photo ${idx + 1}`}
                                        >
                                          <img
                                            src={photo.imageData}
                                            alt={`Photo ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </button>
                                      ))}
                                      {(challengePhotos[challenge.id] ?? []).length > 4 && (
                                        <button
                                          onClick={() => {
                                            setGalleryFilterChallengeId(challenge.id);
                                            setGalleryOpen(true);
                                          }}
                                          className="w-16 h-16 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-sm text-gray-600 font-medium flex-shrink-0"
                                        >
                                          +{(challengePhotos[challenge.id] ?? []).length - 4}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 self-end sm:self-start">
                                  {/* Display Mode Button */}
                                  <button
                                    onClick={() => enterDisplayMode(category, challengeIndex)}
                                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
                                    title="Display Mode"
                                    aria-label={`Open ${challenge.title} in display mode`}
                                  >
                                    <Maximize2 className="w-5 h-5" />
                                  </button>

                                  {/* Photo Capture Button */}
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
    <div className="max-w-md mx-auto">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progress</span>
        <span>{completed} / {total}</span>
      </div>
      <div
        ref={progressBarRef}
        className="h-4 bg-gray-200 rounded-full overflow-hidden cursor-pointer relative group"
        title={bonusUnlocked ? "Triple tap to toggle gospel analogies" : ""}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Hint - shows automatically when bonus is unlocked (not just hover) */}
      {bonusUnlocked && !showAnalogies && (
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500 bg-white/90 px-3 py-1.5 rounded-full shadow-sm inline-flex items-center gap-1 border border-gray-200">
            <Map className="w-3 h-3" />
            Triple tap progress bar to reveal all gospel analogies
          </span>
        </div>
      )}

      {/* Hide link when analogies are showing */}
      {showAnalogies && (
        <div className="text-center mt-2">
          <button
            onClick={onTripleTap}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mx-auto"
          >
            <EyeOff className="w-3 h-3" />
            Hide gospel analogies
          </button>
        </div>
      )}
    </div>
  );
}
