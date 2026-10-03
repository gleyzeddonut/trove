// Install-plan parsing + command building — the logic that turns a README into
// either a one-line install or a clone-and-build sequence, and then into the
// exact shell commands Trove runs. Kept pure (no DOM / no network) so it can be
// unit-tested in isolation (see install.test.ts).

// A recognizable package-manager command (npm/cargo/pip/brew/…), used both to
// find the install code block and to classify a lone command as a global install.
export const PKG_CMD =
  /^\s*\$?\s*(sudo\s+)?((npm|pnpm|yarn|npx|pip3?|pipx|brew|cargo|go|gem|apt(-get)?|docker|nix(-env)?|conda|uv|bun|deno|scoop|choco|winget|gh)\b|python3?\s+-m\s+(pip|venv)\b)/;
// A command line worth running as a setup step (package managers, clone/cd,
// activating a venv, build/make, running a local script). Broad on purpose.
export const SETUP_CMD =
  /^\s*\$?\s*(sudo\s+)?(git\s+clone|cd\b|source\b|\.\s|make\b|cmake\b|\.\/|bash\b|sh\b|python3?\b|node\b|npm|pnpm|yarn|npx|pip3?|pipx|brew|cargo|go\b|gem|apt(-get)?|docker|nix(-env)?|conda|uv|bun|deno|scoop|choco|winget|gh\b|export\b|poetry\b|virtualenv\b)/;

// A line that actually *installs or builds* (as opposed to running/demoing the
// tool). Used to reject Usage/example blocks like `docker run …` or `python
// demo.py`, which match a package-manager keyword but aren't installs.
const INSTALL_CMD =
  /^\s*(sudo\s+)?(git\s+clone\b|(npm|pnpm|yarn|bun)\s+(i|ci|install|add)\b|pip3?\s+install\b|pipx\s+install\b|python3?\s+-m\s+(pip\s+install|venv)\b|poetry\s+(install|add)\b|virtualenv\b|uv\s+(pip\s+install|tool\s+install|add|sync)\b|conda\s+(install|env\s+create)\b|brew\s+(install|tap)\b|cargo\s+(install|build)\b|go\s+(install|get|build)\b|gem\s+install\b|bundle\s+install\b|apt(-get)?\s+install\b|nix(-env)?\s+(-i|install)\b|scoop\s+install\b|choco\s+install\b|winget\s+install\b|gh\s+extension\s+install\b|deno\s+install\b|docker\s+(pull|build|compose)\b|composer\s+(install|require)\b|mix\s+deps\.get\b|make\b|cmake\b|\.\/(configure|install|build))/;
const isInstallish = (cmd: string) => INSTALL_CMD.test(cmd);

const cleanCmd = (s: string) => s.replace(/^\s*\$\s?/, '').replace(/^\s*>\s?/, '').trim();

