import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Map, ChevronLeft, ChevronRight, Maximize2, RotateCcw, X, EyeOff, Lightbulb, Target, Heart, BookOpen, Globe, type LucideIcon } from 'lucide-react';
import { categories } from '@/data/scavengerData';
import type { Category as CategoryType, Challenge } from '@/types';
import { useToggle } from '@/hooks/useToggle';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSwipe } from '@/hooks/useSwipe';
import { useTripleTap } from '@/hooks/useTripleTap';

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Heart,
  BookOpen,
  Globe
};

interface CategoriesProps {
  isVisible: boolean;
  selectedPathId: string;
  pathOrder: number[];
  onAllComplete: () => void;
  onChangePath: () => void;
  bonusUnlocked: boolean;
}

export function Categories({ isVisible, selectedPathId, pathOrder, onAllComplete, onChangePath, bonusUnlocked }: CategoriesProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [completedChallenges, setCompletedChallenges, clearCompletedChallenges] = usePersistedState<Set<string>>('completedChallenges', new Set());
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayModeChallenge, setDisplayModeChallenge] = useState<{category: CategoryType; challengeIndex: number; allChallenges: Challenge[]; flatIndex: number} | null>(null);
  const { value: showAnalogiesEarly, toggle: toggleAnalogiesEarly } = useToggle('showAnalogiesEarly', false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 200);
    }
  }, [isVisible]);

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

  // Check if all challenges are complete
  useEffect(() => {
    const allChallenges = orderedCategoryData.flatMap(c => c.challenges);
    const allCompleted = allChallenges.length > 0 && allChallenges.every(c => completedChallenges.has(c.id));
    if (allCompleted) {
      onAllComplete();
    }
  }, [completedChallenges, orderedCategoryData, onAllComplete]);

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
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

  // Display mode component
  if (displayModeChallenge) {
    const { category, challengeIndex, allChallenges, flatIndex } = displayModeChallenge;
    const challenge = category.challenges[challengeIndex];
    const isCompleted = completedChallenges.has(challenge.id);
    const showAnalogies = shouldShowAnalogies();

    // Get gradient colors for this category
    const colorMap: Record<string, { from: string; to: string }> = {
      'faith': { from: 'from-blue-500', to: 'to-cyan-400' },
      'choices': { from: 'from-purple-500', to: 'to-pink-400' },
      'service': { from: 'from-red-500', to: 'to-orange-400' },
      'scriptures': { from: 'from-green-500', to: 'to-emerald-400' },
      'community': { from: 'from-yellow-500', to: 'to-amber-400' }
    };
    const colors = colorMap[category.id] || { from: 'from-gray-600', to: 'to-gray-800' };

    return (
      <div
        ref={swipeRef}
        className={`fixed inset-0 bg-gradient-to-br ${colors.from} ${colors.to} z-50 flex flex-col`}
      >
        {/* Floating Exit Button */}
        <button
          onClick={exitDisplayMode}
          className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/30 text-white p-3 rounded-full transition-colors"
          title="Exit Display Mode"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Single Challenge Display */}
        <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full mx-4 my-4">
            {/* EXTRA LARGE Challenge Number */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 font-black px-8 py-6 rounded-3xl mb-6 shadow-lg">
                <span className="text-7xl md:text-8xl">#{challenge.number}</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                {challenge.title}
              </h3>

              {/* Completion Toggle Button */}
              <button
                onClick={() => toggleChallenge(challenge.id)}
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
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
            </div>

            {showAnalogies ? (
              <div className={`rounded-2xl p-6`} style={{ backgroundColor: colors.from.replace('from-', '').replace('500', '100').replace('600', '100') }}>
                <p className="text-lg font-medium mb-2" style={{ color: colors.from.replace('from-', '').replace('500', '800').replace('600', '800') }}>
                  💡 Gospel Connection:
                </p>
                <p className="text-xl" style={{ color: colors.from.replace('from-', '').replace('500', '700').replace('600', '700') }}>
                  {challenge.gospelConnection}
                </p>
                {challenge.scripture && (
                  <p className="text-lg mt-3 opacity-80">
                    {challenge.scripture}
                  </p>
                )}
                {challenge.photoTarget && (
                  <div className="mt-4 pt-4 border-t border-current/20">
                    <p className="text-base opacity-70">💭 Photo hint: {challenge.photoTarget}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-2xl p-6 text-center">
                <p className="text-gray-500 italic text-2xl">
                  Think about the gospel connection...
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-lg">
                📱 When taking photos, include this phone in the shot!
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
              Challenge {flatIndex + 1} of {allChallenges.length} • Path {selectedPathId}
            </span>
          </div>

          {/* Navigation Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDisplayMode('prev')}
              disabled={flatIndex === 0}
              className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 text-white p-4 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <div className="flex items-center gap-2">
              {allChallenges.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === flatIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => navigateDisplayMode('next')}
              disabled={flatIndex === allChallenges.length - 1}
              className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 text-white p-4 rounded-xl transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white relative">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header with Path Info */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
              <Map className="w-5 h-5" />
              <span className="font-semibold">Path {selectedPathId}</span>
            </div>
            <button
              onClick={onChangePath}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Change Path
            </button>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            The Hunt Begins!
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Complete all 15 challenges with your group
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
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
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
            const isExpanded = expandedCategory === category.id;

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
                  className={`bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
                    isExpanded ? 'ring-2 ring-blue-200' : ''
                  }`}
                  style={{
                    transform: isExpanded ? 'rotateX(2deg)' : 'rotateX(0deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Category Header */}
                  <div
                    className={`bg-gradient-to-r ${category.color} p-6 cursor-pointer`}
                    onClick={() => toggleCategory(category.id)}
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
                  </div>

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
                            <div className={`border rounded-2xl p-4 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                            }`}>
                              <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleChallenge(challenge.id)}
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

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                                      #{challenge.number}
                                    </span>
                                    <h4 className={`font-semibold text-gray-900 ${
                                      isCompleted ? 'line-through' : ''
                                    }`}>
                                      {challenge.title}
                                    </h4>
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
                                          <span className="text-blue-500 flex-shrink-0">👉</span>
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
                                        <span className="flex-shrink-0">💭</span>
                                        <span>Think about the gospel connection...</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Display Mode Button */}
                                <button
                                  onClick={() => enterDisplayMode(category, challengeIndex)}
                                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
                                  title="Display Mode"
                                >
                                  <Maximize2 className="w-5 h-5" />
                                </button>
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
