// tools/validate-all.mjs — validates each data file against its schema via ajv-cli.
import { execFileSync } from 'node:child_process';

const FILES = [
  'metals', 'worldmap', 'matrix', 'strategy', 'instruments',
  'projection', 'winlose', 'prices', 'news'
];
let failed = false;
for (const name of FILES) {
  try {
    execFileSync('npx', ['ajv', 'validate', '-s', `schemas/${name}.schema.json`, '-d', `data/${name}.json`],
      { stdio: 'inherit', shell: process.platform === 'win32' });
  } catch {
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
