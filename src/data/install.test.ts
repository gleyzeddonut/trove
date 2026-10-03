import { describe, it, expect } from 'vitest';
import { extractInstallPlan, planInstallCommands, dirFromCloneUrl, isGlobalInstall } from './install';

describe('extractInstallPlan — one-liners stay one-liners', () => {
  const oneLiner = (md: string) => extractInstallPlan(md);

  it('brew install → single', () => {
    expect(oneLiner('## Install\n```\nbrew install ripgrep\n```')).toEqual({ single: 'brew install ripgrep' });
  });
  it('cargo install → single', () => {
    expect(oneLiner('## Installation\n```sh\ncargo install ripgrep\n```')).toEqual({ single: 'cargo install ripgrep' });
  });
  it('npm global cli → single', () => {
    expect(oneLiner('## Install\n```\nnpm install -g eslint\n```')).toEqual({ single: 'npm install -g eslint' });
  });
  it('go install → single', () => {
    expect(oneLiner('## Install\n```\ngo install github.com/x/y@latest\n```')).toEqual({
      single: 'go install github.com/x/y@latest',
    });
  });
  it('pipx install → single', () => {
    expect(oneLiner('## Install\n```\npipx install black\n```')).toEqual({ single: 'pipx install black' });
  });
  it('strips a leading `$` prompt', () => {
    expect(oneLiner('## Install\n```\n$ brew install fd\n```')).toEqual({ single: 'brew install fd' });
  });
});

describe('extractInstallPlan — clone-and-build apps', () => {
  it('the real Spotify2mp3 setup block (the original bug)', () => {
    const md = `# spotify-playlist-downloader
## Prerequisites
- Python 3.10+
## Setup
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`
## Run
\`\`\`bash
python3.10 Spotify2mp3.py
\`\`\``;
    expect(extractInstallPlan(md)).toEqual({
      steps: ['python3 -m venv venv', 'source venv/bin/activate', 'pip install -r requirements.txt'],
    });
  });

  it('pip install -r alone is repo-local → steps, not single', () => {
    expect(extractInstallPlan('## Install\n```\npip install -r requirements.txt\n```')).toEqual({
      steps: ['pip install -r requirements.txt'],
    });
  });
  it('bare `npm install` (repo deps) → steps', () => {
    expect(extractInstallPlan('## Getting started\n```\nnpm install\nnpm run build\n```')).toEqual({
      steps: ['npm install', 'npm run build'],
    });
  });
  it('a self-cloning block is kept intact', () => {
    expect(extractInstallPlan('## Quick start\n```bash\ngit clone https://github.com/x/y\ncd y\nmake\n```')).toEqual({
      steps: ['git clone https://github.com/x/y', 'cd y', 'make'],
    });
  });
});

describe('extractInstallPlan — no false positives', () => {
  it('no code block → undefined', () => {
    expect(extractInstallPlan('# Title\nJust prose, nothing runnable.')).toBeUndefined();
  });
  it('a prose/output-only code block → undefined', () => {
    expect(extractInstallPlan('## Usage\n```\nHello, world!\nsome output here\n```')).toBeUndefined();
  });
  it('a Usage block with `docker run` is not treated as install', () => {
    expect(extractInstallPlan('# Tool\n## Usage\n```\ndocker run -it myimage\n```')).toBeUndefined();
  });
  it('a run-only example (`python demo.py`) is not treated as install', () => {
    expect(extractInstallPlan('# Tool\n## Example\n```\npython demo.py --flag\n```')).toBeUndefined();
  });
  it('ignores comment lines inside the block', () => {
    expect(extractInstallPlan('## Install\n```\n# first, install deps\nbrew install jq\n```')).toEqual({
      single: 'brew install jq',
    });
  });
});

