# Shared review API

One Worker serves a private event API; D1 stores event/team/clue metadata and R2
stores labeled JPEGs. The existing GitHub Pages app remains the frontend, so its
IndexedDB photos and saved hunts stay available. No public R2 endpoint, custom
domain, object access keys, or user accounts are required.

## Production

- Frontend: https://astrocyte74.github.io/all-things-denote/
- API: https://scavenger-review.markcdarby.workers.dev
- Account: Markcdarby@gmail.com's Account (`d856762d50b0ac18bc30e9f71325bd30`).
- D1: `scavenger-review`, region WNAM; binding ID is in `wrangler.jsonc`.
- R2: `scavenger-review-photos`, Standard storage, public access disabled.
- Retention: hourly cron `17 * * * *`, with seven-day event expiry.
- Worker version: `9f8725c0-d138-40af-a308-c7f96fdf4c92` (2026-11-19 UTC),
  with migration `0005_team_photo_status.sql`.
- The public API URL is committed in `.env.production`; local review tests
  override it with their isolated Miniflare endpoint.

The owner approved creation and deployment on the existing plan. Workers Free
was verified on 2026-11-14. No plan upgrade, subscription, or DNS change was made.
Small event use is expected to fit the free allowances, but R2 usage above its
account-wide allowance is billable. Keep this separate from a guaranteed cost cap.

Hunt navigation follow-up checks (2026-11-14): lint, production build and Worker
validation passed. Across the full suites and targeted reruns, all 46 hunt/navigation
and 49 applicable event checks passed (one unsupported WebKit native-camera skip).
Checks cover skipped clues on forward/reversed/interleaved paths, swipe and Next
recovery, distinct clue IDs and path steps, unobscured capture controls, error-only
Menu attention, offline waiting, Retry, and persistent failed-setting warnings.
The WebKit event-editor test now waits for and scopes controls to its dialog;
three repeated runs passed. This release changes no Worker API or schema.

Hunt navigation release checks (2026-11-14): lint, production build and Worker
validation passed, along with 40 hunt/navigation checks and 47 applicable event
browser checks (one unsupported WebKit native-camera skip). The single Menu,
explicit checklist return to a completed current clue, gallery/sharing dismissal,
keyboard focus, Home confirmation and visible Continue, reset cancellation, saved-clue resume and
existing photo/upload flows were checked in Chromium and WebKit phone simulations.
This is a frontend release; the deployed API and schema are unchanged.

Hunt layout and photo-status release checks (2026-11-14): lint, production build,
Worker dry-run, all 33 API cases, 47 applicable shared-review browser checks,
and 38 hunt regressions passed (one unsupported WebKit native-camera skip).
Checks cover small phone clue space, a single navigation dock, the accessible
sharing sheet and focus restoration, private/validated/ordered status reports,
waiting/error counts that drain after retry, offline opt-out/reload recovery,
and unchanged event-edit identity and progress fields. Phone and desktop layouts
were inspected in Chromium and WebKit device simulations.

Automatic photo sharing release checks (2026-11-14): lint, production build and
Worker dry-run passed, along with 30 API cases, all 43 applicable shared-review
browser checks (one WebKit native fake-camera skip), and 38 hunt regressions.
New coverage includes leader defaults and team overrides, automatic captures,
retakes that preserve originals on failed saves, offline deletion/reload recovery,
queue cancellation, older-photo exclusion, lost-response retry after cloud
removal, closed uploads, removal-marker cleanup, and failed join-time opt-out
persistence. The lost-response fixture uses the real XHR response callback since
WebKit's service-worker requests bypass Playwright routing.

Leader dashboard release checks (2026-11-14): lint and production builds passed,
along with all 25 API cases, 35 shared-review browser checks and 38 existing hunt
regressions. Coverage includes leader-only edits and revision conflicts, existing
team preservation, changed policies on open invites, private progress reports,
offline/reload retries, resets, and separate completion/photo counts. Existing
wizard, balanced path assignment, upload/review/deletion and isolation checks also
passed. Chromium and WebKit phone layouts were checked; one native fake-camera
case is skipped on WebKit because that browser simulation does not support it.

Initial deployment verification (2026-11-14): 11 API tests passed, including a full expiry
batch under the D1 Free request budget. The feature also passed six local browser
integration tests across Chromium/WebKit and 38 existing hunt regressions. On the
live GitHub Pages app and Cloudflare API, separate Chromium Android and WebKit
iPhone sessions captured and uploaded synthetic photos to one desktop leader.
Verified invite QR payload, clue comparison, presentation, byte-identical labeled
JPEGs in the ZIP, team isolation, a separate iPhone leader, close/reopen, and event
deletion with access revocation. Test events were deleted. These were browser
device simulations, not a physical-phone cellular test.

## Local checks

From `app/`:

```sh
npm ci
npm run test:review-api
npm run test:review
```

