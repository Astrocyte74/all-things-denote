import type { Path } from '@/types';

export type { Path };

export const PATHS: Path[] = [
  {
    id: 'A',
    name: 'Path A - Forward Journey',
    description: 'Start with faith and journey through each theme in order',
    order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: 'B',
    name: 'Path B - Reverse Exploration',
    description: 'Begin with community themes and work backwards',
    order: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  },
  {
    id: 'C',
    name: 'Path C - Inside-Out',
    description: 'Start in the middle and alternate directions',
    order: [8, 9, 7, 10, 6, 11, 5, 12, 4, 13, 3, 14, 2, 15, 1]
  },
  {
    id: 'D',
    name: 'Path D - Theme Shuffle',
    description: 'Complete all challenges from each category before moving on',
    order: [1, 4, 7, 10, 13, 2, 5, 8, 11, 14, 3, 6, 9, 12, 15]
  },
  {
    id: 'E',
    name: 'Path E - Alternating Focus',
    description: 'Switch between early and late challenges',
    order: [1, 15, 2, 14, 3, 13, 4, 12, 5, 11, 6, 10, 7, 9, 8]
  },
  {
    id: 'F',
    name: 'Path F - Surprise Mix',
    description: 'A randomized order for maximum variety',
    order: [7, 2, 12, 9, 4, 15, 6, 11, 1, 10, 3, 14, 8, 5, 13]
  }
];

export function getPathById(id: string): Path | undefined {
  return PATHS.find(path => path.id === id);
}

export function reorderChallenges<T>(challenges: T[], order: number[]): T[] {
  return order.map(num => challenges[num - 1]).filter(Boolean);
}
