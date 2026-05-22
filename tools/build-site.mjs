// Assemble the deploy artifact locally (cross-platform mirror of deploy.yml).
// deploy.yml runs: cp -r app/. _site/ && cp -r data/. _site/data/
// This reproduces that layout so index.html and data/ are siblings under _site/.
import { rmSync, mkdirSync, cpSync } from 'node:fs';

rmSync('_site', { recursive: true, force: true });
mkdirSync('_site/data', { recursive: true });
cpSync('app', '_site', { recursive: true });
cpSync('data', '_site/data', { recursive: true });
console.log('Assembled _site/ (app + data).');
