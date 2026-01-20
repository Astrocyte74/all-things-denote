import type { Category, Rule, BonusItem } from '@/types';

export const rules: Rule[] = [
  {
    id: 'rule-1',
    title: 'Photos Only',
    description: 'Take photos of products only. Do not include other shoppers or people in your photos.',
    icon: '📸'
  },
  {
    id: 'rule-2',
    title: 'Stay Together',
    description: 'Stay with your group at all times. Safety in numbers!',
    icon: '👥'
  },
  {
    id: 'rule-3',
    title: 'Be Respectful',
    description: 'Be respectful to store employees and other shoppers.',
    icon: '❤️'
  },
  {
    id: 'rule-4',
    title: 'Dual Phone Mode',
    description: 'Optional: Use one phone in display mode and include it in photos taken with a second phone. This helps track which challenge you\'re completing!',
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
        title: 'Something that gives light',
        photoTarget: 'Find a lamp, flashlight, or candle.',
        gospelConnection: 'How can we be a light to others?',
        scripture: 'Matthew 5:14–16',
        completed: false
      },
      {
        id: 'challenge-2',
        number: 2,
        title: 'Something that needs power to work',
        photoTarget: 'Phone charger, batteries, extension cord.',
        gospelConnection: 'What gives us spiritual power?',
        scripture: '(Prayer, scriptures, the Holy Ghost)',
        completed: false
      },
      {
        id: 'challenge-3',
        number: 3,
        title: 'Something that helps you see clearly',
        photoTarget: 'Glasses, contacts, mirrors.',
        gospelConnection: 'How does the gospel help us see truth more clearly?',
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
        title: 'Two similar items with very different prices',
        photoTarget: 'Generic vs brand-name item.',
        gospelConnection: 'How does this relate to wise choices and priorities?',
        completed: false
      },
      {
        id: 'challenge-5',
        number: 5,
        title: 'A warning label',
        photoTarget: 'Medicine, chemicals, tools.',
        gospelConnection: 'Why do commandments sometimes come with warnings?',
        completed: false
      },
      {
        id: 'challenge-6',
        number: 6,
        title: 'Something locked up',
        photoTarget: 'Electronics case, medicine cabinet.',
        gospelConnection: 'Why are some things protected or restricted?',
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
        title: 'Something meant to help or heal',
        photoTarget: 'Band-aids, medicine, vitamins.',
        gospelConnection: 'How can we help heal others emotionally or spiritually?',
        completed: false
      },
      {
        id: 'challenge-8',
        number: 8,
        title: 'Something made for babies or children',
        photoTarget: 'Diapers, toys, bottles.',
        gospelConnection: 'How does this remind us of Christ\'s love for the vulnerable?',
        completed: false
      },
      {
        id: 'challenge-9',
        number: 9,
        title: 'Something you could give as a gift',
        photoTarget: 'Wrapped item or gift bag.',
        gospelConnection: 'What is the greatest gift God has given us?',
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
        title: 'Something that requires instructions',
        photoTarget: 'Lego set, appliance, game.',
        gospelConnection: 'Why do we need guidance in life?',
        completed: false
      },
      {
        id: 'challenge-11',
        number: 11,
        title: 'A book that teaches something useful',
        photoTarget: 'Cookbook, self-help, textbook.',
        gospelConnection: 'How are scriptures similar but even more powerful?',
        completed: false
      },
      {
        id: 'challenge-12',
        number: 12,
        title: 'Something that grows over time',
        photoTarget: 'Plants, seeds, gardening tools.',
        gospelConnection: 'How does testimony grow?',
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
        title: 'Something that comes in a family pack',
        photoTarget: 'Bulk food or household item.',
        gospelConnection: 'Why are families central to God\'s plan?',
        completed: false
      },
      {
        id: 'challenge-14',
        number: 14,
        title: 'Something that helps you find your way',
        photoTarget: 'GPS, maps, shopping cart, address book.',
        gospelConnection: 'How is life a journey back to Heavenly Father?',
        completed: false
      },
      {
        id: 'challenge-15',
        number: 15,
        title: 'Something meant to fix or repair',
        photoTarget: 'Glue, tape, tools, repair kits.',
        gospelConnection: 'How does the Atonement fix and heal us?',
        completed: false
      }
    ]
  }
];

export const bonusItems: BonusItem[] = [
  {
    id: 'bonus-1',
    title: 'Something Blue',
    hint: 'Find something blue in the store',
    connection: 'Baptism - Remember the covenants we make',
    icon: '💧',
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'bonus-2',
    title: 'Something White',
    hint: 'Find something pure white',
    connection: 'Purity & Temple Covenants - Clean and spotless',
    icon: '🕊️',
    color: 'from-gray-200 to-gray-400'
  },
  {
    id: 'bonus-3',
    title: 'Something with a Heart',
    hint: 'Find an item with a heart symbol',
    connection: 'Charity - The pure love of Christ',
    icon: '❤️',
    color: 'from-red-400 to-red-600'
  },
  {
    id: 'bonus-4',
    title: 'Something Circular',
    hint: 'Find something round or circular',
    connection: 'Eternal Families - No beginning, no end',
    icon: '∞',
    color: 'from-purple-400 to-purple-600'
  }
];
