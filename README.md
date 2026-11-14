# Gospel Analogies Scavenger Hunt

Finding Gospel Truths in Everyday Things

> "All things denote there is a God; yea, even the earth, and all things that are upon the face of the earth..."
> — Alma 30:44

## About

A faith-based scavenger hunt app that helps youth discover spiritual significance in everyday objects and situations. Instead of hunting for random items in a store, participants find and photograph objects that can serve as analogies for gospel principles.

## Features

- Mobile-first design
- Four games: Gospel Analogies, Creation, Christmas, and Scripture Detectives
- Saved paths, optional team names, progress, and current challenges for each game
- Labeled photos stored on this device, with save confirmation and retry
- Gospel analogy prompts
- A finish screen with team photos, discussion, and a ZIP photo export
- Offline app, artwork, and fonts after initial setup
- Optional updates that preserve saved hunts and photos
- Event-first start screen with private invites and QR codes
- Joining sets up the game, team name and path once; each event team has separate progress
- Three-step event setup with game previews, event-name ideas, and configurable team names
- Team-name choices or random assignment, with paths balanced automatically
- Device-only games remain available for solo or offline play
- Team uploads, clue-by-clue comparison, presentation mode, and a leader ZIP export

Open the app online and wait for **Ready for offline hunting** before leaving
coverage. Progress and photos belong to this browser on this device. Photos only
leave the device when someone explicitly shares, downloads, or sends them to an
event. Use **Save all photos** in the gallery or finish screen
to download a ZIP backup. Saving a ZIP does not remove photos from the gallery.

Refreshing resumes an active hunt on the last viewed challenge. After going
home, **Continue your hunt** skips setup. **Reset progress** keeps photos;
**Start fresh** clears progress and photos for the selected local game or event
team only. An event hunt keeps its event, team name and path after a reset.

## Group events

1. The leader taps **Start an event**: choose a game and preview a clue, pick or
   edit an event name, then keep **Allow all** team names or customize the options.
   **More ideas** refreshes name suggestions without changing the chosen name.
   **Create event & show QR** creates the event after those three steps.
2. Teams tap **Join an event → Scan QR code**, allow camera access, and point
   at the leader’s code. They can also paste an invite link or use their phone’s
   Camera app. Teams tap a suggested name, type their own if allowed, or receive
   a random name according to the leader's settings. Taken names are unavailable;
   unused standard names appear when a leader's selected list runs out.
3. **Join & start hunt** opens the instructions with the event's game and the
   assigned team name/path. Paths are balanced automatically across A–F. Reopening
   **Open team hunt** resumes saved progress. There is no path-picker step for joining.
4. **Back to event** opens that team's upload screen directly. Teams choose
   photos and tap **Send**; taking a photo never uploads it automatically.
5. The leader opens the separate private **leader link** on a phone or laptop
   to compare teams' photos one clue at a time. **Present** opens the larger
   discussion view; **Leader tools** also has close/reopen, ZIP and deletion.

Join and Start each show only their own setup, with a small link to switch.
The in-app scanner reads QR codes locally, accepts only this app’s team invites,
and stops the camera on close or when the page is hidden. It saves or uploads
no camera frames. Denied or unavailable cameras leave the paste-link option available.

**Your events** reopens cloud events saved on this device. **Saved team hunts
on this device** resumes local event hunts offline, even after the cloud event
ends. Event hunts keep separate progress and photos for each event/team and do
not reset a previous device-only hunt. **Play on this device** opens the original
game chooser for solo/offline play. Older unassigned device photos can still be
selected for upload; photos captured in another event team are excluded.

The team invite does not expose other teams' photos. The separate leader link
allows viewing all photos and managing the event; only share it with leaders.
Opening that link on a laptop brings up the same event without an account.
Joining events, sending photos and leader review require internet. Events expire after seven days; download the ZIP
to keep the shared collection. Expiry or deletion does not erase local hunt photos.
The same clue is compared across teams even when they take different paths.

Team-name setup defaults to **Allow all**: teams choose from 60 standard names or
type their own. **Customize** offers a selected pool (including the leader's own
additions, up to 50), random assignment, and a separate custom-name switch. Each
name is reserved once per event; retries recover the same team, name, and path.
These settings belong to the event and do not change device-only game setup.

The frontend stays on GitHub Pages to preserve existing device storage. Its API
uses a Cloudflare Worker, D1, and private R2 storage. Set
`VITE_REVIEW_API_URL` to the deployed Worker URL when building the frontend.
Without it, the hunt works and Group events shows a connection setup notice.
See [the API deployment and operations guide](worker/README.md).

## Adding games

Use the [standard new-game template](src/data/packs/NEW_GAME_TEMPLATE.md) when
working with Codex or Claude. It includes a plain-English content brief, copyable
TypeScript pack, object-hunt and scripture-first examples, and a checklist for
testing and publishing to both the app and event API. Keep the existing game-pack
structure; no JSON conversion or new content system is needed.

## Getting Started

Use Node.js 24 (the deployment workflow uses the same version).

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build generates `dist/sw.js` from every emitted app asset. Deploy the entire
`dist/` directory together. The offline worker runs in production previews and
deployments, not the development server. A waiting update is applied only when
the user chooses **Update now** or all old app tabs have closed.

## Checks

```bash
npm run lint
npx playwright install chromium webkit
npm run test:e2e
npm run test:review-api
npm run test:review
```

Browser checks cover mobile Chromium and WebKit: transaction-abort recovery,
refresh/continue, complete and photo-free hunts, ZIP contents and pack isolation,
offline use of an unvisited pack, resets, and deferred updates. They use isolated
browser storage and a local production preview. Real-device camera capture and
the OS share/download interface still need an on-device check before an event.

The review checks run against an isolated local Worker, D1, and R2, without
Cloudflare credentials. They verify access boundaries, upload limits, retries,
expiry/deletion, QR contents, multiple teams, comparison, presentation, ZIP bytes,
interrupted/offline recovery, join-to-hunt setup, and event/local hunt isolation
in Chromium and WebKit. Run browser suites
sequentially: both use `dist/`, and the offline-update tests modify its service
worker temporarily. `test:review` builds with a localhost API URL; rebuild with
the production API URL before publishing.
