# Live updates (OTA)

The native app packages the web game (`game/dist`), so without live updates
every fix waits on a store review. With them, a new web bundle reaches
installed players on their next launch or return to the app.

Native code, permissions and the plugin list still need a store release.

The system is match-merge's self-hosted
[`@capgo/capacitor-updater`](https://capgo.app) setup, adapted to this game.
There is no Capgo cloud account, bucket or credential: the game's own Vercel
deployment serves its updates.

## Store policy

Google Play's Device and Network Abuse policy exempts JavaScript run in a
WebView from its ban on downloaded code, and Apple's developer agreement
allows downloaded interpreted code likewise. Both require that **the app stays
the product that was reviewed**.

Fixes, balance, content and new events are fine. Changing what the app is,
unlocking something its listing does not describe, or shipping around a
rejection risks the whole org's developer account. Never do it.

## Pieces

| File | Role |
|---|---|
| `game/ota-version.json` | Which bundle each audience gets. Committed and edited by hand |
| `game/scripts/stage-web.mjs` | Copies the playable game into `game/dist` |
| `game/scripts/build-ota-bundle.mjs` | Writes `dist/ota/`: zip, per-file blobs, `index.json`; re-hosts the previous versions |
| `game/scripts/ota-release.mjs` | The release rules the build enforces |
| `game/scripts/ota-blobs.mjs`, `zip.mjs` | Content-addressed blob store; dependency-free zip writer |
| `game/vercel.json` | Runs both scripts on every deploy and serves `dist/` |
| `game/api/updates.js` | The endpoint the plugin asks on every launch |
| `game/api/stats.js` | Receives the plugin's device-side events |
| `game/api/_version.js` | Version comparison shared by the endpoint, packer and game |
| `native/capacitor.config.json` | App shell: app id, `webDir`, updater settings |
| `port/src/systems/live-updates.ts` | Game side: ready signal, update check on resume, beta channel |
| `port/src/systems/save-checkpoint.ts` | The save copy that makes leaving the beta safe |

## How an update reaches a player

1. The plugin posts the running version, the shell's versionName and the
   player's channel to `/api/updates` on launch.
2. The endpoint answers with the bundle for that audience, if it is newer and
   the shell meets its `minNative`. Otherwise it sends a message saying
   there is nothing to do.
3. The answer carries a per-file manifest. Every file is named by its sha256,
   so the device downloads only files it holds in neither the app nor its
   cache.

   A code change costs well under a megabyte of the ~79 MB bundle (measured:
   0.61 MB for a `main.js` change).
4. The game itself checks again each time the app returns to the foreground.
   When there is something to download, it shows "Updating Out of Ruin…",
   saves the game, and swaps to the new bundle. When there is nothing new, the
   screen never changes.
5. Once the first frame of the new bundle is drawn, the game calls
   `notifyAppReady()`. A bundle that does not reach that point within 10 s is
   rolled back to the previous one automatically.

When a newer bundle exists that the installed shell is too old for, the game
tells the player to update the app from the store.

## Releasing

Releases are edits to `game/ota-version.json`, deployed like any change.

- **Publish a build:** bump `version` whenever the game changes. That builds
  and hosts the bundle; nobody gets it yet.
- **Beta:** set `beta` to that version. Players who turned on Settings →
  "beta updates" get it at once.
- **Release:** `public: <the same number>, beta: null`. The number does not
  change, because the code did not.
- **Roll back:** point `public` at any still-hosted version. The last `keep`
  versions stay hosted, because each deploy fetches them from the live site
  and hosts them again.
- **Native dependency:** raise `minNative` in the same commit that makes game
  code call native code older shells lack.

The build refuses to publish:

- a version at or below the shell's versionName (`NATIVE_VERSION_NAME`), which
  no fresh install would be offered;
- a pointer newer than the version being built;
- a beta behind public;
- a pointer at a version this deployment does not host. Match-merge shipped
  that last one, and every non-beta device then failed its download on every
  launch.

`delta: false` serves the plain zip instead of the manifest. That is the
first thing to try if updates download but stop applying.

## Leaving the beta

Leaving while running an unreleased bundle is a code downgrade. Older code
reads a newer save shape as an empty one, so the game:

1. keeps a checkpoint of the save, taken only while public code runs;
2. asks the player to confirm when the save has changed since that checkpoint;
3. drops back to the app's packaged bundle, and restores the checkpoint at the
   next boot, before the save is read. The beta save is kept aside under
   `oor.ota.betasave`.

Pending gold checkouts (`oor.checkouts`) are never rolled back.

## Logs

The Vercel function log has one `[ota]` line per check (what was asked, what
was served) and one `[ota-stats]` line per device event (download_fail,
checksum_fail, set, app_launch_timeout…).

Game-side funnel events (`ota_boot_ok`, `ota_download_complete`,
`ota_bundle_applied`…) go to `onOtaEvent` sinks in `live-updates.ts`.
Nothing subscribes to them until analytics is wired.

## Native shell

The updater only works inside a shell that contains it, so the first store
release with the plugin is what turns live updates on. Older installs keep
working and never check.

`cd native && npm run sync` stages the game, removes `dist/ota`, and runs
`cap sync`. Leaving `dist/ota` in place would ship a second, zipped copy of
the game inside the app.
