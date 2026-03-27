// Ensures node-pty's spawn-helper has execute permission after install.
// When node-pty uses its prebuilt binaries (no node-gyp rebuild), the
// spawn-helper file may land without the execute bit, causing posix_spawnp
// to fail with EACCES at runtime on macOS/Linux.
// We fix ALL prebuilds subdirectories so that arm64/x64 mismatches (e.g.
// conda Rosetta environments) are covered regardless of which Node arch ran
// postinstall.
const fs = require('fs');
const path = require('path');

try {
  // Use require.resolve so we find the actual node-pty location regardless of
  // whether npm hoisted it (npx cache) or left it nested (local node_modules).
  const nodePtyRoot = path.dirname(require.resolve('node-pty/package.json'));
  const prebuildsDir = path.join(nodePtyRoot, 'prebuilds');
  if (fs.existsSync(prebuildsDir)) {
    for (const dir of fs.readdirSync(prebuildsDir)) {
      const spawnHelper = path.join(prebuildsDir, dir, 'spawn-helper');
      if (fs.existsSync(spawnHelper)) {
        fs.chmodSync(spawnHelper, 0o755);
      }
    }
  }
} catch (_) {
  // Non-fatal: node-gyp build path will be used instead
}
