# New game template

Use this guide when asking Codex or Claude to add a game. Keep the existing
TypeScript game-pack structure: one content file, `defineThemePack`, and an entry
in `PACKS`. A new theme normally needs no gameplay or chooser changes.

The source of truth is [GamePack and Challenge](../../types/index.ts), together
with [defineThemePack](defineThemePack.ts). Follow those types if this guide and
the code ever differ. Working examples are [Christmas](christmasPack.ts) and
[Scripture Detectives](scriptureDetectivesPack.ts).

## 1. Content brief

Copy and fill in this brief. Plain English is enough; the implementing agent
translates it into the TypeScript template below. Record reasonable assumptions
for unspecified details, and follow any preferences already supplied by the user.

```text
GAME
Title:
Purpose / what players should discover:
Audience:
Location / permitted area:
Short description for the chooser:
Longer introduction:
Style: object hunt OR scripture-first hunt
Number of clues: 12 is a useful starting point, not a requirement
Categories / groups:
Main colour, pale background colour, and illustration or emoji:
Opening scripture reference and verified quotation:
Special instructions:
Final group discussion question:
Optional bonuses: none, or list them

REPEAT FOR EACH CLUE
Short, permanent ID:
Category:
Title:
Photo task:
Gospel connection / discussion question:
Optional supporting scripture reference:
For scripture-first clues: reference, exact excerpt, collection, source URL

REPEAT FOR EACH BONUS, IF ANY
Short, permanent ID:
Title:
Hint / task:
Connection / discussion question:
Emoji:
```

Audience and location constraints guide the writing; do not invent new runtime
fields for them. A category is required by the structure, but a game may use just
one. All teams encounter the same clues in different orders, so each clue must
make sense independently of the previous clue.

## 2. Create the pack

Create `src/data/packs/yourGamePack.ts` using this starter. Replace the placeholder
values, rename the export, and add the intended groups and clues before registering
it. This one-clue starter is documentation, not a game to publish as supplied.

```ts
import { defineThemePack, gameRules } from './defineThemePack';

export const yourGamePack = defineThemePack({
  id: 'your-game-id',
  title: 'Your Game Title',
  tagline: 'A short invitation to explore',
  setting: 'your surroundings',
  locationLabel: 'Indoors or outdoors',
  mascotArt: '',
  mascotEmoji: '🔎',
  mascotAlt: 'A magnifying glass',
  scriptureCitation: '[Verified opening scripture reference]',
  scriptureQuote: '[Verified quotation]',
  blurb: '[A short introduction explaining the theme and task.]',
  library: {
    summary: '[One sentence for the game chooser.]',
    label: '[Short theme label]',
    color: '#A99BF4',
    soft: '#ECE9FF',
  },
  discussionPrompt: '[A question that invites teams to compare their discoveries.]',
  rules: gameRules({
    title: 'Find a connection',
    description: 'Find an object for each clue and photograph it.\nExplain how your discovery connects to the theme.',
  }),
  groups: [
    {
      id: 'everyday-discoveries',
      title: 'Everyday discoveries',
      emoji: '💡',
      color: '#FFB020',
      soft: '#FFF4D9',
      challenges: [
        {
          id: 'light',
          title: 'Something that lights the way',
          photoTarget: 'Find a light or something that helps you see where to go.',
          gospelConnection: 'How does this object help you think about guidance from Jesus Christ?',
          scripture: 'John 1:4–5',
        },
      ],
    },
  ],
  bonuses: [],
});
```

Use `gameRules` to keep the shared instructions about staying together, asking
before photographing people, leaving objects in place, and using team paths.
Customize its first rule for the new game.

`defineThemePack` supplies numbering, initial completion state, six paths A–F,
count chips, category theme maps, and bonus artwork maps. Do not maintain those
derived fields by hand. The six routes cover every clue; very short games may
have some identical route orders.

### Scripture-first variation

For an object hunt, `title` and `photoTarget` are the clue. `gospelConnection` and
the optional `scripture` reference belong to the reveal/discussion content.

For a scripture-first hunt, use a challenge like this in `challenges`. Presence
of `scriptureClue` selects the behavior; there is no separate `mode` field. This
example reuses a passage from the existing Scripture Detectives pack.

```ts
{
  id: 'psalm-119-105',
  title: 'Psalm 119:105',
  photoTarget: 'Find an object that could represent this scripture. Photograph it and explain your connection. There is more than one good answer.',
  gospelConnection: 'Which words connect to your object? How did another team represent the same passage differently?',
  scriptureClue: {
    reference: 'Psalm 119:105',
    excerpt: 'Thy word is a lamp unto my feet, and a light unto my path.',
    collection: 'Bible',
    url: 'https://www.churchofjesuschrist.org/study/scriptures/ot/ps/119?lang=eng&id=p105#p105',
  },
}
```

