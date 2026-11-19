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
  discussionPrompt: 'Choose one photo to tell a piece of the Christmas story. Which detail would you point out to someone hearing it for the first time?',
  rules: gameRules({ title: 'Find Christmas meaning', description: 'Find an object for each clue and take a photo. Ordinary objects work too; you do not need special decorations.\nTalk about how each discovery points to Jesus Christ.\nLeave decorations in place and stay in the area your leader chooses.' }),
  groups: [
    {
      id: 'night-of-wonder', title: 'A night of wonder', emoji: '⭐', color: '#FFB020', soft: '#FFF4D9',
      challenges: [
        { id: 'star', title: 'A star or a guiding sign', photoTarget: 'Look for something a traveler could follow. Frame your photo so someone can tell which way to go.', gospelConnection: 'Where would your sign lead? What turns your attention toward Christ at Christmas?', scripture: 'Matthew 2:9–10' },
        { id: 'cloth', title: 'Something soft enough to wrap a baby', photoTarget: 'Find something you would choose to keep a baby comfortable.', gospelConnection: 'Mary wrapped Jesus in swaddling clothes. What detail in your photo shows the kind of care a newborn needs?', scripture: 'Luke 2:7' },
        { id: 'shepherds', title: 'A reminder of a shepherd’s work', photoTarget: 'Look for a sign that someone keeps watch or cares for another living thing.', gospelConnection: 'The shepherds were at work when they heard the news. What ordinary job does your picture help you see differently?', scripture: 'Luke 2:8–11' },
        { id: 'good-news', title: 'Something that carries good news', photoTarget: 'Pick a way to send news that would make someone stop and smile.', gospelConnection: 'Imagine the shepherds telling someone what they heard. Who would you want to tell, and what would you say?', scripture: 'Luke 2:10–11' },
      ],
    },
    {
      id: 'gifts-of-christ', title: 'Gifts of the Savior', emoji: '🎁', color: '#F48F8F', soft: '#FFE7E4',
      challenges: [
        { id: 'light', title: 'Something that shines in the dark', photoTarget: 'Find a place where a little light makes something easier to see.', gospelConnection: 'What comes into view in your photo? How could you help someone feel Christ’s light this Christmas?', scripture: 'John 1:4–5' },
        { id: 'king', title: 'A crown or a symbol of leadership', photoTarget: 'Choose something a leader could use to look after the people in their care.', gospelConnection: 'Isaiah calls the promised child the Prince of Peace. How could a leader use your object to help someone feel heard?', scripture: 'Isaiah 9:6–7' },
        { id: 'gift', title: 'A gift that represents love', photoTarget: 'Find something that would mean a lot to one particular person. It can be as simple as a scrap of paper.', gospelConnection: 'Who did you picture receiving it? How does knowing the giver change the way you receive a gift?', scripture: 'John 3:16' },
        { id: 'peace', title: 'Something that brings a sense of peace', photoTarget: 'Frame a place or object you associate with a peaceful moment.', gospelConnection: 'What gives your picture that feeling? What could you do to bring some of that peace to a family gathering?', scripture: 'Luke 2:13–14' },
      ],
    },
    {
      id: 'carry-it-home', title: 'Carry Christmas home', emoji: '❤️', color: '#2FBF71', soft: '#DFF6E9',
      challenges: [
        { id: 'welcome', title: 'Something that makes room for someone', photoTarget: 'Show how someone arriving here would know there is a place for them.', gospelConnection: 'Which detail says “you belong here”? How could you make that invitation real for someone this Christmas?', scripture: 'Luke 2:7' },
        { id: 'song', title: 'Something that could make joyful music', photoTarget: 'Find something you could use to start a Christmas song. A beat or a reminder of a tune counts.', gospelConnection: 'Which song did your find bring to mind? What part of it helps you remember the Savior?', scripture: 'Luke 2:13–14' },
        { id: 'love', title: 'A moment worth keeping', photoTarget: 'Find something you keep because you want to remember a moment. If you’re away from home, choose something here that brings it to mind.', gospelConnection: 'Mary pondered what had happened. Which moment from Christmas would you want to turn over in your mind again?', scripture: 'Luke 2:19' },
        { id: 'serve', title: 'Something you could use to help', photoTarget: 'Choose an object you could put to work for somebody today.', gospelConnection: 'Show how you would use it. King Benjamin connects service to others with service to God. Who could you help this week?', scripture: 'Mosiah 2:17' },
      ],
    },
  ],
  bonuses: [
    { id: 'no-price-tag', title: 'A gift with no price tag', hint: 'Pick a photo that could stand for a gift of your time.', connection: 'Who would enjoy that gift? Decide what you could offer and when.', emoji: '🎁' },
    { id: 'include-someone', title: 'Make room', hint: 'Look at your welcome photo through the eyes of a guest.', connection: 'What would help a newcomer join in? Try out the first words of your invitation with a teammate.', emoji: '🏠' },
    { id: 'remember', title: 'A Christmas postcard', hint: 'Choose a photo you would put on the front of a Christmas card.', connection: 'Give it a one-sentence message about the Savior. Read your card aloud to the group.', emoji: '⭐' },
  ],
});