// The command lines of the install/setup code block, in order (or undefined).
export function installBlock(md: string): string[] | undefined {
  const lines = md.split('\n');

  const collect = (start: number): string[] | undefined => {
    for (let i = start; i < lines.length; i++) {
      if (/^```/.test(lines[i].trim())) {
        const steps: string[] = [];
        for (let j = i + 1; j < lines.length && !/^```/.test(lines[j].trim()); j++) {
          const cmd = cleanCmd(lines[j]);
          if (cmd && !cmd.startsWith('#') && SETUP_CMD.test(cmd)) steps.push(cmd.slice(0, 200));
        }
        return steps.length ? steps : undefined;
      }
      if (start > 0 && /^#{1,3}\s/.test(lines[i])) return undefined; // next section
    }
    return undefined;
  };

  // 1) first code block after an install-ish heading
  const headingIdx = lines.findIndex((l) =>
    /^#{1,6}\s+.*(install|installation|getting started|setup|quick ?start|build from source)/i.test(l),
  );
  if (headingIdx >= 0) {
    const steps = collect(headingIdx + 1);
    if (steps) return steps;
  }

  // 2) fallback: first fenced block anywhere that contains a *real install*
  // command (not just any tool invocation — a bare `docker run` usage block
  // shouldn't count).
  let inFence = false;
  let cur: string[] = [];
  for (const raw of lines) {
    if (/^```/.test(raw.trim())) {
      if (inFence) {
        if (cur.some(isInstallish)) return cur;
        cur = [];
      }
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      const cmd = cleanCmd(raw);
      if (cmd && !cmd.startsWith('#') && SETUP_CMD.test(cmd)) cur.push(cmd.slice(0, 200));
    }
  }
  return undefined;
}

// A lone, self-contained package-manager command (e.g. `brew install ripgrep`)
// that runs anywhere — as opposed to a step that needs the repo's own files.
export function isGlobalInstall(cmd: string): boolean {
  if (!PKG_CMD.test(cmd)) return false;
  // Repo-local installs need the checked-out source, so they aren't one-liners.
  if (/\s-r(\s|$)|requirements\.txt|package\.json|\bsetup\.py\b|(^|\s)\.(\s|$)/.test(cmd)) return false;
  const tokens = cmd.split(/\s+/);
  // `npm install` / `yarn` / `pnpm install` / `bun install` with no package name
  // installs the repo's own dependencies — needs the clone.
  if (/^(npm|pnpm|yarn|bun)$/.test(tokens[0])) {
    const rest = tokens.slice(1).filter((t) => !t.startsWith('-'));
    if (rest.length === 0 || rest[0] === 'ci' || (rest[0] === 'install' && rest.length === 1)) return false;
  }
  return true;
}

export type InstallPlan = { single: string } | { steps: string[] };

/** How a repo installs: either a single global command, or a full clone-and-
 *  build setup block. Returns undefined when the README yields nothing usable. */
export function extractInstallPlan(md: string): InstallPlan | undefined {
  const steps = installBlock(md);
  if (!steps || steps.length === 0) return undefined;
  // The block must contain at least one genuine install/build command; a block
  // of pure run/usage examples (`docker run …`, `python demo.py`) is not install.
  if (!steps.some(isInstallish)) return undefined;
  // One recognizable global command → keep the one-line install model.
  if (steps.length === 1 && isGlobalInstall(steps[0])) return { single: steps[0] };
  // Anything multi-step (or a repo-local single step) is a clone-and-build app.
  return { steps };
}

// --- Shell command building (clone-and-build) -----------------------------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The directory a clone URL lands in (basename without `.git`), or '' if
 *  unclear. Handles https, trailing slash, and scp-style `git@host:owner/repo`. */
export function dirFromCloneUrl(url: string): string {
  return url
    .trim()
    .replace(/[?#].*$/, '') // drop query/fragment
    .replace(/\/$/, '')
    .split(/[/:]/)
    .pop()
    ?.replace(/\.git$/, '') || '';
}

// Only accept clone URLs that look like real git remotes — https(s) or the
// scp-style `git@host:owner/repo`. Anything else (a shell-metachar payload,
// a `file://`, an option like `--upload-pack=…`) is rejected so we never
// interpolate an attacker-controlled token into the shell.
// Allowlist (not a denylist): the URL-safe set plus `:` `/` `?` `#` `@` `%`.
// This keeps out everything an interactive zsh would act on — `!` (history),
// `{}` (brace expansion), `*` `[]` (globs), quotes, and all the chaining chars.
const URL_CHARS = 'A-Za-z0-9._~:/?#@%+=,-';
const SAFE_CLONE_URL = new RegExp(`^(https?://[${URL_CHARS}]+|git@[${URL_CHARS}]+)$`);
// A shell-safe directory name: no separators or metacharacters.
const SAFE_DIR = /^[A-Za-z0-9._-]+$/;

export interface InstallCommands {
  /** The clone command to run first (phase 1), or null if the URL is unsafe. */
  clone: string | null;
  /** Directory the clone creates. */
  dir: string;
  /** Build steps to run after confirming (phase 2), README clone/enter-cd stripped. */
  steps: string[];
  /** True when a step contains shell syntax we can't vet — caller should warn. */
  risky: boolean;
}

// Things that make a setup step worth a louder heads-up (not blocked — the user
// still sees and confirms every line — but flagged): piping to a shell,
// destructive removes, privilege escalation, command substitution.
const RISKY_STEP = /\|\s*(sudo\s+)?(bash|sh|zsh)\b|\brm\s+-|\bsudo\b|\bcurl\b|\bwget\b|\$\(|`|\bchmod\b|\bmkfs\b|>\s*\/dev\//;

// Shell syntax that turns "one package-manager command" into something else:
// chaining, piping, redirection, substitution. A one-line install containing
// any of these is not a plain install and must be shown in full and confirmed.
const SHELL_META = /[;&|<>`]|\$\(|\$\{|\n/;

/** True when a single install line needs an explicit, full-text confirmation
 *  before it is typed into the shell — regardless of the user's confirm setting. */
export function isRiskyCommand(cmd: string): boolean {
  return SHELL_META.test(cmd) || RISKY_STEP.test(cmd);
}

/**
 * Turn a README setup block into concrete shell commands. Pure: no execution.
 * - `clone` clones the repo (we synthesize it; if the block clones itself we
 *   borrow that URL). Null when the URL isn't a recognizable git remote.
 * - `steps` are the build commands with any `git clone` and the "enter the repo"
 *   `cd <dir>` removed, since we handle both. The caller runs `cd <dir> && steps`.
 */
export function planInstallCommands(rawSetup: string[], fallbackUrl: string, name: string): InstallCommands {
  // READMEs often chain one line (`git clone X && cd X && make`). Split so the
  // clone / enter-cd can be stripped without taking the build step with them;
  // the caller re-joins the steps with `&&` anyway.
  const setup = rawSetup.flatMap((c) => c.split(/\s*&&\s*/)).map((c) => c.trim()).filter(Boolean);
  const cloneLine = setup.find((c) => /^\s*git\s+clone\b/.test(c));
  const lineUrl = (cloneLine?.match(/git\s+clone\s+(?:-\S+\s+)*(\S+)/)?.[1] || '').trim();
  // Prefer the README's clone URL, but only if it's a safe git remote; otherwise
  // fall back to the repo's own URL (from the GitHub API) so a malformed or
  // hostile clone line can't inject a token into the shell.
  const candidate = SAFE_CLONE_URL.test(lineUrl) ? lineUrl : fallbackUrl.trim();
  const url = SAFE_CLONE_URL.test(candidate) ? candidate : '';
  const dirGuess = dirFromCloneUrl(url) || name.replace(/\.git$/, '');
  const dir = SAFE_DIR.test(dirGuess) ? dirGuess : '';

  const enterRepoCd = dir ? new RegExp(`^cd\\s+["']?${escapeRe(dir)}["']?\\s*$`) : /^\bcd\b\s+\S+$/;
  const steps = setup.filter((c) => !/^\s*git\s+clone\b/.test(c) && !enterRepoCd.test(c));

  return {
    clone: url ? `git clone ${url}` : null,
    dir,
    steps,
    risky: setup.some((c) => RISKY_STEP.test(c)),
  };
}
