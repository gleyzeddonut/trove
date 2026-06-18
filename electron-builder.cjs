// electron-builder configuration. Kept in JS (not package.json) so notarization
// can be enabled only when signing credentials are present in the environment —
// no Apple secrets or Team ID live in the repo.

const { default: afterPack } = require('./scripts/afterPack.cjs');

// Notarize only when credentials are supplied. @electron/notarize reads the
// Apple ID / app-specific password (or API key) from the environment; the Team
// ID comes from APPLE_TEAM_ID.
const teamId = process.env.APPLE_TEAM_ID;
const hasNotaryCreds = !!(process.env.APPLE_API_KEY || process.env.APPLE_ID);
const notarize = teamId && hasNotaryCreds ? { teamId } : false;

// Where in-app updates are published / fetched from (GitHub Releases). Set
// GH_OWNER (and optionally GH_REPO) when building so the feed points at your
// repo; this gets embedded as app-update.yml inside the app.
const publish = {
  provider: 'github',
  owner: process.env.GH_OWNER || 'gleyzeddonut',
  repo: process.env.GH_REPO || 'trove',
};

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.trove.desktop',
  productName: 'Trove',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: ['dist/**/*', 'dist-electron/**/*', 'package.json'],
  publish,
  // node-pty ships native binaries that must live outside the asar.
  asarUnpack: ['**/node_modules/node-pty/**'],
  // Restores +x on node-pty's spawn-helper before signing.
  afterPack,
  mac: {
    target: [
      { target: 'dmg', arch: 'arm64' },
      { target: 'zip', arch: 'arm64' },
    ],
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize,
  },
};
