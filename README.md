# Trove — a desktop storefront for GitHub

Browse open-source projects like a store, install them like a terminal. Trove
is an **Electron desktop app** with a **real terminal docked inside the window**:
clicking a project's **run** chip types its install command into that embedded
shell and runs it for real — no separate terminal window, no simulation.

## Stack

- **Electron** — desktop shell, owns a real PTY-backed login shell
- **React 18 + TypeScript + Vite** (`vite-plugin-electron`) — the renderer UI
- **xterm.js** (`@xterm/xterm` + `addon-fit`) — the embedded terminal view
- **node-pty** — the real shell process (prebuilt, N-API; no native rebuild needed)
- **GitHub REST API** — live repository data (search, metadata, README, contributors), plus the social layer (users, repos, public events)
- **React Router** (HashRouter) — `/`, `/feed`, `/library`, `/p/:owner/:repo`, `/c/:handle`
- **Zustand** — shared storefront/console/social state; library + follows persist to `localStorage`

## Social layer (Feed + Creators)

A creator-first discovery layer, wired to real GitHub:

- **Feed** (`/feed`) — a timeline built from makers' **real public GitHub events**
  (releases, pushes, new repos, merged PRs), each post embedding the repo with a
  run-to-install chip. Left rail = who you follow + suggested makers; the
  timeline is your follows' activity (or the suggested community if you follow
  no one).
- **Creator profile** (`/c/:handle`) — a real GitHub user/org: avatar, bio,
  location, follower/repo/star stats, and a grid of their top repos. Reachable
  from any creator avatar/name.
- **Follow** is client-side and persisted (`trove.following.v1`); toggling
  reshapes the feed and the Following list. **Like** is session-only.

> The feed makes several API calls (profiles + events + repos per maker), so a
> `GITHUB_TOKEN` is recommended. Engagement counts (likes/replies) are cosmetic
> — there's no backend for them, matching the prototype's "session-only" note.

## Real GitHub data

Discover is backed by the live GitHub API (`src/data/github.ts`):

- The search box runs a **real repository search** (`/search/repositories`), debounced.
  You can use qualifiers, e.g. `language:rust cli` or `stars:>5000 maps`.
- An empty search shows the top repositories by stars.
- Type chips (App/Tool/Library/Creative) are derived from each repo's topics/language
  and filter the current results client-side.
- The detail page pulls real metadata, parses the repo's README for the summary /
  highlights / usage snippet, and shows **real contributor avatars**.
- A project's **run** command is `git clone <repo>.git` — so clicking run actually
  clones the real repository into your shell's working directory.

### Rate limits / token

Unauthenticated GitHub allows ~60 core + 10 search requests per hour. To raise that
to 5000/hr, set a token before launching:

```bash
export GITHUB_TOKEN=ghp_xxx   # read by the main process, surfaced to the UI
npm run dev
```

(You can also set `localStorage['trove.ghtoken']` from devtools.) Hitting the limit
shows a friendly error with this hint.

## Run it

> Dev/build must be started **manually in your own terminal**.

```bash
npm install      # also chmod's node-pty's spawn-helper (postinstall)
npm run dev      # builds main/preload, then launches the Trove desktop app
```

`npm run dev` opens the Electron window directly — there's no browser tab. Type
in the bottom dock exactly like a normal terminal, or hit **run** on any project
to have its command typed and executed there.

Other scripts:

```bash
npm run typecheck   # tsc --noEmit (renderer + electron)
npm run build       # type-check + production renderer/main bundle
npm run rebuild     # fallback: rebuild node-pty against Electron's ABI
```

## Packaging a signed macOS app

Config lives in `electron-builder.cjs` (arm64 `.dmg` + `.zip`, hardened runtime,
entitlements in `build/entitlements.mac.plist`). `node-pty` is `asarUnpack`'d and
an `afterPack` hook restores `+x` on its `spawn-helper` so the embedded terminal
works in the packaged app.

**Signing** is automatic when a *Developer ID Application* certificate is in your
login keychain. **Notarization** runs only when credentials are present in the
environment (so no secrets live in the repo):

```bash
# one-time: a Developer ID Application cert in your keychain
#   Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application
# one-time: an app-specific password at appleid.apple.com → Sign-In & Security

export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="XXXXXXXXXX"        # developer.apple.com → Membership

npm run dist        # → release/Trove-<version>-arm64.dmg  (signed + notarized + stapled)
npm run dist:dir    # unpacked .app only, for a quick local check
```

