// test/roundtrip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extract } from '../tools/extract-data.mjs';

// Normalize the extracted constants through JSON: extract() returns objects from
// a vm realm whose Object.prototype differs from this realm's, which trips
// deepStrictEqual's prototype check. JSON-normalizing makes the comparison exactly
// the round-trip property under test — committed file === JSON of the constant.
const data = JSON.parse(JSON.stringify(extract()));
const read = name => JSON.parse(readFileSync(fileURLToPath(new URL(`../data/${name}`, import.meta.url)), 'utf8'));

test('metals.json round-trips data.js constants', () => {
  const f = read('metals.json');
  assert.deepEqual(f.metals, data.METALS);
  assert.deepEqual(f.groups, data.GROUPS);
  assert.deepEqual(f.data, data.DATA);
});

test('worldmap.json round-trips worldmap.js constants', () => {
  const f = read('worldmap.json');
  assert.deepEqual(f.countries, data.COUNTRIES);
  assert.deepEqual(f.worldPaths, data.WORLD_PATHS);
  assert.deepEqual(f.flows, data.FLOWS);
});

test('matrix.json round-trips matrix.js constants', () => {
  const f = read('matrix.json');
  assert.deepEqual(f.actors, data.ACTORS);
  assert.deepEqual(f.levers, data.LEVERS);
  assert.deepEqual(f.matrix, data.MATRIX);
  assert.deepEqual(f.reading, data.MATRIX_READING);
});

test('strategy.json round-trips strategy.js constants', () => {
  const f = read('strategy.json');
  assert.deepEqual(f.families, data.STRATEGY_FAMILIES);
  assert.deepEqual(f.strategies, data.STRATEGIES);
});

test('instruments.json round-trips terminal.js INSTRUMENTS + BASKETS verbatim', () => {
  const f = read('instruments.json');
  assert.deepEqual(f.baskets, data.BASKETS);
  assert.deepEqual(f.instruments, data.INSTRUMENTS); // keeps chg/price
});

test('projection.json round-trips terminal.js PROJECTION', () => {
  assert.deepEqual(read('projection.json'), data.PROJECTION);
});

test('winlose.json round-trips terminal.js WINLOSE', () => {
  assert.deepEqual(read('winlose.json'), data.WINLOSE);
});

test('prices.json uses `change` (A1) and covers every non-note ticker', () => {
  const f = read('prices.json');
  assert.equal(f.source, 'seed');
  assert.ok(f.asOf);
  // build the expected ticker set from the prototype
  const expected = new Set();
  for (const list of Object.values(data.INSTRUMENTS))
    for (const ins of list) if (ins.type !== 'note' && ins.price != null) expected.add(ins.ticker);
  assert.deepEqual(new Set(Object.keys(f.prices)), expected);
  // spot-check the rename + value fidelity
  assert.deepEqual(f.prices.GLD, { price: 272.40, change: 0.6 });
  for (const v of Object.values(f.prices)) {
    assert.ok('change' in v && !('chg' in v), 'overlay must use `change`, never `chg`');
  }
});

test('news.json carries 12 events with A2 seed fields', () => {
  const f = read('news.json');
  assert.equal(f.events.length, 12);
  for (const ev of f.events) {
    assert.equal(ev.source, 'seed');
    assert.equal(ev.tagStatus, 'reviewed');
  }
  // payload fidelity: stripping the two added fields reproduces the prototype event
  f.events.forEach((ev, i) => {
    const { source, tagStatus, ...rest } = ev;
    assert.deepEqual(rest, data.NEWS[i]);
  });
});
