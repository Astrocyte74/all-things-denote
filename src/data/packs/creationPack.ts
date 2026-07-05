import type { GamePack, Category, Rule, BonusItem, Path } from '@/types';

// ── Creation Quest ──────────────────────────────────────────────────────────
// An outdoors/nature gospel-analogies pack: find evidences of the Creator in
// the natural world. Same engine as the store scavenger hunt; new content.

const rules: Rule[] = [
  {
    id: 'rule-1',
    title: 'Photo Hunt',
    description:
      '• Use the camera button to snap photos of each item in nature\n• Photos automatically tag with challenge info\n• Work together - one spots, one shoots',
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
        title: 'A source of light',
        photoTarget: 'The sun breaking through, a patch of bright sky, or dappled light.',
        gospelConnection: 'Christ is the Light of the World. How does light change how you feel and see?',
        scripture: 'John 8:12',
        completed: false,
      },
      {
        id: 'c-2',
        number: 2,
        title: 'A shadow',
        photoTarget: 'A clear shadow cast by a tree, person, or object.',
        gospelConnection: 'Shadows prove there is a light source. Hard times can point us toward the Light.',
        scripture: 'D&C 50:24',
        completed: false,
      },
      {
        id: 'c-3',
        number: 3,
        title: 'Something high above you',
        photoTarget: 'The sky, a cloud, the moon, or a tall treetop.',
        gospelConnection: 'Looking upward can turn our thoughts to God and His vast creation.',
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
        title: 'Water',
        photoTarget: 'A stream, puddle, lake, dew, or even a drop on a leaf.',
        gospelConnection: 'Water gives life and cleanses — like baptism and living water.',
        scripture: 'John 4:13–14',
        completed: false,
      },
      {
        id: 'c-5',
        number: 5,
        title: 'Something that needs water to live',
        photoTarget: 'A plant, moss, a tree — anything green growing.',
        gospelConnection: 'Just as plants thirst for water, our spirits thirst for the Living Water.',
        scripture: 'Psalm 42:1–2',
        completed: false,
      },
      {
        id: 'c-6',
        number: 6,
        title: 'Something clean or pure',
        photoTarget: 'Clear water, a white flower, or fresh new growth.',
        gospelConnection: 'Purity is being clean and ready for the Spirit to dwell with us.',
        scripture: 'D&C 121:45',
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
        title: 'A seed or something tiny that grows big',
        photoTarget: 'A seed, acorn, pinecone, or tiny sprout.',
        gospelConnection: 'Small things can become great — like faith and good habits.',
        scripture: 'Alma 32:27–28',
        completed: false,
      },
      {
        id: 'c-8',
        number: 8,
        title: 'A tall, strong tree',
        photoTarget: 'A mature tree with deep roots and a solid trunk.',
        gospelConnection: 'Trees with deep roots withstand storms — like a life built on Christ.',
        scripture: 'Helaman 5:12',
        completed: false,
      },
      {
        id: 'c-9',
        number: 9,
        title: 'Fruit or something that nourishes',
        photoTarget: 'Berries, fruit, nuts, or any food growing in nature.',
        gospelConnection: 'Good trees bring forth good fruit — our actions show our hearts.',
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
        title: 'A rock or stone',
        photoTarget: 'A solid rock, boulder, or pebble.',
        gospelConnection: 'Christ is our Rock — a sure foundation that does not move.',
        scripture: 'Helaman 5:12',
        completed: false,
      },
      {
        id: 'c-11',
        number: 11,
        title: 'A path or trail',
        photoTarget: 'A walking path, dirt trail, or worn way through the grass.',
        gospelConnection: 'There is a strait and narrow path that leads to life.',
        scripture: '2 Nephi 31:18–19',
        completed: false,
      },
      {
        id: 'c-12',
        number: 12,
        title: 'Something ancient or weathered',
        photoTarget: 'An old log, lichen-covered rock, or worn bark.',
        gospelConnection: 'The earth itself bears record that there is a Creator.',
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
        title: 'A bird or something that flies',
        photoTarget: 'A bird overhead, a feather, or an insect on the wing.',
        gospelConnection: 'God feeds even the birds — how much more does He watch over you?',
        scripture: 'Matthew 6:26',
        completed: false,
      },
      {
        id: 'c-14',
        number: 14,
        title: 'Evidence of a creature',
        photoTarget: 'A footprint, track, web, nest, or chirp you can photograph.',
        gospelConnection: 'All creatures testify of their Creator — great and small.',
        scripture: 'Moses 7:29–30',
        completed: false,
      },
      {
        id: 'c-15',
        number: 15,
        title: 'Something moving or alive',
        photoTarget: 'Leaves blowing, water rippling, an ant at work, or a bee.',
        gospelConnection: 'Life and motion everywhere point to a Living God who loves His works.',
        scripture: '2 Nephi 2:13',
        completed: false,
      },
    ],
  },
];

