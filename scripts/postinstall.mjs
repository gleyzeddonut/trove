// node-pty ships prebuilt binaries for macOS/Windows, but its `spawn-helper`
// executable can land without the executable bit, which makes pty spawns fail
// with "posix_spawnp failed". Restore +x after every install.
//
// The prebuilt .node binaries are N-API based and load under both Node and
// Electron, so no native rebuild is normally needed.

import { chmodSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const base = join(process.cwd(), 'node_modules', 'node-pty', 'prebuilds');
if (existsSync(base)) {
  for (const dir of readdirSync(base)) {
    const helper = join(base, dir, 'spawn-helper');
    if (existsSync(helper)) {
      try {
        chmodSync(helper, 0o755);
      } catch (e) {
        console.warn(`[trove] could not chmod ${helper}:`, e.message);
      }
    }
  }
}
