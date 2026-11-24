import type { GamePack, Category, Rule, BonusItem, Path } from '@/types';

// ── Creation Quest ──────────────────────────────────────────────────────────
// An outdoors/nature gospel-analogies pack: find evidences of the Creator in
// the natural world. Same engine as the store scavenger hunt; new content.

const rules: Rule[] = [
  {
    id: 'rule-1',
    title: 'Photo Hunt',
    description:
      'Take turns spotting a detail and framing the photo.\nUse what this season gives you. Tracks, bare branches, and dry seed heads can tell a story too.',
    icon: '📸',
  },
  {
    id: 'rule-2',
    title: 'Stay Safe',
    description:
      '• Stay on marked trails and with your group\n• Watch your footing on rocks and slopes\n• Keep a respectful distance from any wildlife',
    icon: '🥾',
  },
  {
    id: 'rule-3',
    title: 'Respect Creation',
    description:
      "• Leave plants and animals where they are - take only pictures\n• Don't litter or break living branches\n• Treat the outdoors like sacred ground",
    icon: '🌿',
  },
  {
    id: 'rule-4',
    title: 'Choose Your Path',
    description:
      '• Each team picks a different path (A, B, C, D, E, or F)\n• Tap "Change Path" to switch your path\n• Different paths = different challenge orders',
    icon: '🗺️',
  },
  {
    id: 'rule-5',
    title: 'Invite Friends',
    description:
      '• Scan the QR code to share this quest\n• Each team needs at least one phone with the app\n• More teams = more fun!',
    icon: '📱',
  },
];

