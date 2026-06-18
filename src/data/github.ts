// Real data source: the GitHub REST API. Repos are mapped onto the app's
// Project shape so the existing storefront/detail UI renders them unchanged.
//
// Auth is optional — set GITHUB_TOKEN in the app's environment (or
// localStorage['trove.ghtoken']) to raise the rate limit from 60 to 5000/hr.

import type { Project, ProjectType } from '../types';
import { langColor } from './constants';
import { k, timeAgo } from '../lib/derive';

const API = 'https://api.github.com';

export interface Contributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimited = false,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

function token(): string {
  try {
    const t = localStorage.getItem('trove.ghtoken');
    if (t) return t;
  } catch {
    /* ignore */
  }
  return (typeof window !== 'undefined' && window.troveEnv?.githubToken) || '';
}

function headers(accept = 'application/vnd.github+json'): HeadersInit {
  const h: Record<string, string> = { Accept: accept };
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function ghJson<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { headers: headers() });
  if (!res.ok) {
    const rateLimited = res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0';
    const msg = rateLimited
      ? 'GitHub rate limit reached. Set GITHUB_TOKEN to raise it (60 → 5000/hr).'
      : `GitHub API error ${res.status}.`;
    throw new GitHubError(msg, res.status, rateLimited);
  }
  return res.json() as Promise<T>;
}

// --- Mapping --------------------------------------------------------------

interface GhRepo {
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  subscribers_count?: number;
  open_issues_count?: number;
  topics?: string[];
  license: { spdx_id?: string; name?: string } | null;
  pushed_at?: string;
  updated_at?: string;
  clone_url: string;
  html_url: string;
  default_branch?: string;
  fork?: boolean;
}

interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  public_repos: number;
  avatar_url: string;
  type: string;
}

interface GhEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    release?: { tag_name?: string; name?: string; body?: string };
    ref?: string;
    ref_type?: string;
    size?: number;
    commits?: { message: string }[];
    action?: string;
    pull_request?: { merged?: boolean; title?: string; number?: number };
  };
}

