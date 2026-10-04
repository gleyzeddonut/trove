# Trove — Agent Handoff

Last updated: October 3, 2026. Read this before touching anything. Newest
sections first; older ones stay accurate unless a newer one says otherwise.
The README covers setup and the feature tour; this file is the state, the
decisions, and the traps.

**State in one line:** `main` is clean and pushed (last commit `b3549ae`),
on **Electron 44.5.1** / electron-builder 26, **79 unit tests green**
(`npm test`), and **Trove 1.5.1 from this exact state is signed, notarized
and installed at `/Applications/Trove.app`** (built Oct 3 13:27). It has
**not** been published as a GitHub Release, so installed copies elsewhere
won't see it as an update yet.

**For Dan to check in the app** (things the unit tests can't reach):
- Settings › Account: connect GitHub, quit, relaunch — still connected?
  (Token now lives in the encrypted store; a token from an older build is
  migrated on first launch and removed from localStorage.)
- Open a web tab (⊕ in the tab strip) and play a README YouTube link — both
  are `<webview>` guests and should be untouched by the new CSP.
- Drag an `.html` file onto the window: nothing should happen.
- Install a repo whose README has a multi-step setup (e.g. a Python app with
  `python3 -m venv …`): clone runs, then a confirm lists the steps.

### Sessions, newest first

#### Oct 3 — full review, two fix batches, Electron 44, release

A whole-repo bug/security review, then fixes in this order (one commit
each, every change test-first):

1. **Install path hardening** (`43dd45b`). A README one-liner is typed into
   the real shell on one click. If it chains, pipes, redirects, substitutes,
   downloads or needs sudo (`isRiskyCommand` in `src/data/install.ts`), the
   store now shows the full command and asks **regardless of the
   "confirm before installing" setting**. `uninstallCommandFor` refuses such
   lines and only interpolates a plain package token (`SAFE_PKG_TOKEN`).
   Uninstall honors the confirm setting; **Clear library always confirms**
   and lists every command.
2. **Window navigation lock** (same commit). App windows carry the preload
   bridge, which includes `troveTerminal.run`. `will-navigate` now refuses
   anything but our own renderer (`isTrustedNavigation`, `electron/guards.ts`)
   and the renderer blocks `dragover`/`drop`, so a dropped `.html` can't
   inherit shell access. Pages in web tabs may `window.open` only http(s)
   into new tabs, ≤5 per 2s (`isWebTabUrl`, `makeBurstLimiter`).
3. **Four small bugs** (`8ca5223`): compound README lines
   (`git clone X && cd X && make`) are split before the clone/cd are
   stripped, so `make` survives; the clone URL check is an **allowlist** of
   URL-safe chars (zsh acts on `!`, `{}`, `*`); people search skips
   qualifier queries like `topic:cli`; the boot-splash registry count is
   fetched at most once a day (it was a search call on every launch).
4. **Settings cleanup** (`916fc53`): nine toggles with nothing behind them
   (notifications, telemetry, public library/follows, keep updated,
   autoplay, show replies) and the dead "Support Trove" button are gone.
   `loadSettings` keeps only known keys so stale values are dropped.
5. **CSP** (`3e97c67`): `electron/csp.ts` injects a `<meta>` policy into
   `index.html` **at build only** (dev needs Vite's inline scripts). The
   boot-splash script moved to `public/boot.js` so `script-src 'self'`
   holds. Webviews are separate documents and unaffected.
6. **Encrypted token** (`c41883c`): `safeStorage` in the main process,
   ciphertext in `userData/github-token.enc` (mode 0600), handed to the
   renderer over IPC (`troveSecrets`) and held in memory
   (`setSessionToken` in `src/data/github.ts`). Falls back to localStorage
   only if encryption is unavailable, and in the plain-browser build.
7. **Shell respawn backoff** (`cff1bba`): a shell that exits within 5s of
   starting waits 1s, 2s, 4s… ≤30s before respawning, with a line in the
   terminal (`respawnDelay`).
8. **Clone without prompts** (`7bdab6b`): the planner's clone is
   `GIT_TERMINAL_PROMPT=0 git clone …`. The setup line is typed right behind
   it; if git stopped to ask for a username (private/missing repo) that
   line would be eaten as the answer. Now git fails, no dir, `cd` fails,
   nothing runs.
9. **Electron 31 → 44** (branch merged as `78dc7f9`), with electron-builder
   26 and electron-rebuild 4. node-pty's prebuilt N-API binary loads under
   44 with no rebuild. **Trap:** electron-builder 26 wants `mac.notarize`
   as a **boolean** and reads the Team ID from `APPLE_TEAM_ID`; the old
   `{ teamId }` object fails validation (fixed in `b3549ae`). `dist:dir`
   never notarizes, so it didn't catch this — only `npm run dist` does.

Review findings deliberately **not** done: the `allow-unsigned-executable-
memory` entitlement is unnecessary (`allow-jit` covers V8) but harmless;
the command chip still shows a shortened command (the confirm dialog shows
the full one, which is the real gate); "installed" in the Library is still
optimistic (set on click, not on exit code).

The install planner itself (`src/data/install.ts`, two-phase clone-and-build
install in `useTroveStore.install`, people search, copy-clone-address) was
Dan's uncommitted work when the session started; it's committed as
`b32be6f` as it was, with the fixes layered on top in separate commits.

## How the dangerous parts work

Everything that reaches the real shell goes through `runInTerminal` in
`src/store/useTroveStore.ts`, which calls `troveTerminal.run` → IPC
`pty:run` → `ptyProcess.write(cmd + '\r')`. Callers and their gates:

| Caller | What runs | Gate |
|---|---|---|
| `install` (one-liner) | `p.install` — README-derived or guessed by `installFor` | confirm if `isRiskyCommand` **or** the setting is on |
| `install` (clone-and-build) | `plan.clone`, then `cd <dir> && steps…` | clone URL + dir validated by `planInstallCommands`; steps always confirmed (whole plan up front when the setting is on) |
| `uninstall` | `uninstallCommandFor(p.install)` or nothing | confirm if the setting is on; never built from a risky line |
| `clearLibrary` | every uninstall command | always confirms, lists them |
| `open` | an `echo` of the repo name/lang (GitHub-constrained charset) | none |

`p.install` for a repo **with** a README comes from `extractInstallPlan`
(`single` → `p.install`; `steps` → `p.install = git clone …`, `p.setup`).
For repos without a usable README block it's a guess from language/topics
(`installFor` in `src/data/github.ts`) using the GitHub-constrained repo
name — safe by construction.

The renderer never sees the shell except through those bridges. Webviews
(web tabs, video dock) get no preload (`will-attach-webview` strips it);
the video pop-out window has none either.

## Build, test, release

```
npm run dev          # Electron app with Vite HMR (no CSP in dev)
npm test             # vitest: src/data, src/store, src/lib, electron/*.test.ts
npm run typecheck    # tsc --noEmit (renderer + electron)
npm run build        # typecheck + renderer/main/preload bundles (CSP injected)
npm run dist:dir     # unsigned-ish .app in release/mac-arm64 — NO notarize, NO app-update.yml
npm run dist         # dmg + zip, signed, notarized, stapled (needs .env.release)
npm run release      # dist + upload to the GitHub Release draft
```

`.env.release` (gitignored; template `.env.release.example`) holds
`GH_TOKEN`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
Signing picks up the Developer ID Application cert from the login keychain
automatically. Bump `version` in `package.json` before a release; the
updater compares it against the GitHub Release feed (`gleyzeddonut/trove`).

After merging anything that touched `package.json`, run `npm ci` so
`node_modules` matches the lockfile.

**Smoke-launching from a script:** run the binary directly —
`node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .` — under
a timeout. Killing `npx electron` kills only the wrapper and leaves the app
and its helpers running (this session orphaned three before noticing).
Check `pgrep -fl Electron.app` afterwards.

## Tests

| File | Pins down |
|---|---|
| `src/data/install.test.ts` | README → plan parsing, one-liner vs steps, shell-injection defenses, URL allowlist, compound-line split, risky detection, `GIT_TERMINAL_PROMPT=0` |
| `src/data/github.test.ts` | uninstall builder safety, `isPeopleQuery`, registry-cache freshness, session-token precedence |
| `src/store/useTroveStore.test.ts` | every confirm gate on install/uninstall/clear; token flow via `troveSecrets` (connect, disconnect, hydrate, legacy migration). Stubs `window`, `localStorage`, `fetch`; imports the store **after** stubbing |
| `src/lib/settings.test.ts` | unknown keys dropped on load; no dead defaults |
| `electron/guards.test.ts` | navigation policy, tab URL policy, burst limiter, respawn backoff |
| `electron/csp.test.ts` | policy directives; plugin is build-only and injects once |

Main-process wiring (`electron/main.ts`) has no harness; keep the policy in
pure modules (`guards.ts`, `csp.ts`) and test those.

## Open items

- `allow-unsigned-executable-memory` in `build/entitlements.mac.plist` can
  go (`allow-jit` suffices for V8).
- Library "installed" is optimistic; wiring it to the clone's exit code
  needs a shell-integration sentinel (also what a real "shell is idle"
  signal for the two-phase install would need).
- No app icon in `build/` (electron-builder would pick up `build/icon.icns`).
- Publishing 1.5.1 as a GitHub Release (`npm run release`) so existing
  installs see the Update button.
