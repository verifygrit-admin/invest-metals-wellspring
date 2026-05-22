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

// ---- prices.json (A1): ticker-keyed overlay, `change` not `chg`, non-note tickers only ----
const ASOF = '2026-05-22T00:00:00Z';
const prices = {};
for (const list of Object.values(d.INSTRUMENTS)) {
  for (const ins of list) {
    if (ins.type === 'note' || ins.price == null) continue; // skip note rows
    if (prices[ins.ticker]) continue;                        // dedupe across metals
    prices[ins.ticker] = { price: ins.price, change: ins.chg }; // chg -> change
  }
}
write('prices.json', { asOf: ASOF, source: 'seed', prices });

// ---- news.json (A2): 12 events verbatim + source/tagStatus ----
const events = d.NEWS.map(ev => ({ ...ev, source: 'seed', tagStatus: 'reviewed' }));
write('news.json', { asOf: ASOF, events });

console.log('Static data files generated.');
