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
- The public API URL is committed in `.env.production`; local review tests
  override it with their isolated Miniflare endpoint.

The owner approved creation and deployment on the existing plan. Workers Free
was verified on 2026-11-14. No plan upgrade, subscription, or DNS change was made.
Small event use is expected to fit the free allowances, but R2 usage above its
account-wide allowance is billable. Keep this separate from a guaranteed cost cap.

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

- 20 active events for this deployment, five creations per IP per hour.
- 20 teams per event, 60 photos per team, 300 photos or 100 MiB per event.
- Only JPEGs, up to 5 MiB each. No video or arbitrary file uploads.
- A database reservation enforces limits before R2 storage. Retrying the same
  local photo for the same team returns its existing result, without duplication.
  Interrupted reservations can be reclaimed after two minutes.
- Teams send explicitly selected photos sequentially and stop on connectivity or
  permission failures. A refresh reconciles server-confirmed uploads when the
  phone lost the success response. A later retry sends only missing photos.

These are application bounds, not a billing guarantee. Usage is shared with the
account's other applications and remains subject to its Workers, D1 and R2 plan.
No paid-plan change is part of this deployment. Monitor storage and request usage
and keep the global event cap in place. This implementation is intended for small
group events; a broader public launch would need stronger abuse controls.

## Routine operation

Run the tests before changes; apply new D1 migrations before deploying code that
depends on them. Keep old migrations unchanged. Keep the frontend and API's game
registry in sync. Check the Cloudflare trigger and storage usage periodically;
if cleanup fails, fix it and run the same cleanup through a scheduled Worker
invocation rather than exposing a public maintenance endpoint. Never export
private production tokens or photos into a repository or diagnostics bundle.
