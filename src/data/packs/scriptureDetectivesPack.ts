import type { Challenge } from '@/types';
import { defineThemePack, gameRules } from './defineThemePack';

// Short excerpts verified against the linked editions. The source link provides
// the complete verse and context; the excerpt itself is available offline.
function clue(id: string, reference: string, excerpt: string, path: string, verse: number, collection: 'Bible' | 'Book of Mormon', gospelConnection: string): Omit<Challenge, 'number' | 'completed'> {
  return {
    id, title: reference,
    photoTarget: 'Find an object that could represent this scripture. Photograph it, then explain the connection to your team. There is more than one good answer.',
    gospelConnection,
    scriptureClue: {
      reference, excerpt, collection,
      url: `https://www.churchofjesuschrist.org/study/scriptures/${path}?lang=eng&id=p${verse}#p${verse}`,
    },
  };
}

export const scriptureDetectivesPack = defineThemePack({
  id: 'scripture-detectives',
  title: 'Scripture Detectives',
  tagline: 'Read it. Find it. Explain it.',
  setting: 'your surroundings',
  locationLabel: 'Indoors or outdoors',
  mascotArt: '', mascotEmoji: '🔎', mascotAlt: 'A magnifying glass for scripture detectives',
  scriptureCitation: 'Alma 37:6',
  scriptureQuote: '“By small and simple things are great things brought to pass.”',
  blurb: 'Your clues are scriptures. Read 12 passages from the Bible and Book of Mormon, then find everyday objects that help you tell their story.',
  library: { summary: 'Read a scripture. Find an object. Make the connection.', label: 'Scripture → discovery', color: '#A99BF4', soft: '#ECE9FF' },
  discussionPrompt: 'Show your team a photo and read its scripture again. Which words connect to your object? How might another team represent the same passage differently?',
  rules: gameRules({ title: 'Follow the scripture', description: 'Read the passage before looking for an object. The excerpt works offline; the full-passage link needs internet.\nChoose your own object, photograph it, and explain which words or ideas it represents.\nThere is no single correct object. A discussion prompt appears after you complete each challenge.' }),
  groups: [
    {
      id: 'first-cases', title: 'Case files 01–04', emoji: '🔎', color: '#A99BF4', soft: '#ECE9FF',
      challenges: [
        clue('psalm-119-105', 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.', 'ot/ps/119', 105, 'Bible', 'Which part of your object represents guidance? When has a scripture helped you decide what to do next?'),
        clue('alma-37-6', 'Alma 37:6', 'by small and simple things are great things brought to pass', 'bofm/alma/37', 6, 'Book of Mormon', 'How can something small have a bigger effect than we expect? Name a small act of faith or kindness you could repeat this week.'),
        clue('hebrews-6-19', 'Hebrews 6:19', 'Which hope we have as an anchor of the soul, both sure and steadfast', 'nt/heb/6', 19, 'Bible', 'What does your object help hold steady? How does hope in Jesus Christ help you when circumstances change?'),
        clue('helaman-5-12', 'Helaman 5:12', 'it is upon the rock of our Redeemer, who is Christ, the Son of God, that ye must build your foundation', 'bofm/hel/5', 12, 'Book of Mormon', 'What gives your object stability? What does building your life on Christ look like in an ordinary day?'),
      ],
    },
    {
      id: 'next-cases', title: 'Case files 05–08', emoji: '🕵️', color: '#38B6FF', soft: '#E0F3FF',
      challenges: [
        clue('john-15-5', 'John 15:5', 'I am the vine, ye are the branches', 'nt/john/15', 5, 'Bible', 'How does your object show connection or dependence? What helps you stay connected to Jesus Christ?'),
        clue('alma-32-41', 'Alma 32:41', 'nourish the tree as it beginneth to grow, by your faith with great diligence, and with patience', 'bofm/alma/32', 41, 'Book of Mormon', 'What does your object need in order to grow or last? What could nourish your faith over time?'),
        clue('matthew-13-31', 'Matthew 13:31–32', 'The kingdom of heaven is like to a grain of mustard seed, which a man took, and sowed in his field', 'nt/matt/13', 31, 'Bible', 'How does your object represent a beginning with room to grow? What good thing could your team start, even in a small way?'),
        clue('mosiah-2-17', 'Mosiah 2:17', 'when ye are in the service of your fellow beings ye are only in the service of your God', 'bofm/mosiah/2', 17, 'Book of Mormon', 'How does your object connect to helping another person? Who could benefit from a small act of service from your team?'),
      ],
    },
    {
      id: 'final-cases', title: 'Case files 09–12', emoji: '📖', color: '#FFB020', soft: '#FFF4D9',
      challenges: [
        clue('matthew-5-14', 'Matthew 5:14', 'Ye are the light of the world. A city that is set on an hill cannot be hid.', 'nt/matt/5', 14, 'Bible', 'What can others notice through your object? How can your example bring light without drawing attention to yourself?'),
        clue('2-nephi-32-3', '2 Nephi 32:3', 'feast upon the words of Christ; for behold, the words of Christ will tell you all things what ye should do.', 'bofm/2-ne/32', 3, 'Book of Mormon', 'How does your object suggest taking something in or being nourished? What is the difference between skimming a scripture and feasting on it?'),
        clue('matthew-7-24', 'Matthew 7:24–25', 'I will liken him unto a wise man, which built his house upon a rock', 'nt/matt/7', 24, 'Bible', 'How does your object represent putting a teaching into practice? What is one teaching of Jesus you can act on this week?'),
        clue('1-nephi-8-30', '1 Nephi 8:30', 'they did press their way forward, continually holding fast to the rod of iron', 'bofm/1-ne/8', 30, 'Book of Mormon', 'How does your object suggest holding on while moving forward? What helps you keep following God when you feel distracted?'),
      ],
    },
  ],
  bonuses: [
    { id: 'another-angle', title: 'A second interpretation', hint: 'Pick a scripture and find a completely different object for it.', connection: 'Compare the words each object illustrates. Different examples can help us notice more in the same scripture.', emoji: '🔄' },
    { id: 'connect-two', title: 'Connect two passages', hint: 'Choose two of your scripture clues that teach related ideas.', connection: 'Show one photo for each passage and explain how the teachings strengthen each other.', emoji: '🔗' },
    { id: 'put-it-to-work', title: 'Put it into practice', hint: 'Choose one teaching from the hunt to act on this week.', connection: 'Describe a specific action, who it could help, and when you will try it.', emoji: '👣' },
  ],
});
