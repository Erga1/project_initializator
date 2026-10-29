const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

if (!fs.existsSync('.git')) {
  console.log('No Git repository found; skipping Git hook setup.');
  process.exit(0);
}

const executable = process.platform === 'win32' ? 'husky.cmd' : 'husky';
const result = spawnSync(executable, [], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
