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
  'bonus-1': { art: '', emoji: '📷' },
  'bonus-2': { art: '', emoji: '🔍' },
  'bonus-3': { art: '', emoji: '🤲' },
  'bonus-4': { art: '', emoji: '🗓️' },
};

export const scavengerPack: GamePack = {
  id: 'scavenger',
  library: { summary: 'See familiar shelves through someone else’s eyes.', label: 'Everyday discoveries', color: '#FFB020', soft: '#FFF4D9' },
  title: 'Scavenger Hunt',
  tagline: 'Gospel Analogies · Youth Activity',
  setting: 'the store',
  locationLabel: 'At the store',
  mascotArt: 'mascot',
  mascotEmoji: '🛒',
  mascotAlt: 'Scavenger hunt mascot — a happy shopping cart with a camera',
  scriptureCitation: 'Alma 30:44',
  scriptureQuote:
    '“All things denote there is a God; yea, even the earth, and all things that are upon the face of it…”',
  blurb:
    'Explore the aisles together. Choose 15 ordinary finds and show what each one helps you understand about following Jesus Christ.',
  discussionPrompt: 'Choose a store photo another team might find puzzling. Let someone guess why you took it, then point out the detail that connected it to the gospel for you.',
  statChips: [
    { emoji: '📸', label: '15 photos' },
    { emoji: '👥', label: '6 team paths' },
    { emoji: '📱', label: 'Bring a phone' },
  ],
  rules,
  categories,
  bonusItems,
  paths: PATHS,
  categoryTheme,
  bonusArt,
};