const COVER_PALETTE = [
  '#4338ca', '#7c3aed', '#c026d3', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b',
  '#ea580c', '#dc2626', '#16a34a', '#0d9488', '#0891b2', '#2563eb', '#4f46e5',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function coverFor(seed: string): { cover: string; accent: string } {
  const h = hash(seed);
  const a = COVER_PALETTE[h % COVER_PALETTE.length];
  const b = COVER_PALETTE[(h >> 4) % COVER_PALETTE.length];
  const c = COVER_PALETTE[(h >> 8) % COVER_PALETTE.length];
  return { cover: `linear-gradient(135deg,${a},${b} 60%,${c})`, accent: a };
}

function deriveType(topics: string[], lang?: string | null): ProjectType {
  const t = new Set(topics.map((x) => x.toLowerCase()));
  const has = (...keys: string[]) => keys.some((x) => t.has(x));
  if (has('art', 'generative', 'creative', 'design', 'graphics', 'animation', 'game', 'gamedev', 'shader', 'music', 'audio', 'render'))
    return 'Creative';
  if (has('cli', 'command-line', 'commandline', 'terminal', 'devtools', 'tool', 'tooling', 'productivity'))
    return 'Tool';
  if (has('library', 'sdk', 'framework', 'api', 'package', 'orm', 'parser', 'utils'))
    return 'Library';
  if (has('app', 'application', 'desktop', 'gui', 'pwa', 'mobile', 'web-app', 'webapp', 'self-hosted', 'selfhosted'))
    return 'App';
  // fall back by language flavor
  if (lang && ['HTML', 'CSS', 'Vue', 'Svelte'].includes(lang)) return 'App';
  return 'Tool';
}

function licenseOf(repo: GhRepo): string {
  const spdx = repo.license?.spdx_id;
  if (spdx && spdx !== 'NOASSERTION') return spdx;
  return repo.license?.name || 'No license';
}

function tagFor(repo: GhRepo): string {
  const topic = (repo.topics || [])[0];
  if (topic) return topic.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return repo.language || 'Repo';
}

// Best-guess install command by ecosystem, so the storefront shows realistic,
// varied commands (brew / cargo / pip / npm / go install / gem). The guessed
// package name usually matches the repo name; for anything we can't map
// confidently we fall back to `git clone`, which always works.
// The user's "Default package manager" preference (Settings), read from the
// persisted settings so the data layer needn't be threaded through React.
function preferredPkg(): string {
  try {
    const s = JSON.parse(localStorage.getItem('trove.settings.v1') || '{}');
    return typeof s?.pkg === 'string' ? s.pkg : 'auto';
  } catch {
    return 'auto';
  }
}

function installFor(repo: GhRepo): string {
  const owner = repo.owner.login;
  const pkg = repo.name.toLowerCase();
  const topics = (repo.topics || []).map((t) => t.toLowerCase());
  const isCli = topics.some((t) => ['cli', 'command-line', 'commandline', 'terminal'].includes(t));
  const wantsBrew = topics.includes('homebrew') || topics.includes('macos');

  // An explicit preference overrides the language-based guess (README-derived
  // commands still take priority on the detail page — this is only the guess).
  switch (preferredPkg()) {
    case 'npm':
      return `npm install ${pkg}`;
    case 'pnpm':
      return `pnpm add ${pkg}`;
    case 'brew':
      return `brew install ${pkg}`;
    case 'cargo':
      return `cargo install ${pkg}`;
    case 'pip':
      return `pip install ${pkg}`;
    default:
      break; // 'auto' → fall through to language heuristic
  }

  switch (repo.language) {
    case 'Go':
      return `go install github.com/${owner}/${repo.name}@latest`;
    case 'Rust':
      return `cargo install ${pkg}`;
    case 'Python':
      return `pip install ${pkg}`;
    case 'Ruby':
      return `gem install ${pkg}`;
    case 'PHP':
      return `composer require ${owner}/${pkg}`;
    case 'JavaScript':
    case 'TypeScript':
      return isCli ? `npm install -g ${pkg}` : `npm install ${pkg}`;
    case 'Swift':
    case 'C':
    case 'C++':
    case 'Shell':
      return `brew install ${pkg}`;
    default:
      if (wantsBrew) return `brew install ${pkg}`;
      return `git clone ${repo.clone_url}`;
  }
}

/**
 * Mirror of an install command → the command that removes it. Returns
 * undefined when there's nothing persistent to uninstall (git clone, npx,
 * docker, go install, …) — in that case we just drop it from the library.
 */
export function uninstallCommandFor(install: string): string | undefined {
  let tokens = install.trim().split(/\s+/);
  let sudo = '';
  if (tokens[0] === 'sudo') {
    sudo = 'sudo ';
    tokens = tokens.slice(1);
  }
  const tool = tokens[0];
  const last = tokens[tokens.length - 1];
  const pkg = last && !last.startsWith('-') ? last : undefined;
  const global = tokens.includes('-g') || tokens.includes('--global');
  if (!pkg) return undefined;

  switch (tool) {
    case 'npm':
      return `npm uninstall ${global ? '-g ' : ''}${pkg}`;
    case 'pnpm':
      return `pnpm remove ${global ? '-g ' : ''}${pkg}`;
    case 'yarn':
      return `yarn ${tokens[1] === 'global' ? 'global ' : ''}remove ${pkg}`;
    case 'pip':
    case 'pip3':
      return `${tool} uninstall -y ${pkg}`;
    case 'pipx':
      return `pipx uninstall ${pkg}`;
    case 'brew':
      return `brew uninstall ${install.includes('--cask') ? '--cask ' : ''}${pkg}`;
    case 'cargo':
      return `cargo uninstall ${pkg}`;
    case 'gem':
      return `gem uninstall ${pkg}`;
    case 'apt':
    case 'apt-get':
      return `${sudo}${tool} remove ${pkg}`;
    case 'gh':
      return tokens[1] === 'extension' ? `gh extension remove ${pkg}` : undefined;
    case 'python':
    case 'python3':
      return tokens[1] === '-m' && tokens[2] === 'pip' ? `${tool} -m pip uninstall -y ${pkg}` : undefined;
    default:
      return undefined; // npx / go / docker / git / open / deno …
  }
}

// Cache mapped projects (by owner/name) so the detail page can paint instantly
// from the data the list already fetched, while the full detail streams in.
const projectCache = new Map<string, Project>();

export function cachedProject(owner: string, name: string): Project | undefined {
  return projectCache.get(`${owner}/${name}`.toLowerCase());
}

function mapRepo(repo: GhRepo): Project {
  const { cover, accent } = coverFor(repo.full_name);
  const project: Project = {
    id: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    ownerName: repo.owner.login,
    blurb: repo.description?.trim() || 'No description provided.',
    desc: repo.description?.trim() || '',
    lang: repo.language || '—',
    langColor: langColor(repo.language),
    stars: k(repo.stargazers_count),
    starsNum: repo.stargazers_count,
    delta: '',
    type: deriveType(repo.topics || [], repo.language),
    tag: tagFor(repo),
    updated: timeAgo(repo.pushed_at || repo.updated_at),
    license: licenseOf(repo),
    topics: repo.topics || [],
    forksNum: repo.forks_count,
    htmlUrl: repo.html_url,
    cover,
    accent,
    install: installFor(repo),
    kw: (repo.topics || []).join(' '),
    about: '',
    features: [],
    usage: '',
    requires: '',
  };
  projectCache.set(project.id.toLowerCase(), project);
  return project;
}

// --- README parsing (best-effort) -----------------------------------------

function stripMd(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReadme(md: string): Pick<Project, 'about' | 'features' | 'usage'> {
  const lines = md.split('\n');

  // about: first prose paragraph (skip headings, badges, images, HTML, rules)
  let about = '';
  const para: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (para.length) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      if (para.length) break;
      continue;
    }
    if (/^(!\[|\[!\[|<|={3,}$|-{3,}$|\|)/.test(line) || /^[-*]\s/.test(line) || /^>/.test(line)) {
      if (para.length) break;
      continue;
    }
    para.push(line);
  }
  about = stripMd(para.join(' ')).slice(0, 320);

  // features: first handful of bullet lines
  const features = lines
    .filter((l) => /^\s*[-*]\s+\S/.test(l))
    .map((l) => stripMd(l.replace(/^\s*[-*]\s+/, '')))
    .filter((f) => f.length > 2 && f.length < 140)
    .slice(0, 5);

  // usage: first fenced code block
  let usage = '';
  const fence = md.match(/```[a-zA-Z0-9+#-]*\n([\s\S]*?)```/);
  if (fence) usage = fence[1].trim().split('\n').slice(0, 14).join('\n');

  return { about, features, usage };
}

// Pull the *real* install command out of the README — prefer a code block
// under an "Install"/"Getting started" heading, else the first package-manager
// line in any code block. Returns undefined if nothing recognizable is found.
const PKG_CMD =
  /^\s*\$?\s*(sudo\s+)?((npm|pnpm|yarn|npx|pip3?|pipx|brew|cargo|go|gem|apt(-get)?|docker|nix(-env)?|conda|uv|bun|deno|scoop|choco|winget|gh)\b|python3?\s+-m\s+pip\b)/;
const cleanCmd = (s: string) => s.replace(/^\s*\$\s?/, '').replace(/^\s*>\s?/, '').trim();

function extractInstall(md: string): string | undefined {
  const lines = md.split('\n');

  // 1) first code block following an install-ish heading
  const headingIdx = lines.findIndex((l) =>
    /^#{1,6}\s+.*(install|installation|getting started|setup|quick ?start)/i.test(l),
  );
  if (headingIdx >= 0) {
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (/^```/.test(lines[i].trim())) {
        for (let j = i + 1; j < lines.length && !/^```/.test(lines[j].trim()); j++) {
          const cmd = cleanCmd(lines[j]);
          if (PKG_CMD.test(cmd)) return cmd.slice(0, 160);
        }
        break;
      }
      if (/^#{1,3}\s/.test(lines[i])) break; // hit the next major section
    }
  }

  // 2) fallback: first package-manager line in any fenced code block
  let inFence = false;
  for (const raw of lines) {
    if (/^```/.test(raw.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      const cmd = cleanCmd(raw);
      if (PKG_CMD.test(cmd)) return cmd.slice(0, 160);
    }
  }
  return undefined;
}

// --- Public API -----------------------------------------------------------

export interface SearchPage {
  items: Project[];
  totalCount: number;
}

/** Max page reachable: the Search API caps results at 1000 (10 × 100). */
export const SEARCH_PER_PAGE = 100;
export const SEARCH_MAX_PAGE = 10;

/** Search repositories. Empty query → popular repos by stars. */
export async function searchRepos(query: string, page = 1): Promise<SearchPage> {
  const q = query.trim() || 'stars:>20000';
  const data = await ghJson<{ items: GhRepo[]; total_count: number }>(
    `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${SEARCH_PER_PAGE}&page=${page}`,
  );
  return {
    items: (data.items || []).map(mapRepo),
    totalCount: Math.min(data.total_count || 0, SEARCH_PER_PAGE * SEARCH_MAX_PAGE),
  };
}

export interface RepoDetail {
  project: Project;
  contributors: Contributor[];
  forks: string;
  watchers: string;
  issues: string;
  /** Raw README markdown (rendered faithfully on the detail page). */
  readme: string;
  /** Default branch, for resolving relative README links/images. */
  defaultBranch: string;
}

// Session cache so revisiting a detail page is instant.
const repoDetailCache = new Map<string, RepoDetail>();

export function cachedRepoDetail(owner: string, name: string): RepoDetail | undefined {
  return repoDetailCache.get(`${owner}/${name}`.toLowerCase());
}

/**
 * Build a partial detail from a project the list already fetched, so the detail
 * page can render its header/sidebar immediately while the full data loads.
 */
export function previewDetail(project: Project): RepoDetail {
  return { project, contributors: [], forks: k(project.forksNum), watchers: '—', issues: '—', readme: '', defaultBranch: 'HEAD' };
}

/** Full detail for one repo: metadata + README content + top contributors. */
export async function fetchRepo(owner: string, name: string): Promise<RepoDetail> {
  // Fire all three requests at once instead of in sequence.
  const [repo, md, contribList] = await Promise.all([
    ghJson<GhRepo>(`/repos/${owner}/${name}`),
    fetch(`${API}/repos/${owner}/${name}/readme`, { headers: headers('application/vnd.github.raw') })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
    ghJson<{ login: string; avatar_url: string; html_url: string }[]>(`/repos/${owner}/${name}/contributors?per_page=18`)
      .catch(() => [] as { login: string; avatar_url: string; html_url: string }[]),
  ]);

  const project = mapRepo(repo);
  if (md) {
    Object.assign(project, parseReadme(md));
    const realInstall = extractInstall(md); // prefer the README's real command
    if (realInstall) project.install = realInstall;
  }
  if (!project.about) project.about = project.desc || 'No description provided.';
  if (!project.requires) project.requires = project.lang !== '—' ? `Built with ${project.lang}.` : 'See the repository for details.';

  const contributors: Contributor[] = (contribList || []).map((c) => ({
    login: c.login,
    avatarUrl: c.avatar_url,
    htmlUrl: c.html_url,
  }));

  const detail: RepoDetail = {
    project,
    contributors,
    forks: k(repo.forks_count),
    watchers: k(repo.subscribers_count ?? Math.round(repo.stargazers_count / 41)),
    issues: k(repo.open_issues_count ?? 0),
    readme: md,
    defaultBranch: repo.default_branch || 'HEAD',
  };
  repoDetailCache.set(`${owner}/${name}`.toLowerCase(), detail);
  return detail;
}

// --- Social layer: creators, profiles, activity feed ----------------------

/** Curated real GitHub makers/orgs for the "Suggested" rail (most-active first). */
export const SUGGESTED_CREATORS = [
  'sindresorhus',
  'antfu',
  'yyx990803',
  'junegunn',
  'BurntSushi',
  'tpope',
  'fatih',
  'rauchg',
  'sharkdp',
  'charmbracelet',
];

export interface Creator {
  handle: string;
  name: string;
  verified: boolean;
  followers: string;
  followersNum: number;
  following: number;
  location: string;
  bio: string;
  avatarUrl: string;
  cover: string;
  publicRepos: number;
}

export type ActivityVerb = 'shipped' | 'released' | 'reached' | 'posted';

export interface ActivityItem {
  id: string;
  creatorHandle: string;
  project: Project;
  verb: ActivityVerb;
  tag: string;
  t: string;
  note: string;
  likes: number;
  replies: number;
  createdAt: number;
}

function mapUser(u: GhUser): Creator {
  return {
    handle: u.login,
    name: u.name || u.login,
    verified: u.type === 'Organization' || u.followers >= 5000,
    followers: k(u.followers),
    followersNum: u.followers,
    following: u.following,
    location: u.location || '',
    bio: u.bio || '',
    avatarUrl: u.avatar_url,
    cover: coverFor(u.login).cover,
    publicRepos: u.public_repos,
  };
}

export async function fetchUser(handle: string): Promise<Creator> {
  return mapUser(await ghJson<GhUser>(`/users/${handle}`));
}

export interface Account {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  cover: string;
}

/** The user the current token authenticates as (GET /user). */
export async function fetchAuthedUser(): Promise<Account> {
  const u = await ghJson<GhUser & { email: string | null }>(`/user`);
  return {
    login: u.login,
    name: u.name || u.login,
    email: u.email || '',
    avatarUrl: u.avatar_url,
    cover: coverFor(u.login).cover,
  };
}

/** Best-effort batch of user profiles; failures are dropped. */
export async function fetchUsers(handles: string[]): Promise<Creator[]> {
  const settled = await Promise.allSettled(handles.map((h) => fetchUser(h)));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}

export interface CreatorProfile {
  creator: Creator;
  tools: Project[];
  totalStars: number;
}

export async function fetchCreatorProfile(handle: string): Promise<CreatorProfile> {
  const [creator, repos] = await Promise.all([
    fetchUser(handle),
    ghJson<GhRepo[]>(`/users/${handle}/repos?per_page=100&sort=updated&type=owner`).catch(() => []),
  ]);
  const owned = repos.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count);
  const tools = owned.slice(0, 24).map(mapRepo);
  const totalStars = owned.reduce((s, r) => s + r.stargazers_count, 0);
  return { creator, tools, totalStars };
}

// Stable, cosmetic engagement numbers (the prototype treats likes/replies as
// session-only social proof; there's no real backend for them).
function seedHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function firstLine(s?: string): string {
  if (!s) return '';
  const line = s
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('<'));
  return (line || '').replace(/[*_`>]/g, '').slice(0, 220);
}

function mapEvent(ev: GhEvent, creator: Creator, project: Project): ActivityItem | null {
  const createdAt = new Date(ev.created_at).getTime();
  const h = seedHash(ev.id);
  const base = {
    id: ev.id,
    creatorHandle: creator.handle,
    project,
    t: timeAgo(ev.created_at),
    createdAt,
    likes: 20 + (h % 420),
    replies: h % 38,
  };
  switch (ev.type) {
    case 'ReleaseEvent': {
      const tag = ev.payload.release?.tag_name || 'release';
      const note = firstLine(ev.payload.release?.body) || ev.payload.release?.name || `Released ${tag} of ${project.name}.`;
      return { ...base, verb: 'released', tag, note };
    }
    case 'PushEvent': {
      const n = ev.payload.size || ev.payload.commits?.length || 1;
      const msg = firstLine(ev.payload.commits?.[ev.payload.commits.length - 1]?.message);
      return { ...base, verb: 'shipped', tag: `+${n} ${n === 1 ? 'commit' : 'commits'}`, note: msg || `Pushed ${n} commits to ${project.name}.` };
    }
    case 'CreateEvent': {
      if (ev.payload.ref_type === 'tag') {
        const tag = ev.payload.ref || 'tag';
        return { ...base, verb: 'released', tag, note: `Tagged ${tag} in ${project.name}.` };
      }
      if (ev.payload.ref_type === 'repository') {
        return { ...base, verb: 'shipped', tag: 'new', note: `Started a new project: ${project.name}.` };
      }
      return null;
    }
    case 'PullRequestEvent': {
      if (ev.payload.action !== 'closed' || !ev.payload.pull_request?.merged) return null;
      const num = ev.payload.pull_request.number;
      return { ...base, verb: 'shipped', tag: num ? `#${num}` : 'merged', note: ev.payload.pull_request.title || `Merged a pull request into ${project.name}.` };
    }
    case 'PublicEvent':
      return { ...base, verb: 'shipped', tag: 'open-source', note: `Open-sourced ${project.name}.` };
    default:
      return null;
  }
}

async function fetchActivityFor(creator: Creator): Promise<ActivityItem[]> {
  const [repos, events] = await Promise.all([
    ghJson<GhRepo[]>(`/users/${creator.handle}/repos?per_page=100&sort=pushed&type=owner`).catch(() => []),
    ghJson<GhEvent[]>(`/users/${creator.handle}/events/public?per_page=30`).catch(() => []),
  ]);
  const repoMap = new Map<string, Project>();
  for (const r of repos) repoMap.set(r.full_name.toLowerCase(), mapRepo(r));

  const items: ActivityItem[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const project = repoMap.get((ev.repo?.name || '').toLowerCase());
    if (!project) continue; // only surface activity on their own repos (full data)
    const mapped = mapEvent(ev, creator, project);
    if (!mapped) continue;
    const key = `${project.id}:${ev.type}`;
    if (seen.has(key)) continue; // dedupe repeated events of the same kind per repo
    seen.add(key);
    items.push(mapped);
  }
  return items;
}

export interface FeedData {
  creators: Record<string, Creator>;
  followed: string[];
  suggested: string[];
  activity: ActivityItem[];
}

/**
 * Build the feed. With follows, the timeline is the followed makers' activity;
 * with none, it falls back to the suggested community. The left rail needs
 * profiles for both the followed and suggested handles.
 */
export async function fetchFeed(following: string[], scope: 'following' | 'all' = 'following'): Promise<FeedData> {
  const followed = following.slice();
  const suggested = SUGGESTED_CREATORS.filter((h) => !following.includes(h)).slice(0, 5);
  // Pull from more sources than we show on the left, since activity yield per
  // maker varies (some recent activity is all on other people's repos).
  // "Everyone" scope always shows the wider community; "following" prefers your
  // follows (falling back to the community when you follow no one).
  const activitySources = (scope === 'all' || followed.length === 0 ? SUGGESTED_CREATORS : followed).slice(0, 8);

  const railHandles = Array.from(new Set([...followed, ...suggested]));
  const [railCreators, sourceCreators] = await Promise.all([
    fetchUsers(railHandles),
    fetchUsers(activitySources),
  ]);

  const creators: Record<string, Creator> = {};
  for (const c of [...railCreators, ...sourceCreators]) creators[c.handle] = c;

  const lists = await Promise.all(
    sourceCreators.map((c) => fetchActivityFor(c).catch(() => [] as ActivityItem[])),
  );
  const activity = lists.flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);

  return { creators, followed, suggested, activity };
}
