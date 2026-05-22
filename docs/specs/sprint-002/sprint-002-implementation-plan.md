# Sprint 002 — JSON Store Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the prototype's inline data into a flat-file JSON store under `/data`, refactor the app to fetch it at load, guard it with a CI JSON-schema check, and commit seed `prices.json` / `news.json` feed placeholders — with the deployed dashboard remaining **visually identical to the Sprint 1 deploy**.

**Architecture:** The prototype `app/index.html` carries all data as inline `const` declarations across five `<script>` blocks. We extract those constants **programmatically** (evaluate the data blocks in a Node `vm` sandbox — they have no DOM dependencies) and serialize them to seven static JSON files plus two feed-placeholder files. The app's data `const`s become `let` bindings populated by a single `Promise.all` fetch at load; all render functions are unchanged and continue to read the same global names. Validation is `ajv-cli` against per-file JSON Schemas, run in a new CI workflow.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no bundler — same as prototype); Node 20 + `node:test` + `node:vm` for transcription/round-trip tooling; `ajv-cli` (`ajv@8`) for schema validation; GitHub Actions for CI; existing GitHub Pages deploy workflow.

---

## Source-of-truth findings (read before starting)

These ground every task. Verify them yourself before transcribing.

1. **There are no `.js` module files.** The names `data.js`, `matrix.js`, `strategy.js`, `terminal.js`, `worldmap.js` in the spec are *conceptual* — they map to inline `<script>` blocks in `app/index.html`. The block boundaries (line numbers as of this plan):
   | Conceptual module | `index.html` block | Constants defined |
   |---|---|---|
   | `data.js` | block 1 (~L656–1111) | `METALS`, `GROUPS`, `DATA`, plus `COUNTRIES` and `FLOWS` (see note) |
   | `worldmap.js` | block 5 (~L2174–2202) + `COUNTRIES`/`FLOWS` from block 1 | `WORLD_PATHS`, `COUNTRIES`, `FLOWS` |
   | `matrix.js` | block 2 (~L1115–1323) | `ACTORS`, `LEVERS`, `MATRIX`, `MATRIX_READING` |
   | `strategy.js` | block 3 (~L1327–1636) | `STRATEGY_FAMILIES`, `STRATEGIES` (`STRATEGY_INDEX` is runtime-derived) |
   | `terminal.js` | block 4 (~L1640–2170) | `BASKETS`, `INSTRUMENTS`, `PROJECTION`, `NEWS`, `WINLOSE` |
   | render/init | block 6 (~L2206–3060) | `project()`, `refresh()`, all `render*()`, event wiring — **DOM-dependent; not extracted** |

2. **`COUNTRIES` and `FLOWS` live in block 1 but are geographic.** Decision baked into this plan: they go to `worldmap.json`, not `metals.json`. Rationale: the map view is the only consumer of `WORLD_PATHS`, `COUNTRIES`, and `FLOWS`; grouping them keeps each file single-responsibility. This is a grouping decision, not a structural change — every field is preserved verbatim. (Flagged in the open-decisions section below as a low-risk grouping choice.)

3. **`terminal.js` splits four ways, not three.** `INSTRUMENTS`+`BASKETS` → `instruments.json`; `PROJECTION` → `projection.json`; `WINLOSE` → `winlose.json` (these three are part of the seven static files). `NEWS` → `news.json` (a Goal-4 feed file, not one of the seven). This matches spec §3 Goal 1 ("terminal.js → instruments/projection/winlose") with `NEWS` correctly routed to the feed layer.

4. **The literal JSON shapes ("Data System Note §3") are not committed to this repo.** `docs/specs/sprint-002/sprint-002-spec.md` is byte-identical to `sprint-002-operator-outline.md` (confirmed by diff) and *references* Data System Note §3 / Product Spec §6 without reproducing them. Therefore the **prototype constants are the canonical shape**, and the two documented transforms below are the only deviations. CF-2/CF-3 are "resolved" by encoding them here as exact field specs.

