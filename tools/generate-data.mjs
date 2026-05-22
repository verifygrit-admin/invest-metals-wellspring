// tools/generate-data.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extract } from './extract-data.mjs';

const d = extract();
const dir = new URL('../data/', import.meta.url);
const write = (name, obj) =>
  writeFileSync(fileURLToPath(new URL(name, dir)), JSON.stringify(obj, null, 2) + '\n');

// ---- seven static files (Goal 1) ----
write('metals.json',      { metals: d.METALS, groups: d.GROUPS, data: d.DATA });
write('worldmap.json',    { countries: d.COUNTRIES, worldPaths: d.WORLD_PATHS, flows: d.FLOWS });
write('matrix.json',      { actors: d.ACTORS, levers: d.LEVERS, matrix: d.MATRIX, reading: d.MATRIX_READING });
write('strategy.json',    { families: d.STRATEGY_FAMILIES, strategies: d.STRATEGIES });
write('instruments.json', { baskets: d.BASKETS, instruments: d.INSTRUMENTS });
write('projection.json',  d.PROJECTION);
write('winlose.json',     d.WINLOSE);

// ---- two feed placeholders (Goal 4) — implemented in Task 6 ----
// prices.json and news.json are added to this generator in Task 6.

console.log('Static data files generated.');
