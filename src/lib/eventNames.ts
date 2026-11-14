import type { GamePack } from '@/types';

const EVENT_IDEAS = [
  'The Great Discovery', 'Everyday Wonders', 'Adventure Together', 'Finders Keep Smiling',
  'A Closer Look', 'Hidden in Plain Sight', 'The Good Find', 'Small Things, Big Meaning',
  'Ready, Set, Discover', 'The Wonder Hunt', 'Better Together', 'Follow the Clues',
  'Look Around', 'The Discovery Challenge', 'An Unexpected Adventure', 'Find Your Spark',
  'Clues and Connections', 'The Curiosity Quest', 'Something Worth Finding', 'One More Clue',
  'Gather and Discover', 'A Fresh Perspective', 'See the Good', 'The Everyday Adventure',
  'The Big Picture', 'Snapshots and Stories', 'The Hidden Gems Hunt', 'Eyes Wide Open',
  'The Search Is On', 'Discover the Difference', 'Meaning in the Making', 'Good Things Ahead',
  'The Shared Adventure', 'The Wonder Challenge', 'Find, Snap, Share', 'Take a Closer Look',
  'The Connection Quest', 'New Ways to See', 'Little Discoveries', 'The Together Trek',
  'Clue by Clue', 'Ready for Wonder', 'The Discovery Trail', 'The Great Team Quest',
  'More Than Meets the Eye', 'The Joy of Finding', 'The Picture Quest', 'A World of Wonder',
  'Go Seek Something Good', 'The Memory Makers', 'Look, Find, Connect', 'An Adventure to Remember',
] as const;

/** Month comes from the leader's local date; suggestions do not depend on a holiday or venue. */
export function eventNameSuggestions(pack: GamePack, date = new Date()): string[] {
  const month = date.toLocaleDateString('en', { month: 'long' });
  return [...new Set([
    `${pack.title} · ${month}`, `${month} Discoveries`, `${month} Adventure`,
    `${pack.title} Together`, `${month} Clue Crew`, `${pack.title} Challenge`,
    ...EVENT_IDEAS,
  ])].filter(name => Array.from(name).length <= 60);
}

/** Prefer fresh chips, but keep short lists usable when fewer than a full batch remain. */
export function shuffledSuggestions(names: readonly string[], count = 6, exclude: readonly string[] = []): string[] {
  const excluded = new Set(exclude);
  const shuffle = (items: string[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const unique = [...new Set(names)];
  return [...shuffle(unique.filter(name => !excluded.has(name))), ...shuffle(unique.filter(name => excluded.has(name)))].slice(0, count);
}
