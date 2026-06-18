// electron-builder afterPack hook. node-pty's `spawn-helper` must be
// executable inside the packaged app (it's unpacked from the asar), otherwise
// pty spawns fail with "posix_spawnp failed". Restore +x on any we find.

const { readdirSync, chmodSync } = require('node:fs');
const { join } = require('node:path');

/** @param {{ appOutDir: string }} context */
exports.default = async function afterPack(context) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'spawn-helper') found.push(p);
    }
  };
  walk(context.appOutDir);

  for (const f of found) {
    try {
      chmodSync(f, 0o755);
      console.log(`[trove] chmod +x ${f}`);
    } catch (err) {
      console.warn(`[trove] could not chmod ${f}:`, err.message);
    }
  }
};
