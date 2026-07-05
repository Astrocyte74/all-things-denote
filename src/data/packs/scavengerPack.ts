import type { GamePack } from '@/types';
import { categories, rules, bonusItems } from '@/data/scavengerData';
import { PATHS } from '@/data/paths';

// Visual tokens per category id (moved here from lib/theme.ts so each pack
// owns its own theming alongside its content).
const categoryTheme: GamePack['categoryTheme'] = {
  faith: {
    main: '#FFB020',
    edge: '#D98F00',
    soft: '#FFF4D9',
    text: '#8A5B00',
    btn: 'btn-sun',
    art: 'cat-faith',
    emoji: '🏮',
  },
  choices: {
    main: '#7A6CF0',
    edge: '#5A4BD8',
    soft: '#ECE9FF',
    text: '#453AA4',
    btn: 'btn-grape',
    art: 'cat-choices',
    emoji: '🧭',
  },
  service: {
    main: '#FF6B6B',
    edge: '#E04848',
    soft: '#FFE7E4',
    text: '#A83232',
    btn: 'btn-coral',
    art: 'cat-love',
    emoji: '💝',
  },
  scriptures: {
    main: '#2FBF71',
    edge: '#22995A',
    soft: '#DFF6E9',
    text: '#157A47',
    btn: 'btn-leaf',
    art: 'cat-scriptures',
    emoji: '📖',
  },
  community: {
    main: '#38B6FF',
    edge: '#1E93DB',
    soft: '#E0F3FF',
    text: '#0F6FA8',
    btn: 'btn-sky',
    art: 'cat-plan',
    emoji: '🌅',
  },
};

const bonusArt: GamePack['bonusArt'] = {
  'bonus-1': { art: 'bonus-drop', emoji: '💧' },
  'bonus-2': { art: 'bonus-dove', emoji: '🕊️' },
  'bonus-3': { art: 'bonus-heart', emoji: '❤️' },
  'bonus-4': { art: 'bonus-ring', emoji: '♾️' },
};

export const scavengerPack: GamePack = {
  id: 'scavenger',
  title: 'Scavenger Hunt',
  tagline: 'Gospel Analogies · Youth Activity',
  setting: 'the store',
  mascotArt: 'mascot',
  mascotEmoji: '🛒',
  mascotAlt: 'Scavenger hunt mascot — a happy shopping cart with a camera',
  scriptureCitation: 'Alma 30:44',
  scriptureQuote:
    '“All things denote there is a God; yea, even the earth, and all things that are upon the face of it…”',
  blurb:
    'Team up, race the aisles, and snap 15 photos of everyday things that secretly teach gospel truths.',
  statChips: [
    { emoji: '📸', label: '15 photos' },
    { emoji: '👥', label: '6 team paths' },
    { emoji: '🛒', label: 'store ready' },
  ],
  rules,
  categories,
  bonusItems,
  paths: PATHS,
  categoryTheme,
  bonusArt,
};
