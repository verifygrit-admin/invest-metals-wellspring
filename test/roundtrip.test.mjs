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

test('metals.json round-trips data.js constants (METALS + COUNTRIES + DATA + FLOWS)', () => {
  const f = read('metals.json');
  assert.deepEqual(f.metals, data.METALS);
  assert.deepEqual(f.groups, data.GROUPS);
  assert.deepEqual(f.data, data.DATA);
  assert.deepEqual(f.countries, data.COUNTRIES);
  assert.deepEqual(f.flows, data.FLOWS);
});

test('worldmap.json round-trips worldmap.js geometry only', () => {
  const f = read('worldmap.json');
  assert.deepEqual(f.worldPaths, data.WORLD_PATHS);
  assert.ok(!('countries' in f) && !('flows' in f), 'worldmap.json is geometry only');
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

test('prices.json is a flat array of §3 records using `change` (A1)', () => {
  const f = read('prices.json');
  assert.ok(Array.isArray(f), 'prices.json must be a flat array (§3)');
  // covers every non-note ticker from the prototype
  const expected = new Set();
  for (const list of Object.values(data.INSTRUMENTS))
    for (const ins of list) if (ins.type !== 'note' && ins.price != null) expected.add(ins.ticker);
  assert.deepEqual(new Set(f.map(r => r.ticker)), expected);
  // §3 record shape + value fidelity
  const gld = f.find(r => r.ticker === 'GLD');
  assert.deepEqual(gld, {
    ticker: 'GLD', price: 272.40, change: 0.6, currency: 'USD',
    asOf: '2026-05-22T00:00:00Z', source: 'seed', isLive: true
  });
  for (const r of f) {
    assert.ok('change' in r && !('chg' in r), 'records must use `change`, never `chg`');
    assert.equal(r.currency, 'USD');
    assert.equal(r.source, 'seed');
    assert.equal(typeof r.isLive, 'boolean');
    assert.ok(r.asOf);
  }
});

test('news.json is a flat array of §3 records with A2 seed fields', () => {
  const f = read('news.json');
  assert.ok(Array.isArray(f), 'news.json must be a flat array (§3)');
  assert.equal(f.length, 12);
  const required = ['id', 'date', 'headline', 'excerpt', 'url', 'source',
    'metals', 'strategies', 'lever', 'actors', 'impact', 'tagStatus'];
  f.forEach((ev, i) => {
    for (const k of required) assert.ok(k in ev, `event ${i} missing ${k}`);
    assert.equal(ev.source, 'seed');
    assert.equal(ev.tagStatus, 'reviewed');
    assert.equal(ev.url, '');
    // payload fidelity vs prototype event
    const orig = data.NEWS[i];
    assert.equal(ev.id, orig.id);
    assert.equal(ev.date, orig.date);
    assert.equal(ev.headline, orig.headline);
    assert.equal(ev.excerpt, orig.excerpt);
    assert.deepEqual(ev.metals, orig.metals);
    assert.deepEqual(ev.strategies, orig.strategies);
    assert.equal(ev.lever, orig.lever);
    assert.deepEqual(ev.actors, orig.actors);
    assert.equal(ev.impact, orig.impact);
  });
});
