# Design polish (branch: design-polish)

Changes on top of the Sticker Quest system. The identity is unchanged; this pass is about hierarchy and the play screen.

## Rules of the system (new)
- **Hard shadow means "press me".** `.sticker-card` (with shadow) is for things that respond to a tap: path cards, accordion headers, game picker. `.flat-card` (outline only) is for information: rules, the play-screen card, Next up.
- **One hero action per screen.** Play screen: the big green camera. "Mark as done" is a quiet white fallback. Checklist: the single green "Resume hunt" in the Next up card (the sticky header shows progress instead).
- **Accent headline treatment (`text-sticker-sun`) only on the hero title** (and the bonus-unlock celebration). Section headings are plain ink.
- **No tracked all-caps labels.** Sentence case, normal tracking.
- **Text on candy colors uses `readableTextOn(hex)`** (src/lib/theme.ts): ink or white, whichever contrasts better. White on amber/sky/leaf is about 2:1.
- **Focus ring is ink** (flips to cream on the dark modal scrim). The old amber ring was under 2:1.
- Disabled `.btn-3d` is flat beige with dark text.

## Screens
- Landing: picker has no label; share moved to the bottom; floating stickers use the active pack's category art (wide screens only); mascot no longer sits on a paper block.
- Pick your path: each card shows the route as 15 dots colored by theme. Copy now says "path" everywhere.
- How to play: rules are flat; the start button is a sticky bottom bar.
- Play screen: 15 progress pips (category-colored), category art, the "what to photograph" line always visible (the gospel connection stays hidden until revealed), "Nailed it!" stamp with Undo, first-run hint that disappears after the first completion.
- Checklist: single column; rows are horizontal; title opens focus mode; the repeated filler line is replaced by the photo target.

## Assets
- `public/art/c-*.png` (Creation Quest): the white matte is now transparent, so the `mix-blend-multiply` workaround in StickerArt is gone.

## Data copy
- Path D description now matches its order ("Take one challenge from each theme, then go around again").
- Third stat chip on both packs is "Bring a phone".
- Rule copy: "Each photo is labeled with its challenge"; "Work together: one ..., one shoots".

## Green controls
- Green (`btn-go`) buttons and green selection/completion badges use dark ink text and icons for stronger contrast. Disabled buttons keep their separate muted ink treatment.