const categories: Category[] = [
  {
    id: 'light',
    title: 'Light & Sky',
    icon: 'Sun',
    color: 'from-amber-400 to-yellow-300',
    challenges: [
      {
        id: 'c-1',
        number: 1,
        title: 'Where the light lands',
        photoTarget: 'Find a place where light lets you see a detail. Try bark, a roof edge, or the ground on a cloudy day.',
        gospelConnection: 'What can you see because of the light? What has Christ helped you see more clearly?',
        scripture: 'John 8:12',
        completed: false,
      },
      {
        id: 'c-2',
        number: 2,
        title: 'Two shades, one picture',
        photoTarget: 'Frame something darker beside something lighter. A shadow works, and so do two sides of a stone.',
        gospelConnection: 'Which detail stands out where the light changes? When has a little more gospel light helped you see a familiar thing differently?',
        scripture: 'D&C 50:24',
        completed: false,
      },
      {
        id: 'c-3',
        number: 3,
        title: 'Look up from here',
        photoTarget: 'Stand still and aim above eye level. Include something close and something far away.',
        gospelConnection: 'What looks small from where you stand? What would you like to ask the Creator about this view?',
        scripture: 'Psalm 8:3–4',
        completed: false,
      },
    ],
  },
  {
    id: 'water',
    title: 'Water & Life',
    icon: 'Droplet',
    color: 'from-sky-500 to-cyan-400',
    challenges: [
      {
        id: 'c-4',
        number: 4,
        title: 'Water was here',
        photoTarget: 'Find water or a mark it left. Ice, a dry waterline, or a groove in the soil all count.',
        gospelConnection: 'Where did the water go? What do you think Jesus wanted the woman at the well to imagine when He spoke of living water?',
        scripture: 'John 4:13–14',
        completed: false,
      },
      {
        id: 'c-5',
        number: 5,
        title: 'Waiting for a drink',
        photoTarget: 'Find a living thing that depends on water, even if its branches are bare today.',
        gospelConnection: 'Where would water reach it? What helps you turn to God when your spirit feels thirsty?',
        scripture: 'Psalm 42:1–2',
        completed: false,
      },
      {
        id: 'c-6',
        number: 6,
        title: 'Something the weather changed',
        photoTarget: 'Find a surface that rain, frost, or wind has changed. Show the edge where the change is easiest to see.',
        gospelConnection: 'How can you tell it changed? What small change might someone notice when you practice kindness?',
        completed: false,
      },
    ],
  },
  {
    id: 'growth',
    title: 'Growth & Seeds',
    icon: 'Sprout',
    color: 'from-green-500 to-lime-400',
    challenges: [
      {
        id: 'c-7',
        number: 7,
        title: 'A beginning you could overlook',
        photoTarget: 'Look for the start of something larger. A bud on a bare twig counts as much as a seed or sprout.',
        gospelConnection: 'What might come from this small beginning? What would give a little seed of faith a chance to grow?',
        scripture: 'Alma 32:27–28',
        completed: false,
      },
      {
        id: 'c-8',
        number: 8,
        title: 'Holding its ground',
        photoTarget: 'Find a tree or shrub still standing where the weather reaches it. Photograph what helps it stand.',
        gospelConnection: 'What steadies it that your camera can see? What helps you stay grounded in Christ that a camera would miss?',
        scripture: 'Helaman 5:12',
        completed: false,
      },
      {
        id: 'c-9',
        number: 9,
        title: 'A meal for another creature',
        photoTarget: 'Look for something that could feed a creature this season. Seeds in a dry flower head or nibbled bark count.',
        gospelConnection: 'Who might depend on what you found? What good comes from something you do that another person can depend on?',
        scripture: '3 Nephi 14:17',
        completed: false,
      },
    ],
  },
  {
    id: 'earth',
    title: 'Earth & Stone',
    icon: 'Mountain',
    color: 'from-violet-500 to-purple-400',
    challenges: [
      {
        id: 'c-10',
        number: 10,
        title: 'What carries the weight?',
        photoTarget: 'Find a stone or solid patch of ground that supports something. Show both in the frame.',
        gospelConnection: 'Trace the weight down through your picture. What might it look like to build one decision on Christ?',
        scripture: 'Helaman 5:12',
        completed: false,
      },
      {
        id: 'c-11',
        number: 11,
        title: 'A path you can follow',
        photoTarget: 'Find a cue that shows where a path goes next. It might be a worn edge, a bend, or tracks through snow.',
        gospelConnection: 'Which detail would guide someone new here? What helps you keep following Christ when you can see only the next few steps?',
        scripture: '2 Nephi 31:18–19',
        completed: false,
      },
      {
        id: 'c-12',
        number: 12,
        title: 'Time left a mark',
        photoTarget: 'Look for a surface that tells you it has been here a while. Get close to one crack, groove, or worn edge.',
        gospelConnection: 'What story can you read in that mark? What does taking a longer look help you appreciate about God’s creations?',
        scripture: 'Alma 30:44',
        completed: false,
      },
    ],
  },
  {
    id: 'creatures',
    title: 'Creatures & Movement',
    icon: 'Bird',
    color: 'from-rose-500 to-pink-400',
    challenges: [
      {
        id: 'c-13',
        number: 13,
        title: 'A place to perch',
        photoTarget: 'Look for a place a bird could rest or shelter in this weather. Frame it from where you stand.',
        gospelConnection: 'Why might a bird choose this spot? Who has helped you feel cared for in an ordinary place?',
        scripture: 'Matthew 6:26',
        completed: false,
      },
      {
        id: 'c-14',
        number: 14,
        title: 'An animal was here',
        photoTarget: 'Photograph a sign an animal left. Look for tracks, a web, a nest, or a chewed cone. If you see none, show where you would look and why.',
        gospelConnection: 'Show the team your evidence. Job invites us to learn from animals. What does looking for this creature make you wonder about its Maker?',
        scripture: 'Job 12:7–10',
        completed: false,
      },
      {
        id: 'c-15',
        number: 15,
        title: 'Catch a change',
        photoTarget: 'Watch one spot for ten seconds. Photograph something moving, or a trace of movement from earlier.',
        gospelConnection: 'What happened that a single photo can only hint at? Which part of this little scene would you thank God for?',
        completed: false,
      },
    ],
  },
];

const bonusItems: BonusItem[] = [
  {
    id: 'cb-1',
    title: 'The tiny tour',
    hint: 'Choose a patch of ground the size of your shoe. Count the different textures you see.',
    connection: 'Guide a teammate through that tiny place. Which detail made you stop and give thanks?',
    icon: '🔍',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'cb-2',
    title: 'Another season',
    hint: 'Choose one of today’s photos. Imagine standing in the same spot six months from now.',
    connection: 'What might change? What would you look for to recognize the same creation?',
    icon: '🍂',
    color: 'from-sky-400 to-blue-500',
  },
  {
    id: 'cb-3',
    title: 'Two things that need each other',
    hint: 'Find two things outdoors that depend on each other or fit together.',
    connection: 'Show where the connection happens. Who relies on a small thing you do?',
    icon: '🌿',
    color: 'from-green-400 to-emerald-500',
  },
  {
    id: 'cb-4',
    title: 'A second pair of eyes',
    hint: 'Give two teammates ten seconds to look at the same view. Each points out one detail.',
    connection: 'What did your teammate notice that you missed? How did their view add to your appreciation of the Creator?',
    icon: '👀',
    color: 'from-violet-400 to-purple-500',
  },
];

