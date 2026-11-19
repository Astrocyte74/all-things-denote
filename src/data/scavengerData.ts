import type { Category, Rule, BonusItem } from '@/types';

export const rules: Rule[] = [
  {
    id: 'rule-1',
    title: 'Photo Hunt',
    description: 'Take turns choosing the object and taking the photo.\nFrame the detail you want the rest of the team to notice.',
    icon: '📸'
  },
  {
    id: 'rule-2',
    title: 'Safety First',
    description: '• Walk, don\'t run\n• Stay with your group at all times\n• Be aware of your surroundings',
    icon: '🚶'
  },
  {
    id: 'rule-3',
    title: 'Be Respectful',
    description: '• Be kind to store employees and other shoppers\n• Don\'t block aisles or disturb products\n• Have fun and be a good example',
    icon: '❤️'
  },
  {
    id: 'rule-4',
    title: 'Choose Your Path',
    description: '• Each team should pick a different path (A, B, C, D, E, or F)\n• Tap "Change Path" to switch your path\n• Different paths = different challenge orders',
    icon: '🗺️'
  },
  {
    id: 'rule-5',
    title: 'Invite Friends',
    description: '• Scan the QR code to share this scavenger hunt\n• Each team needs at least one phone with the app\n• More teams = more fun!',
    icon: '📱'
  }
];

