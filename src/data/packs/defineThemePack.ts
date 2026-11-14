import type { CategoryTheme, Challenge, GamePack, Path, Rule } from '@/types';

type ChallengeInput = Omit<Challenge, 'number' | 'completed'>;
type ThemeInput = Omit<GamePack, 'categories' | 'paths' | 'categoryTheme' | 'statChips' | 'bonusItems' | 'bonusArt'> & {
  groups: {
    id: string;
    title: string;
    emoji: string;
    color: string;
    soft: string;
    art?: string;
    challenges: ChallengeInput[];
  }[];
  bonuses: { id: string; title: string; hint: string; connection: string; emoji: string; art?: string }[];
};

/** Stable routes for any challenge count; content authors do not maintain indices. */
export function createPaths(count: number): Path[] {
  const forward = Array.from({ length: count }, (_, i) => i + 1);
  const middle = Math.floor(count / 2);
  const outsideIn = forward.flatMap((_, i) => i < Math.ceil(count / 2)
    ? (i + 1 === count - i ? [i + 1] : [i + 1, count - i]) : []);
  const routes = [
    ['Forward journey', 'Begin at the first challenge and explore in order.', forward],
    ['Reverse journey', 'Start at the last challenge and work back.', [...forward].reverse()],
    ['A different beginning', 'Start halfway through, then circle back.', [...forward.slice(middle), ...forward.slice(0, middle)]],
    ['Odd & even', 'Visit odd-numbered challenges, then the even ones.', forward.filter(n => n % 2).concat(forward.filter(n => !(n % 2)))],
    ['Outside in', 'Alternate from the beginning and the end.', outsideIn],
    ['Inside out', 'Start in the middle and work toward the ends.', [...outsideIn].reverse()],
  ] as const;
  return routes.map(([name, description, order], i) => ({ id: 'ABCDEF'[i], name: `Path ${'ABCDEF'[i]} - ${name}`, description, order: [...order] }));
}

export function defineThemePack({ groups, bonuses, ...details }: ThemeInput): GamePack {
  let number = 0;
  const categoryTheme: Record<string, CategoryTheme> = {};
  const categories = groups.map(group => {
    const id = `${details.id}:${group.id}`;
    categoryTheme[id] = { main: group.color, edge: '#2E2459', soft: group.soft, text: '#2E2459', btn: 'btn-sun', art: group.art ?? '', emoji: group.emoji };
    return {
      id, title: group.title, icon: group.emoji, color: group.color,
      challenges: group.challenges.map(challenge => ({ ...challenge, id: `${details.id}:${challenge.id}`, number: ++number, completed: false })),
    };
  });
  return {
    ...details, categories, categoryTheme, paths: createPaths(number),
    statChips: [{ emoji: '📸', label: `${number} challenges` }, { emoji: '👥', label: '6 team paths' }, { emoji: '📱', label: 'Bring a phone' }],
    bonusItems: bonuses.map(bonus => ({ ...bonus, id: `${details.id}:${bonus.id}`, icon: bonus.emoji, color: details.library.color })),
    bonusArt: Object.fromEntries(bonuses.map(bonus => [`${details.id}:${bonus.id}`, { art: bonus.art ?? '', emoji: bonus.emoji }])),
  };
}

export function gameRules(first: { title: string; description: string }): Rule[] {
  return [
    { id: 'rule-1', ...first, icon: '📸' },
    { id: 'rule-2', title: 'Explore together', description: 'Stay with your team in the area your leader chooses.\nWalk, take turns, and ask before photographing people.', icon: '🚶' },
    { id: 'rule-3', title: 'Use what you find', description: 'Nothing to buy or collect. Leave objects and displays where they belong.\nDifferent teams may find different connections. Explain your thinking and listen to each other.', icon: '❤️' },
    { id: 'rule-4', title: 'Choose your path', description: 'Each team chooses a different path through the same challenges.', icon: '🗺️' },
    { id: 'rule-5', title: 'Invite friends', description: 'One phone per team is enough.', icon: '📱' },
  ];
}

/** Catch broken routes and ID collisions before they mix saved progress or photos. */
export function validatePacks(packs: GamePack[]) {
  const packIds = new Set<string>();
  const challengeIds = new Set<string>();
  const categoryIds = new Set<string>();
  const bonusIds = new Set<string>();
  for (const pack of packs) {
    if (packIds.has(pack.id)) throw new Error(`Duplicate pack ID: ${pack.id}`);
    packIds.add(pack.id);
    const challenges = pack.categories.flatMap(category => category.challenges);
    if (!challenges.length) throw new Error(`${pack.id}: add at least one challenge`);
    challenges.forEach((challenge, index) => {
      if (challengeIds.has(challenge.id)) throw new Error(`Duplicate challenge ID: ${challenge.id}`);
      challengeIds.add(challenge.id);
      if (challenge.number !== index + 1) throw new Error(`${pack.id}: challenge numbers must match content order`);
      if (challenge.scriptureClue && (!challenge.scriptureClue.excerpt || !challenge.scriptureClue.url.startsWith('https://'))) throw new Error(`${challenge.id}: scripture clues need an excerpt and source URL`);
    });
    if (!pack.paths.length) throw new Error(`${pack.id}: add a path`);
    if (new Set(pack.paths.map(path => path.id)).size !== pack.paths.length) throw new Error(`${pack.id}: duplicate path ID`);
    for (const path of pack.paths) {
      if (path.order.length !== challenges.length || new Set(path.order).size !== challenges.length || path.order.some(n => n < 1 || n > challenges.length || !Number.isInteger(n))) throw new Error(`${pack.id}/${path.id}: path must visit each challenge exactly once`);
    }
    for (const category of pack.categories) {
      if (categoryIds.has(category.id)) throw new Error(`Duplicate category ID: ${category.id}`);
      categoryIds.add(category.id);
      if (!pack.categoryTheme[category.id]) throw new Error(`${category.id}: missing theme`);
    }
    for (const bonus of pack.bonusItems) {
      if (bonusIds.has(bonus.id)) throw new Error(`Duplicate bonus ID: ${bonus.id}`);
      bonusIds.add(bonus.id);
    }
  }
}
