// tools/generate-data.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extract } from './extract-data.mjs';

const d = extract();
const dir = new URL('../data/', import.meta.url);
const write = (name, obj) =>
  writeFileSync(fileURLToPath(new URL(name, dir)), JSON.stringify(obj, null, 2) + '\n');

// ---- seven static files (Goal 1) — DATA-SYSTEM.md §2.1 split ----
// metals.json = METALS + COUNTRIES + DATA + FLOWS; worldmap.json = geometry only.
write('metals.json',      { metals: d.METALS, groups: d.GROUPS, data: d.DATA, countries: d.COUNTRIES, flows: d.FLOWS });
write('worldmap.json',    { worldPaths: d.WORLD_PATHS });
write('matrix.json',      { actors: d.ACTORS, levers: d.LEVERS, matrix: d.MATRIX, reading: d.MATRIX_READING });
write('strategy.json',    { families: d.STRATEGY_FAMILIES, strategies: d.STRATEGIES });
write('instruments.json', { baskets: d.BASKETS, instruments: d.INSTRUMENTS });
write('projection.json',  d.PROJECTION);
write('winlose.json',     d.WINLOSE);

// ---- prices.json (A1): flat array of §3 records; `change` not `chg`; non-note tickers ----
const ASOF = '2026-05-22T00:00:00Z';
const seen = new Set();
const prices = [];
for (const list of Object.values(d.INSTRUMENTS)) {
  for (const ins of list) {
    if (ins.type === 'note' || ins.price == null) continue; // skip assessed/no-ticker note rows
    if (seen.has(ins.ticker)) continue;                      // dedupe across metals
    seen.add(ins.ticker);
    prices.push({
      ticker: ins.ticker, price: ins.price, change: ins.chg, // chg -> change
      currency: 'USD', asOf: ASOF, source: 'seed',
      isLive: ins.price != null                              // true for real-price tickers
    });
  }
}
write('prices.json', prices);

// ---- news.json (A2): flat array of §3 records; backfill url:"" + source/tagStatus ----
const news = d.NEWS.map(ev => ({
  id: ev.id, date: ev.date, headline: ev.headline, excerpt: ev.excerpt,
  url: '', source: 'seed',
  metals: ev.metals, strategies: ev.strategies, lever: ev.lever, actors: ev.actors,
  impact: ev.impact, tagStatus: 'reviewed'
}));
write('news.json', news);

console.log('Static data files generated.');