These commands bundle the Worker and use isolated Miniflare D1/R2 instances.
The browser suite builds the frontend with `http://127.0.0.1:8788` as its API.
It does not send photos to Cloudflare. Never publish that test build.

For manual local use, build the Worker with `npm run build:review`, run
`node scripts/review-test-server.mjs`, and in another terminal run
`VITE_REVIEW_API_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 4176`.
The test server's data lasts only for that process.

## First production deployment

Creating the Worker, D1 database, private bucket and retention job needs the
owner's approval before running these steps. Use the existing Cloudflare account
and plan; do not enable public bucket access or change DNS.

1. Run `npx wrangler whoami` and verify the intended account. Renew an expired
   login through the normal browser sign-in without expanding permissions.
2. From `app/worker/`, create the database and private bucket:

   ```sh
   npx wrangler d1 create scavenger-review
   npx wrangler r2 bucket create scavenger-review-photos
   ```

3. Replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID.
   Record the verified `account_id` there if more than one account is available.
4. Apply the migration and deploy (run Wrangler from this directory so it resolves
   the Worker-specific TypeScript config):

   ```sh
   npx wrangler d1 migrations apply scavenger-review --remote
   npx wrangler deploy
   ```

5. Check `/health` on the returned HTTPS Worker URL. Set the frontend's public
   `VITE_REVIEW_API_URL` build variable to that URL, then build and deploy the
   frontend through its existing GitHub Pages workflow. This URL is not a secret.
   Production CORS allows only `https://astrocyte74.github.io`; update it if the
   frontend's actual origin changes.
6. Verify a fresh test event from two isolated browsers: join via the QR/link,
   upload synthetic photos, compare the same clue, download a ZIP, close/reopen,
   then delete the test event. Confirm R2 public access remains disabled and the
   hourly trigger is registered.

## Access and data lifecycle

- Unpredictable 256-bit capability tokens appear in URL fragments. The frontend
  sends them in Authorization headers, never image URLs. Share links grant access
  to their holder; there is no email/password recovery.
- The leader can see all teams/photos, close/reopen uploads, download and delete.
  The invite only reveals event details and registers a team. Each team's token
  can read/upload/delete only its own photos. A leader link can be opened on
  another phone or laptop. Team and leader credentials are hashed in D1; the
  invite token is retained so the leader can recover the QR on another device.
- Teams can delete one cloud copy or all their uploads immediately, even after
  uploads close or from another device using their private team link. The cloud
  photo manager uses server metadata and does not depend on local originals.
  A confirmation explains the scope; partial failures remain retryable and never
  select deleted originals for automatic re-upload. Other teams' uploads are
  protected by the existing API authorization checks.
- Photo bytes are the existing labeled JPEG from IndexedDB, including the
  capture-time team name, path, and clue label. Uploads never alter or delete the
  local original. D1 validates the game and uses its canonical clue ID/number/title.
- An event becomes inaccessible seven days after creation. The hourly Worker
  cron deletes expired objects and team/photo metadata; already-deleted event
  tombstones are swept again to catch uploads that were in flight. Tombstones
  are removed after expiry plus one day. Scheduled cleanup must remain enabled.
  Database work is batched to fit D1 Free's 50-request invocation budget, including
  a full batch of 20 expired events and 100 interrupted upload reservations.
- Deleting an event disables access before removing its objects. Closing uploads
  prevents new joins/uploads, while existing photos remain reviewable. An upload
  already in flight when uploads close may finish; deletion/expiry prevents commit.
- Responses and private photos use `private, no-store`. Authorization headers,
  tokens, titles, team names and photo bytes are not application log fields.
  Worker observability is disabled. Existing downloaded copies cannot be revoked.

## Limits and retries

- 20 active events for this deployment, 30 creations per public IP per clock hour. The allowance resets at the top of the hour.
- 20 teams per event, 60 photos per team, 300 photos or 100 MiB per event.
- Only JPEGs, up to 5 MiB each. No video or arbitrary file uploads.
- A database reservation enforces limits before R2 storage. Retrying the same
  local photo for the same team returns its existing result, without duplication.
  Interrupted reservations can be reclaimed after two minutes.
- Teams can send explicitly selected photos or enable automatic sending of new
  captures. Both send sequentially and stop on connectivity or
  permission failures. A refresh reconciles server-confirmed uploads when the
  phone lost the success response. A later retry sends only missing photos.

These are application bounds, not a billing guarantee. Usage is shared with the
account's other applications and remains subject to its Workers, D1 and R2 plan.
No paid-plan change is part of this deployment. Monitor storage and request usage
and keep the global event cap in place. This implementation is intended for small
group events; a broader public launch would need stronger abuse controls.

## Routine operation

