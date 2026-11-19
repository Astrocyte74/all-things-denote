import { defineThemePack, gameRules } from './defineThemePack';

export const scriptureFreezeFramesPack = defineThemePack({
  id: 'scripture-freeze-frames',
  title: 'Scripture Freeze Frames',
  tagline: 'Six scenes for the room to guess',
  setting: 'your meeting space',
  locationLabel: 'At church or at home',
  mascotArt: '',
  mascotEmoji: '🎬',
  mascotAlt: 'A movie clapperboard',
  scriptureCitation: '1 Nephi 19:23',
  scriptureQuote: '“I did liken all scriptures unto us, that it might be for our profit and learning.”',
  blurb: 'Pick a scripture story for each prompt and tell it in one still photo. Later, let the room guess which story your team staged and what gave it away.',
  library: { summary: 'Stage six scripture moments for the group to guess.', label: 'Photo charades', color: '#65C9B6', soft: '#E1F6F1' },
  cluePrompt: 'Look through the camera together. Which detail gives the room a fair guess?',
  discussionPrompt: 'Leaders, open Present in the event. For each photo, ask “Which story do you see? What gave you that idea?” Let the team name its story after the guesses and explain one choice it made. On one phone, take turns showing your photos from the gallery.',
  rules: gameRules({
    title: 'Stage a freeze frame',
    description: 'Privately pick a Bible or Book of Mormon story that fits the scene. Each prompt can fit many stories.\nPose, direct, take the photo, or arrange everyday objects as the cast. Include only people who want to be in the picture.\nGive the audience one visual clue. Keep names, written answers, and open scripture pages out of the shot until everyone has guessed.',
  }),
  groups: [
    {
      id: 'between-people', title: 'Between people', emoji: '🎭', color: '#65C9B6', soft: '#E1F6F1',
      challenges: [
        {
          id: 'noticed', title: 'The moment someone noticed',
          photoTarget: 'Choose a story where someone sees a need. Freeze just before they act. Let the direction of a gaze or the position of a prop show what caught their attention.',
          gospelConnection: 'What did you notice first in the photo? After the guesses, ask the team what the person saw that others might have missed.',
        },
        {
          id: 'helper', title: 'An unexpected helper',
          photoTarget: 'Stage the instant help arrives from a surprising direction. Put one clue in the frame about who the helper is.',
          gospelConnection: 'Who seems to be helping whom? Once the team names its story, what makes that person’s kindness surprising?',
        },
        {
          id: 'message', title: 'A message arrives',
          photoTarget: 'Pick a moment when news reaches someone. Show the instant they hear it. What could their hands or the space around them tell us?',
          gospelConnection: 'What news do you think just arrived? After the reveal, ask the team how the message changed what someone did next.',
        },
      ],
    },
    {
      id: 'turning-points', title: 'Turning points', emoji: '🎬', color: '#A99BF4', soft: '#ECE9FF',
      challenges: [
        {
          id: 'choice', title: 'A hard choice',
          photoTarget: 'Choose someone in scripture who faced two real options. Arrange your scene so the audience can point to both possibilities in one photo.',
          gospelConnection: 'Which two choices can you see? When the team reveals the story, ask what made the choice hard and what mattered most to the person.',
        },
        {
          id: 'way-through', title: 'A way through',
          photoTarget: 'Stage a moment when a way forward opens. Fit the obstacle and the first sign of a way through into the same shot.',
          gospelConnection: 'Where is the obstacle, and where would you look for hope? After the reveal, ask who took the first step.',
        },
        {
          id: 'second-chance', title: 'A second chance',
          photoTarget: 'Choose a story where someone gets to try again. Freeze the moment the new start becomes possible. Leave one trace of what happened before.',
          gospelConnection: 'Which detail hints at an earlier mistake or disappointment? Let the team tell what happened next. Where do you see mercy in that story?',
        },
      ],
    },
  ],
  bonuses: [],
});