Supported collection labels are `Bible` and `Book of Mormon`. The scripture
excerpt is visible before completing the clue and works offline; its source link
needs internet. Completing a clue reveals its discussion in both scripture and object hunts.

Verify new quotations against the linked scripture edition and preserve their
wording. Clearly distinguish a paraphrase from a quotation. Use open-ended tasks
so different teams can choose different objects; avoid giving away an intended
object in scripture-first titles or instructions. A balanced Bible / Book of
Mormon selection is appropriate when requested, not mandatory for every theme.

### Optional bonus

Keep `bonuses: []` for no bonus round, or add entries with this shape:

```ts
{
  id: 'another-angle',
  title: 'Another interpretation',
  hint: 'Choose one clue and think of a different object that could represent it.',
  connection: 'Explain what each interpretation helps you notice.',
  emoji: '🔄',
}
```

Bonuses use the existing bonus checklist. They are not ordinary photo clues in
the event comparison. Put any task that needs clue-by-clue photo comparison in
`groups[].challenges` instead.

## 3. Identity and presentation rules

- Use permanent, lowercase, hyphenated pack and local content IDs. Challenge IDs
  must be unique across all groups in that pack. The helper prefixes category,
  challenge, and bonus IDs with the pack ID; do not add that prefix yourself.
- Keep published IDs when correcting wording. Keep published clue order stable
  too: numbering and generated routes depend on it. Adding, removing, reordering,
  or replacing published clues needs an explicit compatibility plan; a new pack
  ID is usually the simplest way to preserve existing hunts and event references.
- Keep pack modules as pure content. They are imported by both the browser and
  Cloudflare Worker, so they must not depend on React, browser APIs, or Node APIs.
- Use short titles that fit phone cards and photo captions. Give concrete,
  achievable photo tasks and discussion prompts that invite explanation.
- Set `mascotArt` to a filename stem from `public/art` (for example, `my-mascot`
  refers to `public/art/my-mascot.png`), or use `''` and provide an emoji fallback.
  Groups and bonuses can also have an optional `art` filename stem. Do not assume
  a new pack gets one of the chooser's existing theme-specific illustrations.
- Use existing design colours where practical and check text contrast. Artwork
  should support the clue without being necessary to understand it.
- Do not embed team names, event tokens, progress, or photo data in a pack. Those
  are managed by the existing app. Write tasks that work without buying anything
  or disturbing the location.

## 4. Register and verify

Import the new export in [index.ts](index.ts) and append it to `PACKS`, preserving
existing entries and the default pack. The registry already calls `validatePacks`.
The chooser, setup, photo labels, and event API all use this same registry.

Update game lists/counts in documentation and any fixed-count test expectations.
For example, `tests/library.spec.ts` currently asserts four chooser cards even
though it also loops over `PACKS`. Preserve the coverage when adapting that count.

Run these commands **sequentially from `app/`** for a new registered game:

```sh
npm run lint
npm run test:e2e
npm run test:review-api
npm run test:review
npm run build
```

The app build checks TypeScript; the API checks compile the Worker and exercise
it locally. Both browser suites use `dist/`, and the offline-update tests modify
its service worker temporarily, so do not run them concurrently. The review suite
builds with a localhost API URL. The final `npm run build` restores the production
build using `.env.production`; make sure no shell override still points at localhost.

Existing tests do not prove every new clue is correct. Check the new pack itself:

- [ ] No placeholders; all intended clues, references, and optional bonuses are present.
- [ ] Chooser, event game selection, instructions, and photo captions fit on a phone.
- [ ] All six paths visit every clue once; clue order and reveal behavior are correct.
- [ ] Reload/continue preserves this game's progress and does not alter another game.
- [ ] After offline readiness, clues, excerpts, fonts, and artwork still work offline.
- [ ] Two teams in a local test event can use different paths, upload photos for the
  same clue, and appear together under that clue in leader review and the ZIP.
- [ ] Inspect the result on phone and laptop layouts; report physical-device checks
  separately from browser simulations. Extend existing checks where needed to
  exercise the new pack, without duplicating tests for unchanged mechanics.

## 5. Publish and hand off

For a new game, deploy the existing Cloudflare Worker and GitHub Pages app from
the same tested source. Deploy the Worker first so the API recognizes the new
pack before the updated chooser offers it. A frontend-only release can display
a game that the event API rejects. No new database, bucket, or migration is needed
for a content-only pack; use the existing deployment process in
[the Worker guide](../../../worker/README.md).

Verify the published game and an event using it, remove any synthetic test event,
and record the commit, deployments, and checks performed. Users with an older
cached app may need **Update now** before opening an event for the new game.
Keep draft packs out of the registry until ready; editing this guide alone needs
no app or Worker deployment.
