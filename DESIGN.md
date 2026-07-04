# Sticker Quest — Design System (redesign-2026)

Game-like, warm, phone-first aesthetic for the Gospel Analogies Scavenger Hunt.
Think sticker book meets Duolingo energy: chunky pressable buttons, ink
outlines with hard offset shadows, candy category colors on warm paper.

## Foundations

| Token | Value | Use |
|---|---|---|
| `paper` | `#FDF6EC` | App background (with `.paper-dots` texture) |
| `cream` | `#FFFDF7` | Card surfaces |
| `ink` | `#2E2459` | Text, borders, hard shadows |
| `go` | `#58CC02` / edge `#43A302` | Primary CTA green |
| `sun` | `#FFB020` | Faith category + accent highlights |
| `grape` | `#7A6CF0` | Choices category |
| `coral` | `#FF6B6B` | Christ's Love category |
| `leaf` | `#2FBF71` | Scriptures category |
| `sky` | `#38B6FF` | Plan of Salvation category |

Each candy color has `-edge` (darker, 3D button bottom) and `-soft` (pale tint)
variants — see `tailwind.config.js` and `src/lib/theme.ts`.

**Type**: Lilita One (display — headings, numbers, buttons) + Figtree (body).
Loaded from Google Fonts in `index.html`.

## Core patterns (`src/App.css`)

- `.sticker-card` — cream card, 2px ink border, 4px hard offset shadow.
- `.btn-3d` + `.btn-go|sun|coral|sky|grape|leaf|white` — chunky pressable
  buttons: colored face, darker bottom edge, press translates down 5px.
- `.paper-dots` — warm paper with faint ink dot grid.
- `.progress-stripes` — animated candy-stripe progress fill.
- `.text-sticker-sun` — amber display text with ink stroke + hard shadow.
- Animations: `pop-in`, `rise-in`, `stamp-in`, `bob`, `pulse-ring`, confetti.

## Components

- `StickerArt` (`src/components/StickerArt.tsx`) — renders `/art/{name}.png`
  with an emoji fallback when the PNG doesn't exist yet.
- `ConfettiBurst` — one-shot confetti explosion; pass an incrementing
  `burstKey`. Fired on challenge completion and bonus unlock.

## AI-generated art

`scripts/generate-art.mjs` generates the sticker illustrations (mascot,
trophy, camera, 5 category icons, 4 bonus stamps) via the OpenAI image API
into `public/art/`. It reads `OPEN_AI_API_KEY` from `../.env` (one level
above the repo). Run:

```bash
node scripts/generate-art.mjs
```

Until the PNGs exist, `StickerArt` falls back to emoji everywhere, so the app
works fully without them.
