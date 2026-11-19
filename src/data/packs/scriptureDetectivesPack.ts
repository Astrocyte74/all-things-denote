import type { Challenge } from '@/types';
import { defineThemePack, gameRules } from './defineThemePack';

// Short excerpts verified against the linked editions. The source link provides
// the complete verse and context; the excerpt itself is available offline.
function clue(id: string, reference: string, excerpt: string, path: string, verse: number, collection: 'Bible' | 'Book of Mormon', photoTarget: string, gospelConnection: string): Omit<Challenge, 'number' | 'completed'> {
  return {
    id, title: reference,
    photoTarget,
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
  discussionPrompt: 'Show a photo and let the group guess which words in the passage caught your eye. Read those words aloud. What does your object help you understand about them?',
  rules: gameRules({ title: 'Follow the scripture', description: 'Read the verse aloud. Use its clue to choose an object, photograph it, and explain which words fit your choice.\nTake turns reading and choosing. The excerpt works offline.' }),
  groups: [
    {
      id: 'first-cases', title: 'Case files 01–04', emoji: '🔎', color: '#A99BF4', soft: '#ECE9FF',
      challenges: [
        clue('psalm-119-105', 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.', 'ot/ps/119', 105, 'Bible', 'Find something that shows just enough of the way ahead to take the next step.', 'Where would you put your foot next? When has a verse helped you make one decision?'),
        clue('alma-37-6', 'Alma 37:6', 'by small and simple things are great things brought to pass', 'bofm/alma/37', 6, 'Book of Mormon', 'Find the smallest thing you can that makes a big difference to how something works.', 'What would change if your tiny find were missing? Which small act of kindness has mattered to you?'),
        clue('hebrews-6-19', 'Hebrews 6:19', 'Which hope we have as an anchor of the soul, both sure and steadfast', 'nt/heb/6', 19, 'Bible', 'Find something that holds steady when something else moves.', 'Point to what’s doing the holding. Why do you think the verse compares hope to an anchor?'),
        clue('helaman-5-12', 'Helaman 5:12', 'it is upon the rock of our Redeemer, who is Christ, the Son of God, that ye must build your foundation', 'bofm/hel/5', 12, 'Book of Mormon', 'Show what something rests on. Try to fit the support and what it holds in one frame.', 'Which part takes the weight? What would it mean to rely on Christ for a choice you face this week?'),
      ],
    },
    {
      id: 'next-cases', title: 'Case files 05–08', emoji: '🕵️', color: '#38B6FF', soft: '#E0F3FF',
      challenges: [
        clue('john-15-5', 'John 15:5', 'I am the vine, ye are the branches', 'nt/john/15', 5, 'Bible', 'Find something that depends on a connection. Show us where the two parts meet.', 'Point to the place they join. What helps you feel connected to Jesus Christ on an ordinary day?'),
        clue('alma-32-41', 'Alma 32:41', 'nourish the tree as it beginneth to grow, by your faith with great diligence, and with patience', 'bofm/alma/32', 41, 'Book of Mormon', 'Look for evidence that someone has kept caring for something over time.', 'What tells you someone came back to tend it? Which habit of faith would you like to keep tending?'),
        clue('matthew-13-31', 'Matthew 13:31–32', 'The kingdom of heaven is like to a grain of mustard seed, which a man took, and sowed in his field', 'nt/matt/13', 31, 'Bible', 'Find a small beginning. Leave room in the picture for what it could become.', 'What do you imagine filling that space? What good thing could your team start on a small scale?'),
        clue('mosiah-2-17', 'Mosiah 2:17', 'when ye are in the service of your fellow beings ye are only in the service of your God', 'bofm/mosiah/2', 17, 'Book of Mormon', 'Photograph a tool someone could use to do a quiet favor today.', 'Who could use a hand with that job? How does the verse change the way you see doing it?'),
      ],
    },
    {
      id: 'final-cases', title: 'Case files 09–12', emoji: '📖', color: '#FFB020', soft: '#FFF4D9',
      challenges: [
        clue('matthew-5-14', 'Matthew 5:14', 'Ye are the light of the world. A city that is set on an hill cannot be hid.', 'nt/matt/5', 14, 'Bible', 'Pick something you can spot from across the room or down the path.', 'What made your eye go there? What quiet example of following Jesus has caught your attention?'),
        clue('2-nephi-32-3', '2 Nephi 32:3', 'feast upon the words of Christ; for behold, the words of Christ will tell you all things what ye should do.', 'bofm/2-ne/32', 3, 'Book of Mormon', 'Find something that rewards staying with it a little longer.', 'What would you miss by rushing past? Pick a word from the verse that you want to spend more time with.'),
        clue('matthew-7-24', 'Matthew 7:24–25', 'I will liken him unto a wise man, which built his house upon a rock', 'nt/matt/7', 24, 'Bible', 'Find evidence that someone heard good advice and actually used it.', 'What action left the evidence in your picture? What teaching of Jesus could you put into practice today?'),
        clue('1-nephi-8-30', '1 Nephi 8:30', 'they did press their way forward, continually holding fast to the rod of iron', 'bofm/1-ne/8', 30, 'Book of Mormon', 'Find something you can hold on to while you keep moving.', 'Show where someone would hold on. What helps you keep hold of God’s word on a distracting day?'),
      ],
    },
  ],
  bonuses: [
    { id: 'another-angle', title: 'A second interpretation', hint: 'Pick one verse. Have two teammates choose different objects for it.', connection: 'Which words did each person focus on? Give the group a chance to spot both connections.', emoji: '🔄' },
    { id: 'connect-two', title: 'Connect two passages', hint: 'Choose two verses that one of your photos could illustrate.', connection: 'Read a phrase from each. How does the meaning of the photo change the second time?', emoji: '🔗' },
    { id: 'put-it-to-work', title: 'Put it into practice', hint: 'Choose a photo you could use as a reminder tomorrow.', connection: 'Finish this sentence together. “When I see this again, I want to remember to…”', emoji: '👣' },
  ],
});