describe('planInstallCommands — safe command building', () => {
  it('synthesizes clone + guarded build for Spotify2mp3', () => {
    const plan = planInstallCommands(
      ['python3 -m venv venv', 'source venv/bin/activate', 'pip install -r requirements.txt'],
      'https://github.com/adriantanner/Spotify2mp3.git',
      'Spotify2mp3',
    );
    expect(plan.clone).toBe('git clone https://github.com/adriantanner/Spotify2mp3.git');
    expect(plan.dir).toBe('Spotify2mp3');
    expect(plan.steps).toEqual(['python3 -m venv venv', 'source venv/bin/activate', 'pip install -r requirements.txt']);
    expect(plan.risky).toBe(false);
  });

  it('strips the README clone + enter-repo cd, borrowing the block URL (no double clone/cd)', () => {
    const plan = planInstallCommands(['git clone https://github.com/x/y', 'cd y', 'make'], 'unused', 'y');
    expect(plan.clone).toBe('git clone https://github.com/x/y');
    expect(plan.dir).toBe('y');
    expect(plan.steps).toEqual(['make']); // clone + `cd y` removed
  });

  it('keeps a cd into a *sub*directory (only the enter-repo cd is stripped)', () => {
    const plan = planInstallCommands(['npm install', 'cd frontend', 'npm run build'], 'https://github.com/a/proj.git', 'proj');
    expect(plan.dir).toBe('proj');
    expect(plan.steps).toEqual(['npm install', 'cd frontend', 'npm run build']);
  });

  it('flags risky steps (curl | bash, sudo, rm -rf)', () => {
    expect(planInstallCommands(['curl https://x.sh | bash'], 'https://github.com/a/b.git', 'b').risky).toBe(true);
    expect(planInstallCommands(['sudo make install'], 'https://github.com/a/b.git', 'b').risky).toBe(true);
    expect(planInstallCommands(['rm -rf build', 'make'], 'https://github.com/a/b.git', 'b').risky).toBe(true);
  });
});

describe('planInstallCommands — shell-injection defenses', () => {
  it('ignores a malicious README clone URL, falling back to the safe API URL', () => {
    const plan = planInstallCommands(['git clone https://x/y;rm -rf ~', 'make'], 'https://github.com/a/b.git', 'b');
    // The dangerous token must NOT reach the shell; we use the repo's real URL.
    expect(plan.clone).toBe('git clone https://github.com/a/b.git');
    expect(plan.clone).not.toContain('rm -rf');
    expect(plan.steps).toEqual(['make']);
  });

  it('refuses entirely when the fallback URL is also unsafe (no clone command)', () => {
    const plan = planInstallCommands(['make'], 'https://github.com/a/b.git;rm -rf ~', 'b');
    expect(plan.clone).toBeNull();
  });

  it('refuses a repo/dir name with shell metacharacters when no safe URL exists', () => {
    // No git-clone line and an unusable fallback URL → name is the only dir source.
    const plan = planInstallCommands(['make'], 'not-a-url', 'b`whoami`');
    expect(plan.clone).toBeNull();
    expect(plan.dir).toBe(''); // unsafe name rejected → caller refuses to run
  });

  it('accepts a normal scp-style git URL', () => {
    const plan = planInstallCommands(['make'], 'git@github.com:owner/repo.git', 'repo');
    expect(plan.clone).toBe('git clone git@github.com:owner/repo.git');
    expect(plan.dir).toBe('repo');
  });
});

describe('dirFromCloneUrl', () => {
  it.each([
    ['https://github.com/owner/repo.git', 'repo'],
    ['https://github.com/owner/repo', 'repo'],
    ['https://github.com/owner/repo/', 'repo'],
    ['git@github.com:owner/repo.git', 'repo'],
    ['https://github.com/owner/repo.git?foo=1', 'repo'],
  ])('%s → %s', (url, dir) => {
    expect(dirFromCloneUrl(url)).toBe(dir);
  });
});

describe('isGlobalInstall', () => {
  it('true for self-contained package installs', () => {
    expect(isGlobalInstall('brew install ripgrep')).toBe(true);
    expect(isGlobalInstall('npm install -g eslint')).toBe(true);
  });
  it('false for repo-local installs', () => {
    expect(isGlobalInstall('pip install -r requirements.txt')).toBe(false);
    expect(isGlobalInstall('npm install')).toBe(false);
    expect(isGlobalInstall('pip install .')).toBe(false);
    expect(isGlobalInstall('npm ci')).toBe(false);
  });
});