Migration `0005_team_photo_status.sql` adds an optional photo-sharing report to
team rows. Team-only POST `/events/:id/photo-status` accepts the device's
`autoSend` choice, `queuedUploads`, `pendingDeletes`, `hasError`, and a monotonic
`clientUpdatedAt`. Counts include in-flight work and retries; they do not inventory
older/manual photos. The report contains no photo bytes, IDs, or device details.
It is visible only to that team and the leader, and expires with the event.

The client reads the durable queue on changes, reconnect, reload, and foreground
return. A receipt signature avoids idle API requests; failures retry while the
app is open. Server timestamps label reports, and strictly older/repeated client
updates cannot overwrite newer choices or counts. The dashboard explicitly shows
last reported time, not online status. An offline phone cannot report its current
queue until it reconnects. Auto-send off may leave other unshared photos on the
phone; these are not mislabeled as queued uploads. Missing older-client reports
stay unknown. Closed events still accept status reports and pending removals.

On the hunt screen, Menu → Photo sharing opens the sharing sheet, including
the manual-send/event link. The leader dashboard retains the reported queue
status; sharing controls stay out of the main clue view. The menu shows live status,
with an attention mark on its trigger only for failed sends or settings. Normal
offline queueing is a waiting state, not an error. A single compact camera/navigation dock replaces duplicate Next controls;
clues scroll independently and each newly opened clue starts at the top.

Migration `0004_auto_photo_sync.sql` adds `auto_upload_default` (off on existing
rows) and private `photo_removals` markers scoped to event/team/local photo ID.
New frontend event creation explicitly defaults on; omitted fields from older
clients remain manual. Leader edits use the existing settings revision, and only
future joins inherit the new default. Each device/team persists its own override.

Automatic uploads set `metadata.automatic: true` and cannot restore removal
markers; intentional manual re-sends can. Team-only idempotent DELETE
`/events/:id/local-photos/:localPhotoId` handles deletion even before the upload
or after a lost response, including when uploads are closed. Cloud deletion by
photo ID also records a marker first. Reservation and commit SQL both exclude
markers, so a late R2 PUT cannot revive a deleted photo. Markers contain no image
bytes and cascade away with the event/team during the existing expiry cleanup.

IndexedDB v4 migrates existing photos intact and adds settings/jobs stores. A
capture/deletion/retake and its queue entry share one transaction. Only newly
captured, opted-in event photos enqueue; other events and device-only photos do
not. Queue entries reference image IDs rather than duplicating bytes. One visible
online tab sends at a time via Web Locks where available; server idempotency is
the fallback. Failed operations back off, permanent errors offer Retry, and a
version check prevents an old response from overwriting a newer deletion. Turning
off cancels waiting uploads, but previously requested deletions still complete.
No service-worker background upload is promised. A failed join-time preference
write preserves the user's explicit choice for retry rather than enabling the
leader's default accidentally.

Migration `0003_leader_dashboard.sql` adds a settings revision to events and an
optional progress report to each team. Leader-only PATCH accepts `title` and/or
`teamNaming` with the last `settingsRevision`; stale edits return 409. A separate
`closed` toggle remains compatible with older app versions. Edits cannot change
the game, invite token, expiry, or existing teams. Joins reserve a name only if
the event's naming revision still matches the policy they validated.

Team-only POST `/events/:id/progress` accepts canonical `completedChallengeIds`
and `clientUpdatedAt`. It stores no photos or location. Leader snapshots include
all reports; a team sees only its own, and invite holders see none. A server
receive timestamp drives the dashboard's last-progress label. Strictly older
or repeated client timestamps cannot overwrite a newer report, while a later
empty array records a reset. Reports can continue when photo uploads are closed;
expiry/deletion still revokes access and cleanup deletes reports with team rows.
The app coalesces updates in a local queue, retries on reconnect/visibility and
every 30 seconds while needed, and sends no idle heartbeat. On a sleeping or
closed phone, queued progress waits until the app is opened again.

Event naming uses migration `0002_team_naming.sql`: an optional policy on events
and a normalized unique name key for newly joined teams. Existing events receive
the default policy, and existing teams/photos remain unchanged. Old rows without
a name key still reserve their names when new teams join. Invite snapshots expose
only available name choices and the number of remaining team slots, never team
records or photos. Selected pools replenish from the standard library when empty.

New joins choose a least-used path inside the same SQL statement that inserts the
team. Unique name and credential indexes handle concurrent joins and retries;
explicit valid paths from older app versions remain accepted. Apply migrations
before deploying the updated Worker, then publish the matching frontend. A lost
join response can be retried with the same credential to recover the original name
and path, including after the leader closes new joins. Purging an event also clears
its stored naming policy.

Run the tests before changes; apply new D1 migrations before deploying code that
depends on them. Keep old migrations unchanged. Keep the frontend and API's game
registry in sync. Check the Cloudflare trigger and storage usage periodically;
if cleanup fails, fix it and run the same cleanup through a scheduled Worker
invocation rather than exposing a public maintenance endpoint. Never export
private production tokens or photos into a repository or diagnostics bundle.