Prefer an App Store Connect **API key**? Set `APPLE_API_KEY` (path to the `.p8`),
`APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, and `APPLE_TEAM_ID` instead of the Apple ID
vars. Without any of these, the build is signed-but-not-notarized (Gatekeeper will
warn on a downloaded copy).

Notes:
- No custom app icon yet — drop `build/icon.icns` to brand it; electron-builder
  picks it up automatically.
- The GitHub token is stored per-machine (`localStorage`), so re-enter it via the
  nav avatar's token field on the other Mac.

## In-app auto-update

The app checks **GitHub Releases** on launch (and every 6h). When a newer version
is published, an **Update** button appears in the nav — one click downloads it and
relaunches into the new version (powered by `electron-updater`; works because the
build is Developer-ID signed + notarized).

**One-time setup**
1. Create a **public** GitHub repo to host releases (public so the app reads the
   update feed with no embedded token). Point the build at it via env when you
   build: `GH_OWNER=<you> GH_REPO=trove` (or hard-code them in `electron-builder.cjs`).
2. Build + install this updater-aware version **once** manually — it becomes the
   baseline that can self-update. (The 1.0.0 you already shipped predates the
   updater and can't self-update.)

**Cutting a release** (each new version):
```bash
# bump "version" in package.json first, e.g. 1.0.1

export GH_TOKEN="ghp_…"                  # classic token w/ repo scope (publish only; not embedded)
export GH_OWNER="<your-gh-username>"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="XXXXXXXXXX"

npm run release    # build + sign + notarize + upload dmg/zip/latest-mac.yml to a GitHub Release
```
Then **publish** the draft release on GitHub. Installed apps pick it up on next
launch (or within 6h) and show the Update button.

- `npm run dist` builds locally without publishing; `npm run release` publishes.
- `GH_TOKEN` is only used by your build machine to upload — it never ships in the app.

## How it works

- **Main process** (`electron/main.ts`) spawns your login shell (`$SHELL`) via
  `node-pty` in your home directory and bridges it to the renderer over IPC
  (`pty:data` / `pty:input` / `pty:resize` / `pty:run`).
- **Preload** (`electron/preload.ts`) exposes a small typed `window.troveTerminal`
  API behind `contextBridge` (context isolation on, no node integration in the UI).
- **The dock** (`src/components/console/Console.tsx`) is an `xterm` terminal wired
  to that shell — a fully interactive terminal (colors, prompts, arrow keys,
  `vim`, etc.), embedded in the window.
- **Run** (`store.install`) opens the dock, adds the project to your Library, and
  writes the real install command into the same shell via `pty:run`.

Because the UI and the dock share **one** shell, they stay in sync — the point
of the design.

> Note: the sample projects are fictional, so their commands (`npx lumen …`,
> `brew install conduit`, …) will error in the shell just like any real
> not-yet-published package would. That's genuine terminal behavior. Swap
> `src/data/projects.ts` for real projects/commands to install real software.

### Keyboard

- `⌘/Ctrl+J` or `` ` `` — toggle the terminal dock
- `⌘/Ctrl+K` — focus search · `Esc` — minimize the dock

## Structure

```
electron/
  main.ts        window + real PTY shell + IPC
  preload.ts     window.troveTerminal + window.troveEnv (token) bridges
scripts/
  postinstall.mjs  restore +x on node-pty's spawn-helper after install
  afterPack.cjs    same, inside the packaged app
src/
  tokens.ts      design tokens (app + console palettes, fonts)
  types.ts       Project + filters
  data/
    github.ts    live GitHub client: search, repo detail, README parse, users,
                 events → activity feed, mapping
    constants.ts type list + language dot colors
    match.ts     token-based search matcher (used by the Library)
  lib/
    derive.ts    k() + timeAgo() formatting
    useGithub.ts useGithubSearch / useGithubRepo / useCreator / useFeed hooks
    useNavActions.ts  nav tabs → router + type filter + creator links
  store/         useTroveStore (state, run-in-terminal, library + follow persistence)
  components/    Nav, TypeChip, CommandChip, ProjectRow, icons, console/Console,
                 social (CreatorAvatar, FollowButton, ToolEmbed, ActivityCard, …)
  pages/         Storefront (Discover + Library), Detail, Feed, Creator
  App.tsx        routes + persistent terminal dock + shortcuts
```

## Notes / what's next

- Desktop-first (≥1080px content). Mobile isn't a target for a desktop app.
- Library "installed" is optimistic (added when you click run). Wiring it to the
  clone command's real exit code would need a shell-integration sentinel.
- Detail uses 3 API calls (repo + README + contributors); a token is recommended
  for heavy browsing. README parsing is best-effort across very different formats.
