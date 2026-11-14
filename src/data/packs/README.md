# Adding a game

Questions are bundled TypeScript content, available offline after the app reports
“Ready for offline hunting.” There is no question API or database. The registry in
`index.ts` drives the chooser, setup, gameplay, theme, and photo labels.

1. Copy `christmasPack.ts` for an object hunt or `scriptureDetectivesPack.ts` for
   scripture-first clues. Give the pack a permanent, unique `id`.
2. Write the title, summary, location, rules, colors, category groups, challenges,
   and optional bonuses. Use `bonuses: []` if there is no bonus round.
3. Export the pack and add it to `PACKS` in `index.ts`. No chooser or gameplay
   changes are needed.
4. Run `npm run lint` and `npm run test:e2e`.

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
They are not uploaded to a server or synchronized between phones.
