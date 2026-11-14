# Gospel Analogies Scavenger Hunt

Finding Gospel Truths in Everyday Things

> "All things denote there is a God; yea, even the earth, and all things that are upon the face of the earth..."
> — Alma 30:44

## About

A faith-based scavenger hunt app that helps youth discover spiritual significance in everyday objects and situations. Instead of hunting for random items in a store, participants find and photograph objects that can serve as analogies for gospel principles.

## Features

- Mobile-first design
- Two hunt packs with saved paths, progress, and current challenges
- Labeled photos stored on this device, with save confirmation and retry
- Gospel analogy prompts
- A finish screen with team photos, discussion, and a ZIP photo export
- Offline app, artwork, and fonts after initial setup
- Optional updates that preserve saved hunts and photos

Open the app online and wait for **Ready for offline hunting** before leaving
coverage. Progress and photos belong to this browser on this device; they do not
sync to other devices. Use **Save all photos** in the gallery or finish screen
to download a ZIP backup. Saving a ZIP does not remove photos from the gallery.

Refreshing resumes an active hunt on the last viewed challenge. After going
home, **Continue your hunt** skips setup. **Reset progress** keeps photos;
**Start fresh** clears progress and photos for the selected pack only.

## Getting Started

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
```

Browser checks cover mobile Chromium and WebKit: transaction-abort recovery,
refresh/continue, complete and photo-free hunts, ZIP contents and pack isolation,
offline use of an unvisited pack, resets, and deferred updates. They use isolated
browser storage and a local production preview. Real-device camera capture and
the OS share/download interface still need an on-device check before an event.
