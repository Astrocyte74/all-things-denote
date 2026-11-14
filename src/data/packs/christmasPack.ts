import { defineThemePack, gameRules } from './defineThemePack';

export const christmasPack = defineThemePack({
  id: 'christmas', title: 'Christmas',
  tagline: 'Find the meaning behind the merry',
  setting: 'the places you visit', locationLabel: 'At home or around town',
  mascotArt: '', mascotEmoji: '🎄', mascotAlt: 'A Christmas tree topped with a star',
  scriptureCitation: 'Luke 2:10',
  scriptureQuote: '“I bring you good tidings of great joy, which shall be to all people.”',
  blurb: 'Look beyond the wrapping paper. Find 12 everyday reminders of the birth, love, and light of Jesus Christ—Christmas decorations are welcome, but not required.',
  library: { summary: 'Discover reminders of Christ in the Christmas season.', label: 'The joy of Christmas', color: '#F48F8F', soft: '#FFF0E8' },
  discussionPrompt: 'Choose a photo that helped you see Christmas differently. How does it remind you of Jesus Christ, and how could you share that meaning with someone this week?',
  rules: gameRules({ title: 'Find Christmas meaning', description: 'Find an object for each clue and take a photo. Ordinary objects work too; you do not need special decorations.\nTalk about how each discovery points to Jesus Christ.\nLeave decorations in place and stay in the area your leader chooses.' }),
  groups: [
    {
      id: 'night-of-wonder', title: 'A night of wonder', emoji: '⭐', color: '#FFB020', soft: '#FFF4D9',
      challenges: [
        { id: 'star', title: 'A star or a guiding sign', photoTarget: 'Find a star shape or something that points the way.', gospelConnection: 'The star helped guide the wise men. What helps guide your attention toward Christ?', scripture: 'Matthew 2:9–10' },
        { id: 'cloth', title: 'Something soft enough to wrap a baby', photoTarget: 'Find a blanket, towel, or piece of soft cloth.', gospelConnection: 'Mary wrapped Jesus in swaddling clothes. What does His birth teach you about tenderness and caring for others?', scripture: 'Luke 2:7' },
        { id: 'shepherds', title: 'A reminder of a shepherd’s work', photoTarget: 'Find something connected to caring for animals, keeping watch, or protecting a flock.', gospelConnection: 'Shepherds heard the good news while watching their flock. How can we notice God while doing ordinary work?', scripture: 'Luke 2:8–11' },
        { id: 'good-news', title: 'Something that carries good news', photoTarget: 'Find a card, message board, invitation, or other way to share a message.', gospelConnection: 'The angel announced joy for all people. What joyful message about Jesus could you share with someone?', scripture: 'Luke 2:10–11' },
      ],
    },
    {
      id: 'gifts-of-christ', title: 'Gifts of the Savior', emoji: '🎁', color: '#F48F8F', soft: '#FFE7E4',
      challenges: [
        { id: 'light', title: 'Something that shines in the dark', photoTarget: 'Find a light, a reflective object, or a bright decoration.', gospelConnection: 'John describes life and light in Christ. How has He brought light to a difficult situation?', scripture: 'John 1:4–5' },
        { id: 'king', title: 'A crown or a symbol of leadership', photoTarget: 'Find a crown shape or an object that represents someone who leads.', gospelConnection: 'Isaiah speaks of the promised child and His government. How is the Savior’s way of leading different from seeking power?', scripture: 'Isaiah 9:6–7' },
        { id: 'gift', title: 'A gift that represents love', photoTarget: 'Find a wrapped present, a gift bag, or a handmade gift. You do not need to buy anything.', gospelConnection: 'God gave His Son because He loves the world. What makes a gift meaningful beyond its price?', scripture: 'John 3:16' },
        { id: 'peace', title: 'Something that brings a sense of peace', photoTarget: 'Choose an object or a quiet place that helps your team think of peace.', gospelConnection: 'The heavenly host praised God and spoke of peace. How can you help bring Christ’s peace into your home?', scripture: 'Luke 2:13–14' },
      ],
    },
    {
      id: 'carry-it-home', title: 'Carry Christmas home', emoji: '❤️', color: '#2FBF71', soft: '#DFF6E9',
      challenges: [
        { id: 'welcome', title: 'Something that makes room for someone', photoTarget: 'Find an empty chair, a welcome sign, or something that helps a visitor feel included.', gospelConnection: 'Luke describes the humble place where Jesus was laid. How can you make room for Christ and for people who feel left out?', scripture: 'Luke 2:7' },
        { id: 'song', title: 'Something that could make joyful music', photoTarget: 'Find a bell, an instrument, sheet music, or an object connected to a song.', gospelConnection: 'The heavenly host praised God. What song helps you remember the Savior, and why?', scripture: 'Luke 2:13–14' },
        { id: 'love', title: 'An everyday reminder of love', photoTarget: 'Choose an object that reminds your team of someone showing care.', gospelConnection: 'John connects God’s gift of His Son with our love for one another. How can that love continue after Christmas?', scripture: '1 John 4:9–11' },
        { id: 'serve', title: 'Something you could use to help', photoTarget: 'Find an ordinary object that could help you serve someone.', gospelConnection: 'King Benjamin teaches that serving others is serving God. What could you do with this object to make someone’s day easier?', scripture: 'Mosiah 2:17' },
      ],
    },
  ],
  bonuses: [
    { id: 'no-price-tag', title: 'A gift with no price tag', hint: 'Think of a gift your team could give without spending money.', connection: 'Time, attention, forgiveness, and service can show Christlike love. Choose one to give this week.', emoji: '🎁' },
    { id: 'include-someone', title: 'Make room', hint: 'Name a way to include someone who might feel forgotten.', connection: 'Turn your welcome photo into a real invitation, kind conversation, or shared activity.', emoji: '🏠' },
    { id: 'remember', title: 'Keep a reminder', hint: 'Choose one photo to remind you of Christ after Christmas.', connection: 'Explain what you want to remember and one way to put it into practice.', emoji: '⭐' },
  ],
});