5. **A1 (CF-2) — price overlay + `chg`→`change`.** `prices.json` is a ticker-keyed overlay using the field name **`change`** (the prototype's `INSTRUMENTS[].chg`). `instruments.json` is transcribed **verbatim** (keeps `chg`/`price`) so its round-trip test stays honest. In Sprint 2 the app renders prices from `instruments.json` (visual identity); `prices.json` is fetched-but-not-rendered (Sprint 3 wires the overlay merge and strips the duplicate). See open-decision D1.

6. **A2 (CF-3) — news seed.** `news.json` carries all 12 prototype `NEWS` events verbatim, each with two added fields: `source: "seed"` and `tagStatus: "reviewed"`. The news dock **does** render from `news.json` (news is a live view), so the extra fields must be ignored by the render path — they are (the renderer reads only `id/date/metals/headline/excerpt/strategies/lever/actors/impact`).

7. **Deploy path is settled (A3 closed).** `.github/workflows/deploy.yml` runs `cp -r data/. _site/data/`, so at deploy time `index.html` and `data/` are siblings in `_site/`. Fetch base is therefore `data` (relative). Locally they are **not** siblings (`app/index.html` vs `data/`), so local verification must serve an assembled `_site/` (see Task 10).

8. **No `package.json` exists yet.** Node tooling is introduced in Task 0. `data/` contains only `.gitkeep`.

---

## File Structure

**Created:**
- `package.json` — Node tooling manifest (devDeps: `ajv-cli`; scripts: `validate`, `test`, `build:site`).
- `.gitignore` — ignore `node_modules/`, `_site/`.
- `tools/extract-data.mjs` — reads `app/index.html`, evaluates data blocks in a `vm` sandbox, returns the runtime constants. Single source of transcription truth (used by both the generator and the round-trip test).
- `tools/generate-data.mjs` — calls the extractor and writes the 9 JSON files (applying the A1/A2 transforms for the two feed files).
- `data/metals.json`, `data/worldmap.json`, `data/matrix.json`, `data/strategy.json`, `data/instruments.json`, `data/projection.json`, `data/winlose.json` — the seven static files (Goal 1).
- `data/prices.json`, `data/news.json` — the two feed placeholders (Goal 4).
- `schemas/metals.schema.json` … `schemas/news.schema.json` — nine JSON Schemas (seven static + two feed).
- `test/roundtrip.test.mjs` — `node:test` round-trip assertions (Goal 1 acceptance).
- `test/negative.test.mjs` — asserts a malformed fixture fails validation (Goal 3 negative case).
- `test/fixtures/metals.invalid.json` — deliberately malformed file for the negative test.
- `.github/workflows/validate.yml` — CI: install, validate all 9 files against schemas, run tests.

**Modified:**
- `app/index.html` — block 6 gains a `DATA_BASE` constant and an async `init()` doing `Promise.all` fetch; blocks 1–5's inline `const` data literals are removed and replaced by `let` bindings assigned in `init()`. Render functions unchanged.
- `README.md` — note the data-driven architecture and local-dev serve step.
- `docs/specs/sprint-002/sprint-002-spec.md` — append the §10 revision-log entry at sprint close (housekeeping).

**Untouched:** `.github/workflows/deploy.yml` (spec §5 — deploy workflow otherwise unchanged), all CSS, all render functions.

---

## Exact JSON shapes (the contract this sprint freezes)

Field names and nesting are transcribed verbatim from the prototype except where A1/A2 are noted. Counts: 15 metals, 4 groups, 29 countries, 12 world paths, 6 actors, 5 levers, 9 strategies, 4 baskets, 12 news events.

**`metals.json`** — DATA-SYSTEM.md §2.1: `metals.json` = METALS + COUNTRIES + DATA + FLOWS (groups carried alongside).
```json
{
  "metals": {
    "silver": { "name": "Silver", "symbol": "Ag", "group": "precious", "price": 31.5, "priceUnit": "USD/oz", "priceYoY": 21.0, "demandYoY": 2.5, "note": "Hybrid metal: …" }
  },
  "groups": { "precious": { "label": "Precious", "color": "#d4a843" } },
  "data": {
    "silver": {
      "extraction":  { "Mexico": 24, "China": 14 },
      "processing":  { "China": 38 },
      "application": { "China": 30 },
      "owners": { "Mexico": { "extraction": ["Fresnillo plc", "Industrias Peñoles"] } }
    }
  },
  "countries": { "China": { "lon": 104, "lat": 35, "label": "China" } },
  "flows": { "silver": [ { "from": "Mexico", "to": "USA", "weight": 7 } ] }
}
```

**`worldmap.json`** — DATA-SYSTEM.md §2.1: geometry only.
```json
{
  "worldPaths": [ "M150,66 L252,58 L304,74 …Z" ]
}
```

**`matrix.json`**
```json
{
  "actors": { "prodState": { "label": "…", "short": "State producers", "desc": "…" } },
  "levers": { "physical": { "label": "Physical supply", "desc": "…", "vectors": ["extraction", "processing"] } },
  "matrix": { "gold": { "prodState": { "physical": 1, "tradePolicy": 0, "offtake": 0 } } },
  "reading": { "gold": "Movers cluster in the financial …" }
}
```

**`strategy.json`** (note: prototype string-concatenations resolve to single strings)
```json
{
  "families": { "pricing": { "label": "Pricing strategies", "desc": "…", "color": "#5b9bd5" } },
  "strategies": {
    "exportControl": {
      "name": "Export licensing & controls", "family": "permission", "lever": "tradePolicy", "depth": "case",
      "mechanism": "A producing or refining state requires licenses for…",
      "whoUses": "Producer-states with processing dominance — overwhelmingly China.",
      "instances": [ { "date": "Jul–Aug 2023", "metals": ["gallium", "germanium"], "text": "China's Ministry of Commerce…" } ],
      "reading": "The defining permission strategy…"
    }
  }
}
```

**`instruments.json`** (verbatim — keeps `chg`, `price`; note-type rows keep `price: null, chg: null`)
```json
{
  "baskets": { "b_precious": { "name": "Precious basket", "group": "precious", "metals": ["gold", "silver", "platinum", "palladium", "rhodium"] } },
  "instruments": {
    "gold": [ { "ticker": "GLD", "name": "SPDR Gold Shares", "type": "etf-physical", "listing": "NYSE Arca", "price": 272.40, "chg": 0.6, "exposure": "Physically backed gold bullion." } ]
  }
}
```

**`projection.json`** (bare map keyed by metal)
```json
{ "gold": { "baseline": 1.5, "strategyImpact": 2, "actorLeverage": 3, "methodWeight": 2, "vol": 1, "basis": "Central-bank accumulation…" } }
```

**`winlose.json`** (bare map keyed by metal)
```json
{ "gold": { "near": { "winners": [ { "actor": "centralGov", "rationale": "Reserve diversification…" } ], "losers": [ { "actor": "endUser", "rationale": "…" } ] }, "mid": {}, "long": {} } }
```

**`prices.json`** — DATA-SYSTEM.md §3: flat **array** of records; `change` not `chg` (A1). Seeded from prototype `INSTRUMENTS` (non-note tickers, deduped); `currency:"USD"`, constant `asOf`, `source:"seed"`, `isLive:true` (all seed rows carry a real price).
```json
[
  { "ticker": "GLD", "price": 272.40, "change": 0.6, "currency": "USD", "asOf": "2026-05-22T00:00:00Z", "source": "seed", "isLive": true },
  { "ticker": "IAU", "price": 55.80, "change": 0.6, "currency": "USD", "asOf": "2026-05-22T00:00:00Z", "source": "seed", "isLive": true }
]
```

**`news.json`** — DATA-SYSTEM.md §3: flat **array** of records; 12 prototype events backfilled with `url:""`, `source:"seed"`, `tagStatus:"reviewed"` (A2).
```json
[
  { "id": "n1", "date": "2023-07-03", "headline": "China announces export licensing on gallium and germanium", "excerpt": "China's Ministry of Commerce…", "url": "", "source": "seed", "metals": ["gallium", "germanium"], "strategies": ["exportControl"], "lever": "tradePolicy", "actors": ["prodState", "centralGov"], "impact": 2, "tagStatus": "reviewed" }
]
```

---

## Open decisions (surface before/while executing — do not silently resolve)

These are flagged per the operating rules: architecture/shape calls route to Chris. The plan proceeds on the stated lean unless overridden.

- **D1 — Where price data lives in Sprint 2.** *Lean (this plan):* `instruments.json` keeps `price`/`chg` verbatim and the app renders from it; `prices.json` (using `change`) is fetched but not yet rendered. Sprint 3 wires the overlay merge and removes the duplicate from `instruments.json`. *Alternative:* strip `price`/`chg` from `instruments.json` now and render via the `prices.json` overlay merge immediately — but that breaks Goal 1's "no field lost" round-trip and pulls Sprint 3's merge layer forward. **Recommendation: lean.** Confirm.
- **D2 — `COUNTRIES`/`FLOWS` placement.** Lean: `worldmap.json` (see finding #2). Low-risk grouping; confirm it matches the unseen Data System Note §2.1 file split if that doc surfaces.
- **D3 — Schema count: 7 vs 9.** Spec §7 says "7 schema definitions" (the static set). Goal 4 says the feed files must be "valid against the §3 shapes" and that "the schema check [is] complete." This plan authors **9 schemas** (7 static + `prices` + `news`) so the feed placeholders are guarded too and Sprint 3/4 inherit them (spec §4 Q1). Flag if the operator wants the feed schemas deferred.

---

## Task 0: Node tooling scaffold

**Files:**
- Create: `package.json`, `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "invest-metals-tooling",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "node tools/generate-data.mjs",
    "validate": "node tools/validate-all.mjs",
    "test": "node --test",
    "build:site": "rm -rf _site && mkdir -p _site && cp -r app/. _site/ && cp -r data/. _site/data/",
    "serve": "npx --yes serve _site"
  },
  "devDependencies": {
    "ajv-cli": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
_site/
```

- [ ] **Step 3: Install and verify**

Run: `npm install`
Expected: `node_modules/` created, `ajv-cli` present (`npx ajv help` prints usage).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore(s2): scaffold Node tooling for JSON transcription and validation"
```

---

## Task 1: Extraction harness (the transcription engine)

This is the heart of Goal 1's fidelity guarantee. Instead of hand-copying ~1,500 lines of data (error-prone, the exact risk spec §6 names), we evaluate the prototype's own data blocks and read the runtime objects.

**Files:**
- Create: `tools/extract-data.mjs`

- [ ] **Step 1: Write the extractor**

```js
// tools/extract-data.mjs
// Evaluate the prototype's inline DATA <script> blocks in a vm sandbox and
// return the runtime constants. The five data blocks (blocks 1–5) have NO DOM
// dependencies; only block 6 (render/init) touches document, so we exclude it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HTML_PATH = fileURLToPath(new URL('../app/index.html', import.meta.url));

// Names defined by the data blocks that we want to capture.
const DATA_GLOBALS = [
  'METALS', 'GROUPS', 'COUNTRIES', 'DATA', 'FLOWS',          // data.js + worldmap.js
  'ACTORS', 'LEVERS', 'MATRIX', 'MATRIX_READING',            // matrix.js
  'STRATEGY_FAMILIES', 'STRATEGIES',                          // strategy.js
  'BASKETS', 'INSTRUMENTS', 'PROJECTION', 'NEWS', 'WINLOSE',  // terminal.js
  'WORLD_PATHS'                                               // worldmap.js
];

export function extract() {
  const html = readFileSync(HTML_PATH, 'utf8');
  // Pull every <script> block body.
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  // Keep only blocks that define data globals and do NOT reference the DOM.
  const dataBlocks = blocks.filter(b =>
    DATA_GLOBALS.some(g => new RegExp(`const\\s+${g}\\b`).test(b)) &&
    !/document\.|getElementById|addEventListener/.test(b)
  );
  if (dataBlocks.length === 0) throw new Error('No data blocks found — index.html structure changed.');

  const sandbox = {};
  vm.createContext(sandbox);
  // Expose captured consts: append assignments that lift them onto the context.
  const source = dataBlocks.join('\n;\n') + '\n;\n' +
    DATA_GLOBALS.map(g => `try{ globalThis.__out.${g}=${g}; }catch(e){}`).join('\n');
  sandbox.__out = {};
  vm.runInContext('var globalThis=this;' + source, sandbox, { timeout: 5000 });

  const out = sandbox.__out;
  for (const g of DATA_GLOBALS) {
    if (out[g] === undefined) throw new Error(`Expected global ${g} was not captured.`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = extract();
  console.log(Object.keys(data).map(k => `${k}: ok`).join('\n'));
}
```

- [ ] **Step 2: Run the extractor smoke test**

Run: `node tools/extract-data.mjs`
Expected: prints `METALS: ok`, `GROUPS: ok`, … `WORLD_PATHS: ok` (17 lines), no error.

> If a global is missing, the block-filter regex or block boundaries changed — inspect `app/index.html` and adjust the filter before continuing. Do not hand-edit captured data.

- [ ] **Step 3: Commit**

```bash
git add tools/extract-data.mjs
git commit -m "feat(s2): add vm-based extraction harness for prototype data blocks"
```

---

## Task 2: Generator + the seven static files + round-trip test (Goal 1 — FREEZE POINT)

**Files:**
- Create: `tools/generate-data.mjs`, `test/roundtrip.test.mjs`
- Create (generated): the 9 `data/*.json` files

- [ ] **Step 1: Write the round-trip test FIRST (it will fail — no JSON yet)**

```js
// test/roundtrip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extract } from '../tools/extract-data.mjs';

const data = extract();
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
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `node --test test/roundtrip.test.mjs`
Expected: FAIL — `ENOENT: no such file or directory … data/metals.json`.

- [ ] **Step 3: Write the generator (static files only in this task)**

```js
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
```

- [ ] **Step 4: Generate the files**

Run: `npm run generate`
Expected: `Static data files generated.` and seven new files under `data/`.

- [ ] **Step 5: Run the round-trip test — verify it passes**

Run: `node --test test/roundtrip.test.mjs`
Expected: PASS — 7 tests, 0 failures.

- [ ] **Step 6: Commit (Goal 1 freeze)**

```bash
git add tools/generate-data.mjs test/roundtrip.test.mjs data/metals.json data/worldmap.json data/matrix.json data/strategy.json data/instruments.json data/projection.json data/winlose.json
git commit -m "feat(s2): transcribe 5 prototype modules to 7 static JSON files (freeze-point)"
```

> **FREEZE POINT reached.** The seven shapes above are now the contract. After this commit, Goal 2 (Task 3–5), Goal 3 (Task 7–9), and Goal 4 (Task 6) may proceed in parallel — see "Parallel execution" below.

---

## Task 3: `DATA_BASE` constant + fetch the seven static files (Goal 2, part 1)

**Files:**
- Modify: `app/index.html` (block 6 init region, ~L2206–2222 and the `refresh()` call at ~L3060)

- [ ] **Step 1: Add `DATA_BASE` and an async `init()` that fetches and assigns**

At the **top of block 6** (immediately after `<script>` at ~L2206, before `const VB_W…`), the data globals currently defined inline in blocks 1–5 must become reassignable bindings. Add:

```js
/* ---------- data layer (Sprint 2: fetched from /data) ---------- */
const DATA_BASE = 'data'; // siblings of index.html at deploy time (deploy.yml: cp -r data/. _site/data/)

// Populated by init(); render functions read these names unchanged.
let METALS, GROUPS, DATA, COUNTRIES, WORLD_PATHS, FLOWS,
    ACTORS, LEVERS, MATRIX, MATRIX_READING,
    STRATEGY_FAMILIES, STRATEGIES, STRATEGY_INDEX,
    BASKETS, INSTRUMENTS, PROJECTION, WINLOSE, NEWS,
    PRICES; // PRICES = prices.json overlay (fetched; render wiring deferred to Sprint 3)

async function fetchJson(name) {
  const res = await fetch(`${DATA_BASE}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch ${name}: HTTP ${res.status}`);
  return res.json();
}

async function init() {
  const [metals, worldmap, matrix, strategy, instruments, projection, winlose] =
    await Promise.all([
      fetchJson('metals.json'), fetchJson('worldmap.json'), fetchJson('matrix.json'),
      fetchJson('strategy.json'), fetchJson('instruments.json'),
      fetchJson('projection.json'), fetchJson('winlose.json')
    ]);

  METALS = metals.metals;  GROUPS = metals.groups;  DATA = metals.data;
  COUNTRIES = worldmap.countries;  WORLD_PATHS = worldmap.worldPaths;  FLOWS = worldmap.flows;
  ACTORS = matrix.actors;  LEVERS = matrix.levers;  MATRIX = matrix.matrix;  MATRIX_READING = matrix.reading;
  STRATEGY_FAMILIES = strategy.families;  STRATEGIES = strategy.strategies;
  BASKETS = instruments.baskets;  INSTRUMENTS = instruments.instruments;
  PROJECTION = projection;  WINLOSE = winlose;

  // STRATEGY_INDEX is runtime-derived (was an IIFE in the prototype) — rebuild it here.
  STRATEGY_INDEX = (() => {
    const idx = {};
    Object.entries(STRATEGIES).forEach(([sk, s]) => {
      s.instances.forEach(inst => inst.metals.forEach(mk => {
        (idx[mk] = idx[mk] || new Set()).add(sk);
      }));
    });
    Object.keys(idx).forEach(mk => { idx[mk] = [...idx[mk]]; });
    return idx;
  })();

  buildSidebar();   // sidebar build is moved into a function (Task 4)
  refresh();
}
```

- [ ] **Step 2: Replace the bare `refresh()` call at the end of block 6 with `init()`**

At ~L3060 the prototype ends block 6 with a bare `refresh();`. Replace it:

```js
init().catch(err => {
  document.getElementById('toolMeta').textContent = 'Data failed to load — see console.';
  console.error(err);
});
```

- [ ] **Step 3: Defer manual verification to Task 5** (the sidebar build still runs at parse time against undefined globals until Task 4 wraps it). Do not test rendering yet.

- [ ] **Step 4: Commit**

```bash
git add app/index.html
git commit -m "feat(s2): add DATA_BASE + Promise.all fetch init for static data"
```

---

## Task 4: Move the parse-time sidebar/build code into functions (Goal 2, part 2)

The prototype runs sidebar construction and toggle wiring at parse time (block 6, ~L2233–2287), referencing `GROUPS`/`METALS` directly. Those are now `undefined` until `init()` resolves, so this code must run **after** fetch.

**Files:**
- Modify: `app/index.html` (block 6, ~L2233–2287)

- [ ] **Step 1: Wrap the sidebar/group-key build in `buildSidebar()`**

Take the existing block that builds `metalList` and `groupKey` (the `groupOrder.forEach(...)` and `Object.values(GROUPS).forEach(...)` sections) and wrap it in a function:

```js
function buildSidebar() {
  const metalList = document.getElementById('metalList');
  metalList.innerHTML = '';
  const groupOrder = ['precious', 'battery', 'rareearth', 'minor'];
  groupOrder.forEach(grpKey => {
    /* …existing body unchanged… */
  });
  const groupKey = document.getElementById('groupKey');
  groupKey.innerHTML = '';
  Object.values(GROUPS).forEach(g => { /* …existing body unchanged… */ });
}
```

`buildSidebar()` is called from `init()` (Task 3 Step 1). The body is moved verbatim — no logic change.

- [ ] **Step 2: Confirm toggle/event wiring is DOM-only**

The `addEventListener` blocks (viewToggle, vectorToggle, flowChk, closeBtn, newsDockTab, ~L2262–2287) reference only DOM elements and `state` — they are safe at parse time and stay where they are. Verify none reference a data global directly; if any do, move them into `init()` after assignment.

- [ ] **Step 3: Commit**

```bash
git add app/index.html
git commit -m "feat(s2): defer sidebar build until after data fetch"
```

---

## Task 5: Remove inline data literals + no-inline-data acceptance check (Goal 2, part 3 — closes Goal 2)

**Files:**
- Modify: `app/index.html` (delete blocks 1–5 data literals)

- [ ] **Step 1: Delete the five inline data `<script>` blocks**

Remove blocks 1–5 entirely (the `const METALS = {…}` … `const WORLD_PATHS = […]` declarations and their provenance comments, ~L655–2204). Keep block 6. The render functions now read the `let` globals populated by `init()`.

- [ ] **Step 2: Build the assembled site and serve it**

Run: `npm run build:site && npm run serve`
Expected: serves `_site/` (index.html + data/ as siblings) at a localhost URL.

- [ ] **Step 3: Manual visual verification — all four views**

Open the served URL. Confirm: Geographic Map renders with country dots + flow lines; Movers Matrix renders the grid; Strategies renders the cards; Terminal renders instruments + projection + winners/losers + news dock. Switch metals and vectors. **This must look identical to the Sprint 1 deploy** (`https://verifygrit-admin.github.io/invest-metals-wellspring/`) — see Task 11 for the side-by-side.

- [ ] **Step 4: Run the no-inline-data acceptance check**

Structural check (no inline data assignments remain):
```bash
grep -nE "const (METALS|GROUPS|COUNTRIES|DATA|FLOWS|ACTORS|LEVERS|MATRIX|MATRIX_READING|STRATEGY_FAMILIES|STRATEGIES|BASKETS|INSTRUMENTS|PROJECTION|NEWS|WINLOSE|WORLD_PATHS)\s*=" app/index.html
```
Expected: **no output** (exit 1) — the data names are now `let` bindings, not inline `const` literals.

Content check (no transcribed data values left inline):
```bash
grep -nE "Fresnillo|Nornickel|SPDR Gold Shares|M150,66|China Northern Rare Earth" app/index.html
```
Expected: **no output** — the actual data strings are gone from the HTML.

- [ ] **Step 5: Commit (Goal 2 closed)**

```bash
git add app/index.html
git commit -m "refactor(s2): remove inline data literals; app is fully data-driven from /data"
```

---

## Task 6: Feed placeholders — `prices.json` + `news.json` (Goal 4)

**Files:**
- Modify: `tools/generate-data.mjs` (add the two feed writers)
- Modify: `app/index.html` (fetch both in `init()`; drive news dock from `news.json`)
- Modify: `test/roundtrip.test.mjs` (assert the A1/A2 transforms)

- [ ] **Step 1: Add feed-file generation to `tools/generate-data.mjs`**

Append before the final `console.log`:

```js
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
```

- [ ] **Step 2: Add A1/A2 assertions to `test/roundtrip.test.mjs`**

```js
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
```

- [ ] **Step 3: Regenerate and run the test**

Run: `npm run generate && node --test test/roundtrip.test.mjs`
Expected: PASS — 9 tests (7 static + 2 feed), 0 failures; `data/prices.json` and `data/news.json` created.

- [ ] **Step 4: Wire both feeds into `init()`**

In `app/index.html` `init()`, extend the `Promise.all` and assignments:

```js
const [metals, worldmap, matrix, strategy, instruments, projection, winlose, prices, news] =
  await Promise.all([
    fetchJson('metals.json'), fetchJson('worldmap.json'), fetchJson('matrix.json'),
    fetchJson('strategy.json'), fetchJson('instruments.json'),
    fetchJson('projection.json'), fetchJson('winlose.json'),
    fetchJson('prices.json'), fetchJson('news.json')
  ]);
// …existing assignments…
PRICES = prices.prices;   // overlay (fetched; render-wiring deferred to Sprint 3 — see D1)
NEWS = news.events;       // news dock renders from here (replaces inline NEWS)
```

The news dock render (`renderNewsDock`, `computeProjection`) already reads `NEWS` as an array — no render change needed. `PRICES` is intentionally unused by render in Sprint 2 (D1).

- [ ] **Step 5: Verify the app reads both without error**

Run: `npm run build:site && npm run serve`
Open Terminal view; confirm the News & Signal Feed lists events (driven by `news.json`) and applying a news item still shifts the projection bands. Check the browser console: no fetch/parse errors for `prices.json` or `news.json`.

- [ ] **Step 6: Commit (Goal 4 closed)**

```bash
git add tools/generate-data.mjs test/roundtrip.test.mjs data/prices.json data/news.json app/index.html
git commit -m "feat(s2): add seed prices.json (A1 change rename) + news.json (A2 seed fields); wire into fetch layer"
```

---

## Task 7: JSON Schemas for all nine files (Goal 3, part 1)

**Files:**
- Create: `schemas/{metals,worldmap,matrix,strategy,instruments,projection,winlose,prices,news}.schema.json`

Author Draft-07 schemas. Keep them strict enough to catch a renamed/dropped field or wrong type (the spec §6 risk), but `additionalProperties` choices are noted per file. Below are the two highest-leverage schemas in full; the rest follow the same construction against the shapes in "Exact JSON shapes."

- [ ] **Step 1: `schemas/metals.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metals", "groups", "data"],
  "additionalProperties": false,
  "properties": {
    "metals": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["name", "symbol", "group", "price", "priceUnit", "priceYoY", "demandYoY", "note"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" },
          "symbol": { "type": "string" },
          "group": { "type": "string", "enum": ["precious", "battery", "rareearth", "minor"] },
          "price": { "type": "number" },
          "priceUnit": { "type": "string" },
          "priceYoY": { "type": "number" },
          "demandYoY": { "type": "number" },
          "note": { "type": "string" }
        }
      }
    },
    "groups": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["label", "color"],
        "additionalProperties": false,
        "properties": { "label": { "type": "string" }, "color": { "type": "string" } }
      }
    },
    "data": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["extraction", "processing", "application", "owners"],
        "additionalProperties": false,
        "properties": {
          "extraction":  { "type": "object", "additionalProperties": { "type": "number" } },
          "processing":  { "type": "object", "additionalProperties": { "type": "number" } },
          "application": { "type": "object", "additionalProperties": { "type": "number" } },
          "owners": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "additionalProperties": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: `schemas/prices.schema.json`** (must enforce `change`, forbid `chg`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["asOf", "source", "prices"],
  "additionalProperties": false,
  "properties": {
    "asOf": { "type": "string", "format": "date-time" },
    "source": { "type": "string" },
    "prices": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["price", "change"],
        "additionalProperties": false,
        "properties": { "price": { "type": "number" }, "change": { "type": "number" } }
      }
    }
  }
}
```

- [ ] **Step 3: `schemas/news.schema.json`** (must require `source`, `tagStatus`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["asOf", "events"],
  "additionalProperties": false,
  "properties": {
    "asOf": { "type": "string", "format": "date-time" },
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "date", "metals", "headline", "excerpt", "strategies", "lever", "actors", "impact", "source", "tagStatus"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "date": { "type": "string" },
          "metals": { "type": "array", "items": { "type": "string" } },
          "headline": { "type": "string" },
          "excerpt": { "type": "string" },
          "strategies": { "type": "array", "items": { "type": "string" } },
          "lever": { "type": "string" },
          "actors": { "type": "array", "items": { "type": "string" } },
          "impact": { "type": "integer", "minimum": -3, "maximum": 3 },
          "source": { "type": "string", "enum": ["seed", "live"] },
          "tagStatus": { "type": "string", "enum": ["proposed", "reviewed"] }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Author the remaining six schemas** against the "Exact JSON shapes" section:
  - `worldmap.schema.json`: `countries` (each `{lon:number, lat:number, label:string}`), `worldPaths` (array of string), `flows` (object → array of `{from:string, to:string, weight:number}`).
  - `matrix.schema.json`: `actors` (`{label,short,desc}`), `levers` (`{label,desc,vectors:[string]}`), `matrix` (object → object → object of integers), `reading` (object → string).
  - `strategy.schema.json`: `families` (`{label,desc,color}`), `strategies` (`{name,family,lever,depth,mechanism,whoUses,instances:[{date,metals:[string],text}],reading}`).
  - `instruments.schema.json`: `baskets` (`{name,group,metals:[string]}`), `instruments` (object → array of `{ticker,name,type,listing,price:[number,null],chg:[number,null],exposure}`). Use `"price": {"type": ["number","null"]}` and same for `chg` to allow note rows.
  - `projection.schema.json`: object → `{baseline:number, strategyImpact:integer, actorLeverage:integer, methodWeight:integer, vol:integer, basis:string}`.
  - `winlose.schema.json`: object → `{near,mid,long}` each `{winners:[{actor,rationale}], losers:[{actor,rationale}]}`.

- [ ] **Step 5: Validate every file passes its schema (positive case)**

Run:
```bash
npx ajv validate -s schemas/metals.schema.json -d data/metals.json
npx ajv validate -s schemas/prices.schema.json -d data/prices.json
npx ajv validate -s schemas/news.schema.json -d data/news.json
# …and the remaining six…
```
Expected: each prints `data/<file>.json valid`.

> Note: `format: date-time` requires `ajv-formats`. If `ajv-cli` does not load it by default, either drop the `format` keyword (keep `type: string`) or add `ajv-formats` and pass `-c ajv-formats`. Decide in Step 5; the simplest path is `type: string` only.

- [ ] **Step 6: Commit**

```bash
git add schemas/
git commit -m "test(s2): add JSON Schemas for 7 static files + 2 feed placeholders"
```

---

## Task 8: Validation runner + malformed-fixture negative test (Goal 3, part 2)

**Files:**
- Create: `tools/validate-all.mjs`, `test/fixtures/metals.invalid.json`, `test/negative.test.mjs`

- [ ] **Step 1: Write `tools/validate-all.mjs`** (loops all 9 files; non-zero exit on any failure)

```js
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
```

- [ ] **Step 2: Create the malformed fixture** (`metals.json` with `chg`-style breakage — a renamed field)

```json
{
  "metals": {
    "silver": { "name": "Silver", "symbol": "Ag", "grp": "precious", "price": 31.5, "priceUnit": "USD/oz", "priceYoY": 21.0, "demandYoY": 2.5, "note": "broken: group renamed to grp" }
  },
  "groups": { "precious": { "label": "Precious", "color": "#d4a843" } },
  "data": {}
}
```

(`group` renamed to `grp` → `additionalProperties: false` + `required: [...,"group",...]` rejects it. This models exactly the spec §6 "field silently renamed" failure mode.)

- [ ] **Step 3: Write the negative test**

```js
// test/negative.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('a malformed file is rejected by its schema (CI guard works)', () => {
  let threw = false;
  try {
    execFileSync('npx', ['ajv', 'validate', '-s', 'schemas/metals.schema.json', '-d', 'test/fixtures/metals.invalid.json'],
      { stdio: 'pipe', shell: process.platform === 'win32' });
  } catch {
    threw = true; // ajv exits non-zero on invalid data
  }
  assert.ok(threw, 'ajv must reject the malformed fixture');
});
```

- [ ] **Step 4: Run both — positive runner passes, negative test passes**

Run: `npm run validate`
Expected: all 9 print `valid`, exit 0.

Run: `node --test test/negative.test.mjs`
Expected: PASS — the malformed fixture is rejected.

- [ ] **Step 5: Commit**

```bash
git add tools/validate-all.mjs test/fixtures/metals.invalid.json test/negative.test.mjs
git commit -m "test(s2): add validation runner + malformed-fixture negative test"
```

---

## Task 9: CI workflow (Goal 3, part 3 — closes Goal 3)

**Files:**
- Create: `.github/workflows/validate.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Validate data
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Validate data files against schemas
        run: npm run validate
      - name: Round-trip + negative tests
        run: npm test
```

> `deploy.yml` is intentionally left unchanged (spec §5). Making deploy depend on validate is a future option, not Sprint 2 scope.

- [ ] **Step 2: Verify locally that the CI commands pass** (CI cannot be run locally, but its steps can)

Run: `npm ci && npm run validate && npm test`
Expected: install clean, all 9 files valid, all tests pass (round-trip 9 + negative 1).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/validate.yml
git commit -m "ci(s2): add JSON-schema validation workflow on push/PR"
```

- [ ] **Step 4: After push — confirm the run is green**

After the push in Task 12, check the Actions tab: `Validate data` must pass. To prove the negative path end-to-end, optionally open a throwaway branch that breaks a field and confirm the workflow fails (then discard).

---

## Task 10: Local-dev fidelity + README (housekeeping)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the data-driven architecture and local serve**

Add to `README.md`:
```markdown
## Local development (Sprint 2+)

The app fetches its data from `/data/*.json` at load, so `app/index.html` cannot
be opened via `file://`. Serve an assembled site (mirrors the deploy layout):

    npm install
    npm run build:site   # copies app/ + data/ into _site/ (matches deploy.yml)
    npm run serve        # serves _site/ on localhost

Regenerate the static JSON from the prototype source: `npm run generate`.
Validate all data files against their schemas: `npm run validate`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(s2): document data-driven architecture and local serve workflow"
```

---

## Task 11: Visual-identity verification against Sprint 1 (Goal 2 acceptance gate)

This is the strict acceptance bar from spec §2/§3 Goal 2: the deployed dashboard must be **visually identical to the Sprint 1 deploy**. Per spec §6 + §8, the Sprint 1 baseline must be trustworthy first (AT-1.5).

- [ ] **Step 1: Establish the Sprint 1 baseline (AT-1.5 close)**

Open `https://verifygrit-admin.github.io/invest-metals-wellspring/` and click through all four views (Map, Matrix, Strategies, Terminal), switching at least two metals and all three vectors. Capture reference screenshots of each view. (This is the §8 pre-launch manual pass; it gives Task 11 a verified comparison target.)

- [ ] **Step 2: Compare the refactored app locally**

With `npm run build:site && npm run serve` running, repeat the identical click-through on the local Sprint 2 build. For each view + metal + vector combination, confirm pixel-level parity with the Step 1 references: same country dots, flow line weights, matrix cell levels and readings, strategy cards/instances, instrument rows (prices/changes), projection bands, winners/losers, news items.

- [ ] **Step 3: Record the result**

If identical: note "Goal 2 visual-identity acceptance: PASS" in the sprint close. If any delta: it is a regression (spec §5 — any visible change is a failure), not a feature — stop and diagnose (most likely a fetch/parse/field-name mismatch) before proceeding.

---

## Task 12: Push + post-deploy verification

> **[PUSH CHECK]** Trigger: sprint work complete, building for deploy | Target: GitHub (origin/main) | Changed: 9 data files, schemas, tooling, tests, CI workflow, refactored `app/index.html`, README | Confirm before pushing.

- [ ] **Step 1: Confirm clean tree + all tests green locally**

Run: `git status` (clean), `npm run validate` (all valid), `npm test` (all pass).

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Verify both workflows**

Actions tab: `Validate data` green AND `Deploy to GitHub Pages` green.

- [ ] **Step 4: Post-deploy live verification**

On the live URL, confirm all four views render data-driven (Task 11 click-through against the live deploy), and the browser console shows successful fetches of all nine `data/*.json` with no errors. This confirms the deploy assembled `data/` into `_site/data/` and the relative `DATA_BASE` path resolves in production.

- [ ] **Step 5: Sprint-close housekeeping**

Append the spec §10 revision-log entry to `docs/specs/sprint-002/sprint-002-spec.md` with the final commit count, commit, and push.

---

## Commit sequence (13 commits — within the 8–14 target, ceiling 20)

| # | Commit | Goal |
|---|---|---|
| 1 | `chore(s2): scaffold Node tooling…` | setup |
| 2 | `feat(s2): add vm-based extraction harness…` | G1 |
| 3 | `feat(s2): transcribe 5 prototype modules to 7 static JSON files (freeze-point)` | **G1 done** |
| 4 | `feat(s2): add DATA_BASE + Promise.all fetch init…` | G2 |
| 5 | `feat(s2): defer sidebar build until after data fetch` | G2 |
| 6 | `refactor(s2): remove inline data literals…` | **G2 done** |
| 7 | `feat(s2): add seed prices.json + news.json; wire into fetch layer` | **G4 done** |
| 8 | `test(s2): add JSON Schemas for 7 static + 2 feed` | G3 |
| 9 | `test(s2): add validation runner + malformed-fixture negative test` | G3 |
| 10 | `ci(s2): add JSON-schema validation workflow…` | **G3 done** |
| 11 | `docs(s2): document data-driven architecture…` | housekeeping |
| 12 | `docs(s2): sprint-002 revision-log entry` (in Task 12 Step 5) | housekeeping |

(Task 11 visual verification produces no commit — it is a gate.) If Goal 1's three transcription groups are committed separately for clarity, that adds 2 commits → 14, still within target.

---

## Parallel execution opportunities (after the Goal 1 freeze)

Once commit #3 lands (the seven shapes frozen), the three remaining goals are independent and can be dispatched to parallel agents — they share only the frozen JSON files (read-only) and `app/index.html` (only Goal 2 and Goal 4 touch it):

```
        ┌─────────────────────── Goal 1 (Tasks 1–2) ── FREEZE ───────────────────────┐
        │ extraction harness → generator → 7 static files → round-trip test          │
        └────────────────────────────────┬───────────────────────────────────────────┘
                                          │ (commit #3)
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
  Goal 3 (Tasks 7–9)            Goal 4 (Task 6)              Goal 2 (Tasks 3–5)
  schemas + runner +           prices.json + news.json      DATA_BASE + fetch init +
  negative test + CI           + feed schemas + wire-in     sidebar defer + remove inline
  (no app/index.html edits)    (edits app/index.html)       (edits app/index.html)
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                          Task 11 visual gate → Task 12 push
```

- **Goal 3 is fully independent** of `app/index.html` (schemas/tests/CI only) — safe to run in a separate worktree.
- **Goal 2 and Goal 4 both edit `app/index.html`** and both touch `init()`. To avoid a merge conflict, sequence them on the same worktree (Goal 2 first, then Goal 4 extends `init()`), OR run in parallel worktrees and merge Goal 4's `init()` additions onto Goal 2's. The plan as written sequences them (Tasks 3–5 then 6) for the lower-risk default; the spec (§7) notes linear execution is acceptable given the sprint's size.
- **Goal 4's schemas** (`prices`, `news`) belong to Goal 3's schema set — if Goals 3 and 4 run in parallel, assign both feed schemas to whichever agent owns Task 7, reading the feed shapes from this plan's "Exact JSON shapes."

---

## Self-review (spec coverage)

- **Goal 1** (5 modules → 7 JSON; terminal split; round-trip): Tasks 1–2. Each source module mapped (findings #1–3); `terminal.js` split into instruments/projection/winlose with `NEWS`→`news.json` routed to Goal 4; round-trip test via re-extraction (Task 2 Step 1). ✔
- **Goal 2** (`DATA_BASE`, `Promise.all`, grep no-inline-data): `DATA_BASE` at top of block 6 (Task 3); `Promise.all` across 7→9 files (Tasks 3, 6); grep structural + content checks (Task 5 Step 4). ✔
- **Goal 3** (ajv-cli, 7 schema files, malformed fixture, GH Actions step): `ajv-cli` chosen (Task 0, matches spec §4 Q1 lean); 7 static schemas (Task 7) + 2 feed schemas (D3 flagged); malformed fixture + negative test (Task 8); `validate.yml` (Task 9). ✔
- **Goal 4** (`prices.json` `change` field A1; `news.json` 12 events `source:"seed"`/`tagStatus:"reviewed"` A2): Task 6 generator transforms + assertions; exact shapes in "Exact JSON shapes." ✔
- **File-by-file change list:** "File Structure" section. ✔
- **Commit sequence (8–14, ceiling 20):** 12–14 commits, table above. ✔
- **Parallel execution after Goal 1 freeze:** dependency graph above. ✔
- **Visual-identity verification vs Sprint 1 live:** Task 11 (incl. AT-1.5 baseline). ✔
- **Open decisions surfaced (D1 price overlay, D2 grouping, D3 schema count):** not silently resolved — flagged for Chris per operating rules. ✔

---

*Sprint 002 implementation plan. invest-metals is a Wellspring research product.*
