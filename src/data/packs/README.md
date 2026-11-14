# Adding a game

Use [the standard new-game template](NEW_GAME_TEMPLATE.md) for the content brief,
copyable TypeScript starter, scripture-first variation, validation checklist,
and app/API publishing steps. It is the shared authoring guide for Codex and Claude.

Questions are bundled TypeScript content, available offline after the app reports
“Ready for offline hunting.” There is no question API or database. The registry in
`index.ts` drives the chooser, setup, gameplay, theme, and photo labels.

1. Copy `christmasPack.ts` for an object hunt or `scriptureDetectivesPack.ts` for
   scripture-first clues. Give the pack a permanent, unique `id`.
2. Write the title, summary, location, rules, colors, category groups, challenges,
   and optional bonuses. Use `bonuses: []` if there is no bonus round.
3. Export the pack and add it to `PACKS` in `index.ts`. No chooser or gameplay
   changes are needed.
4. Follow the template's checks and publish both the app and event API, which
   import the same registry.

`defineThemePack` prefixes challenge, category, and bonus IDs with the pack ID,
numbers challenges, generates six complete team paths for any challenge count,
and supplies theme maps and count chips. The registry validates unique IDs,
complete routes, and scripture source links. Keep IDs stable when editing wording
so existing photos and progress continue to match their challenges.

Each challenge has a `title`, `photoTarget`, and `gospelConnection`. A normal hunt
shows the photo target immediately and reveals connections when the hunt is
complete (or when a leader uses the existing reveal control).

A `scriptureClue` adds `reference`, `excerpt`, `collection`, and a source `url`.
The excerpt appears before the photo, and the discussion prompt appears after
that challenge is completed. Use an open-ended target; let players choose the
object and explain their interpretation. The current set uses six Bible and six
Book of Mormon passages, verified against the linked Church scripture editions.
Excerpts are bundled for offline use; full-passage links need internet.

`library` supplies each chooser card's label, summary, color, and soft background.
Set `mascotArt` to a filename stem from `public/art`, or leave it empty and provide
`mascotEmoji`. The new seasonal cards have inline illustrations and all cards
support emoji fallbacks. `discussionPrompt` customizes the finish screen.

Progress, selected paths, and last-viewed clues are saved per pack in localStorage.
Photos are saved per pack in this device's IndexedDB. Switching games preserves
them; resetting or deleting one game's photos does not affect another game.
They are not uploaded automatically. Teams can explicitly send selected photos
to a private group event for leader review; local originals remain on the device.
Event team hunts have separate progress and photos from device-only games and
other event teams. See [the app guide](../../../README.md#group-events).

Team names are optional, limited to 40 characters, and saved per game. Each new
photo stores the name as it was when captured, together with its path and clue
identity, and includes that name in its exported JPEG. Editing a team name does
not rewrite older photos. Reset progress keeps photos, team name, and path;
Start fresh confirms deletion of only the selected game's photos and settings.