export const categories: Category[] = [
  {
    id: 'faith',
    title: 'Faith & Light',
    icon: 'Lightbulb',
    color: 'from-blue-500 to-cyan-400',
    challenges: [
      {
        id: 'challenge-1',
        number: 1,
        title: 'Light for a particular job',
        photoTarget: 'Find a light made for a particular job. Frame the photo so we can guess who needs it.',
        gospelConnection: 'Who needs this light, and when? What small thing could you do to make someone’s day brighter?',
        scripture: 'Matthew 5:14–16',
        completed: false
      },
      {
        id: 'challenge-2',
        number: 2,
        title: 'Where the power comes from',
        photoTarget: 'Find something that would stop working if you took away its power source. Show us where the power comes in.',
        gospelConnection: 'What keeps it going? When you feel worn out, what helps you turn to Heavenly Father?',
        completed: false
      },
      {
        id: 'challenge-3',
        number: 3,
        title: 'A detail you might miss',
        photoTarget: 'Find something that helps a person read, see, or notice a tiny detail.',
        gospelConnection: 'What came into focus? When has following Jesus helped you notice a person you might have overlooked?',
        completed: false
      }
    ]
  },
  {
    id: 'choices',
    title: 'Choices & Agency',
    icon: 'Target',
    color: 'from-purple-500 to-pink-400',
    challenges: [
      {
        id: 'challenge-4',
        number: 4,
        title: 'Two ways to spend the same money',
        photoTarget: 'Find two things someone might choose between with the same small budget. Get both in the picture if you can.',
        gospelConnection: 'Imagine buying for a neighbor. What would you want to know about them before choosing?',
        completed: false
      },
      {
        id: 'challenge-5',
        number: 5,
        title: 'A warning worth reading',
        photoTarget: 'Look for a label or symbol that could save someone from a mistake. Photograph the part that matters.',
        gospelConnection: 'What might happen if someone missed it? Which piece of gospel counsel has helped you see a choice more clearly?',
        completed: false
      },
      {
        id: 'challenge-6',
        number: 6,
        title: 'Something worth protecting',
        photoTarget: 'Find a detail that keeps something from getting lost, spilled, or damaged.',
        gospelConnection: 'What does the protection let someone do with confidence? What do you do to look after someone’s trust?',
        completed: false
      }
    ]
  },
  {
    id: 'service',
    title: "Christ's Love",
    icon: 'Heart',
    color: 'from-red-500 to-orange-400',
    challenges: [
      {
        id: 'challenge-7',
        number: 7,
        title: 'Help for a rough day',
        photoTarget: 'Choose something that could bring comfort to someone having a rough day.',
        gospelConnection: 'Imagine handing it to someone. What could you say or do alongside it to help them feel the Savior’s love?',
        completed: false
      },
      {
        id: 'challenge-8',
        number: 8,
        title: 'Made for smaller hands',
        photoTarget: 'Find a detail that helps a child do something for themselves. Get close enough to show how it works.',
        gospelConnection: 'Who was the maker thinking of? How could your group make it easier for someone younger to join in?',
        completed: false
      },
      {
        id: 'challenge-9',
        number: 9,
        title: 'A gift only you would pick',
        photoTarget: 'Think of someone you know. Find an ordinary item that would mean something to them for a reason your team can guess.',
        gospelConnection: 'Which detail made you think of them? When have you felt that Jesus Christ knows you personally?',
        completed: false
      }
    ]
  },
  {
    id: 'scriptures',
    title: 'Scriptures & Spiritual Growth',
    icon: 'BookOpen',
    color: 'from-green-500 to-emerald-400',
    challenges: [
      {
        id: 'challenge-10',
        number: 10,
        title: 'One step that matters',
        photoTarget: 'Find instructions with a step you would be tempted to skip. Show that step in your photo.',
        gospelConnection: 'What difference would that step make? Which teaching of Jesus makes more sense to you after trying it?',
        completed: false
      },
      {
        id: 'challenge-11',
        number: 11,
        title: 'Teach us in ten seconds',
        photoTarget: 'Find words or a picture on a shelf that teach you how to do something. Use your photo to give the team a tiny lesson.',
        gospelConnection: 'How did you help someone understand? Who has helped a scripture make sense to you in a similar way?',
        completed: false
      },
      {
        id: 'challenge-12',
        number: 12,
        title: 'Something that takes tending',
        photoTarget: 'Find something that rewards a little care, day after day. It can be something a person grows, makes, or learns.',
        gospelConnection: 'What care would it need tomorrow? What is one small way you could tend your faith tomorrow?',
        completed: false
      }
    ]
  },
  {
    id: 'community',
    title: 'The Plan of Salvation',
    icon: 'Globe',
    color: 'from-yellow-500 to-amber-400',
    challenges: [
      {
        id: 'challenge-13',
        number: 13,
        title: 'Care for someone at home',
        photoTarget: 'Find something someone in a family might use to care for another person.',
        gospelConnection: 'Who would use it, and for whom? What does that small act teach you about love at home?',
        completed: false
      },
      {
        id: 'challenge-14',
        number: 14,
        title: 'Help at a turning point',
        photoTarget: 'Find a sign or detail that would help a first-time visitor choose which way to go.',
        gospelConnection: 'What choice does it help with? Who has helped you find your way toward Heavenly Father?',
        completed: false
      },
      {
        id: 'challenge-15',
        number: 15,
        title: 'Worth repairing',
        photoTarget: 'Find something that could mend a tear, fill a gap, or join pieces back together.',
        gospelConnection: 'What would the repair make possible? How can Jesus Christ help us begin again when we have hurt someone?',
        completed: false
      }
    ]
  }
];

export const bonusItems: BonusItem[] = [
  {
    id: 'bonus-1',
    title: 'Same clue, different photo',
    hint: 'Pick a clue another team or teammate solved. Choose a different object for it.',
    connection: 'Put the two ideas side by side. Which detail in each one tells the same gospel story?',
    icon: '📷',
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'bonus-2',
    title: 'Guess the clue',
    hint: 'Show one of your photos without naming its clue. Let someone guess what drew your eye.',
    connection: 'What did they notice first? Tell them what you saw and see whether both readings fit.',
    icon: '🔍',
    color: 'from-gray-200 to-gray-400'
  },
  {
    id: 'bonus-3',
    title: 'An unseen kindness',
    hint: 'Find an object that someone has prepared for the next person to use.',
    connection: 'Who did the unseen work? Name one quiet kindness you could offer before you go home.',
    icon: '🤲',
    color: 'from-red-400 to-red-600'
  },
  {
    id: 'bonus-4',
    title: 'Tomorrow’s reminder',
    hint: 'Pick one item you expect to see again tomorrow.',
    connection: 'When you see it, what small thing will it remind you to do for someone?',
    icon: '🗓️',
    color: 'from-purple-400 to-purple-600'
  }
];