const paths: Path[] = [
  { id: 'A', name: 'Path A - Forward Journey', description: 'Begin with Light and journey through each theme in order', order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'B', name: 'Path B - Reverse Exploration', description: 'Begin with the creatures and work backwards', order: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'C', name: 'Path C - Inside-Out', description: 'Start in the middle and alternate directions', order: [8, 9, 7, 10, 6, 11, 5, 12, 4, 13, 3, 14, 2, 15, 1] },
  { id: 'D', name: 'Path D - Theme Shuffle', description: 'Visit one clue from each theme, then circle through them again', order: [1, 4, 7, 10, 13, 2, 5, 8, 11, 14, 3, 6, 9, 12, 15] },
  { id: 'E', name: 'Path E - Alternating Focus', description: 'Switch between early and late challenges', order: [1, 15, 2, 14, 3, 13, 4, 12, 5, 11, 6, 10, 7, 9, 8] },
  { id: 'F', name: 'Path F - Surprise Mix', description: 'A mixed order for maximum variety', order: [7, 2, 12, 9, 4, 15, 6, 11, 1, 10, 3, 14, 8, 5, 13] },
];

const categoryTheme: GamePack['categoryTheme'] = {
  light: { main: '#FFB020', edge: '#D98F00', soft: '#FFF4D9', text: '#8A5B00', btn: 'btn-sun', art: 'c-light', emoji: '☀️' },
  water: { main: '#38B6FF', edge: '#1E93DB', soft: '#E0F3FF', text: '#0F6FA8', btn: 'btn-sky', art: 'c-water', emoji: '💧' },
  growth: { main: '#2FBF71', edge: '#22995A', soft: '#DFF6E9', text: '#157A47', btn: 'btn-leaf', art: 'c-growth', emoji: '🌱' },
  earth: { main: '#7A6CF0', edge: '#5A4BD8', soft: '#ECE9FF', text: '#453AA4', btn: 'btn-grape', art: 'c-earth', emoji: '🏔️' },
  creatures: { main: '#FF6B6B', edge: '#E04848', soft: '#FFE7E4', text: '#A83232', btn: 'btn-coral', art: 'c-creatures', emoji: '🕊️' },
};

const bonusArt: GamePack['bonusArt'] = {
  'cb-1': { art: '', emoji: '🔍' },
  'cb-2': { art: '', emoji: '🍂' },
  'cb-3': { art: '', emoji: '🌿' },
  'cb-4': { art: '', emoji: '👀' },
};

export const creationPack: GamePack = {
  id: 'creation',
  library: { summary: 'Head outside and discover signs of the Creator.', label: 'Nature & wonder', color: '#2FBF71', soft: '#DFF6E9' },
  title: 'Creation Quest',
  tagline: 'Gospel Truths in the Outdoors · Youth Activity',
  setting: 'the outdoors',
  locationLabel: 'Outdoors',
  mascotArt: 'c-mascot', // Creation Quest mascot; emoji fallback shows until the WebP is published
  mascotEmoji: '🌿',
  mascotAlt: 'Creation Quest mascot — a magnifying glass over a sprouting leaf',
  scriptureCitation: 'Psalm 19:1',
  scriptureQuote: '“The heavens declare the glory of God; and the firmament sheweth his handywork.”',
  blurb:
    'Head outside and capture 15 photos of God’s creations — each one a clue that points back to its Creator.',
  discussionPrompt: 'Show the outdoor detail you nearly walked past. What helped you notice it? Invite someone else to add one thing they see in your photo. What would you thank God for on this walk?',
  statChips: [
    { emoji: '📸', label: '15 photos' },
    { emoji: '👥', label: '6 team paths' },
    { emoji: '📱', label: 'Bring a phone' },
  ],
  rules,
  categories,
  bonusItems,
  paths,
  categoryTheme,
  bonusArt,
};
