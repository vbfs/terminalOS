// Ensures node-pty's spawn-helper has execute permission after install.
// When node-pty uses its prebuilt binaries (no node-gyp rebuild), the
// spawn-helper file may land without the execute bit, causing posix_spawnp
// to fail with EACCES at runtime on macOS/Linux.
const fs = require('fs');
const path = require('path');

const spawnHelper = path.join(
  __dirname, '..', 'node_modules', 'node-pty', 'prebuilds',
  `${process.platform}-${process.arch}`, 'spawn-helper'
);

try {
  if (fs.existsSync(spawnHelper)) {
    fs.chmodSync(spawnHelper, 0o755);
    console.log('[terminalos] Fixed spawn-helper permissions:', spawnHelper);
  }
} catch (_) {
  // Non-fatal: node-gyp build path will be used instead
}
