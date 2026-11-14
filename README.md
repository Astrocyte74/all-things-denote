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
- Private shared-review events with a team invite link and QR code
- Team uploads, clue-by-clue comparison, presentation mode, and a leader ZIP export

Open the app online and wait for **Ready for offline hunting** before leaving
coverage. Progress and photos belong to this browser on this device. Photos only
leave the device when someone explicitly shares, downloads, or sends them to an
event. Use **Save all photos** in the gallery or finish screen
to download a ZIP backup. Saving a ZIP does not remove photos from the gallery.

Refreshing resumes an active hunt on the last viewed challenge. After going
home, **Continue your hunt** skips setup. **Reset progress** keeps photos;
**Start fresh** clears progress and photos for the selected pack only.

## Shared review

1. The leader opens **Shared review** from the game chooser, names an event,
   and selects a game.
2. Teams scan the QR code or open the team invite link in the same browser they
   used for the hunt. They enter their team name and choose which photos to send.
3. The leader compares teams' photos one clue at a time on a phone or laptop.
   **Present** opens a larger discussion view. **Leader tools** contains the
   private leader link, close/reopen uploads, ZIP download, and event deletion.

The team invite does not expose other teams' photos. The separate leader link
allows viewing all photos and managing the event; only share it with leaders.
Opening that link on a laptop brings up the same event without an account.
Shared review requires internet. Events expire after seven days; download the ZIP
to keep the shared collection. Expiry or deletion does not erase local hunt photos.
The same clue is compared across teams even when they take different paths.

The frontend stays on GitHub Pages to preserve existing device storage. Its API
uses a Cloudflare Worker, D1, and private R2 storage. Set
`VITE_REVIEW_API_URL` to the deployed Worker URL when building the frontend.
Without it, the hunt works and shared review shows a connection setup notice.
See [the API deployment and operations guide](worker/README.md).

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
and interrupted/offline recovery in Chromium and WebKit. Run browser suites
sequentially: both use `dist/`, and the offline-update tests modify its service
worker temporarily. `test:review` builds with a localhost API URL; rebuild with
the production API URL before publishing.