const bonusItems: BonusItem[] = [
  {
    id: 'cb-1',
    title: 'A Perfect Circle',
    hint: 'Find something naturally round (a stone, the sun, a ripple).',
    connection: 'No beginning and no end — like eternal life and God’s love.',
    icon: '⭕',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'cb-2',
    title: 'Three of Something',
    hint: 'Three leaves, three stones, three birds — find a natural three.',
    connection: 'The Godhead — three unified: Father, Son, and Holy Ghost.',
    icon: '3️⃣',
    color: 'from-sky-400 to-blue-500',
  },
  {
    id: 'cb-3',
    title: 'New Life',
    hint: 'A new sprout, a bud, a young shoot — evidence of renewal.',
    connection: 'Through Christ, we are made new — born again.',
    icon: '🌱',
    color: 'from-green-400 to-emerald-500',
  },
  {
    id: 'cb-4',
    title: 'Something That Reflects',
    hint: 'Water mirroring the sky, or a shiny surface in nature.',
    connection: 'We are to reflect the light and image of Christ.',
    icon: '🪞',
    color: 'from-violet-400 to-purple-500',
  },
];

const paths: Path[] = [
  { id: 'A', name: 'Path A - Forward Journey', description: 'Begin with Light and journey through each theme in order', order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'B', name: 'Path B - Reverse Exploration', description: 'Begin with the creatures and work backwards', order: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'C', name: 'Path C - Inside-Out', description: 'Start in the middle and alternate directions', order: [8, 9, 7, 10, 6, 11, 5, 12, 4, 13, 3, 14, 2, 15, 1] },
  { id: 'D', name: 'Path D - Theme Shuffle', description: 'Complete all challenges from each category before moving on', order: [1, 4, 7, 10, 13, 2, 5, 8, 11, 14, 3, 6, 9, 12, 15] },
  { id: 'E', name: 'Path E - Alternating Focus', description: 'Switch between early and late challenges', order: [1, 15, 2, 14, 3, 13, 4, 12, 5, 11, 6, 10, 7, 9, 8] },
  { id: 'F', name: 'Path F - Surprise Mix', description: 'A mixed order for maximum variety', order: [7, 2, 12, 9, 4, 15, 6, 11, 1, 10, 3, 14, 8, 5, 13] },
];

const categoryTheme: GamePack['categoryTheme'] = {
  light: { main: '#FFB020', edge: '#D98F00', soft: '#FFF4D9', text: '#8A5B00', btn: 'btn-sun', art: 'cat-faith', emoji: '☀️' },
  water: { main: '#38B6FF', edge: '#1E93DB', soft: '#E0F3FF', text: '#0F6FA8', btn: 'btn-sky', art: 'cat-plan', emoji: '💧' },
  growth: { main: '#2FBF71', edge: '#22995A', soft: '#DFF6E9', text: '#157A47', btn: 'btn-leaf', art: 'cat-scriptures', emoji: '🌱' },
  earth: { main: '#7A6CF0', edge: '#5A4BD8', soft: '#ECE9FF', text: '#453AA4', btn: 'btn-grape', art: 'cat-choices', emoji: '🏔️' },
  creatures: { main: '#FF6B6B', edge: '#E04848', soft: '#FFE7E4', text: '#A83232', btn: 'btn-coral', art: 'cat-love', emoji: '🕊️' },
};

const bonusArt: GamePack['bonusArt'] = {
  'cb-1': { art: 'bonus-ring', emoji: '⭕' },
  'cb-2': { art: 'bonus-dove', emoji: '3️⃣' },
  'cb-3': { art: 'bonus-heart', emoji: '🌱' },
  'cb-4': { art: 'bonus-drop', emoji: '🪞' },
};

export const creationPack: GamePack = {
  id: 'creation',
  title: 'Creation Quest',
  tagline: 'Gospel Truths in the Outdoors · Youth Activity',
  setting: 'the outdoors',
  mascotArt: 'mascot', // reused; emoji fallback below shows until a nature mascot is generated
  mascotEmoji: '🌿',
  mascotAlt: 'Creation Quest mascot — a magnifying glass over a sprouting leaf',
  scriptureCitation: 'Psalm 19:1',
  scriptureQuote: '“The heavens declare the glory of God; and the firmament sheweth his handywork.”',
  blurb:
    'Head outside and capture 15 photos of God’s creations — each one a clue that points back to its Creator.',
  statChips: [
    { emoji: '📸', label: '15 photos' },
    { emoji: '👥', label: '6 team paths' },
    { emoji: '🌳', label: 'outdoor ready' },
  ],
  rules,
  categories,
  bonusItems,
  paths,
  categoryTheme,
  bonusArt,
};
