# invest-metals — Data System Note

**Companion to:** Product Specification v1.0
**Decision:** Flat-file JSON store. No database.

---

## 1. The decision and why

The project needs to store ~9 structured datasets and update 2 of them on a schedule. It does **not** need concurrent writes, transactional integrity, complex joins, or query-by-many-users. Given that, a database is overhead, not help.

**A note on terminology.** "JSONB" is specifically a PostgreSQL column type — asking for JSONB literally means running Postgres. What the project actually wants, and what is correct here, is a **flat-file JSON store**: plain `.json` files on disk, read directly by the app, written by the feed scripts. This delivers the thing JSONB is liked for — schemaless, document-shaped data — without the database.

Three reasons it is the right call for this MVP:

1. **The app is static.** It deploys on GitHub Pages with no server. A database would force a backend; flat files do not.
2. **The schema already exists.** The prototype's five JS modules already define every data shape. Converting them to JSON is a transcription, not a design task.
3. **Zero cost, zero ops.** No database to host, secure, back up, or pay for.

---

## 2. The store

All data lives in `/data` as JSON files — the single source of truth. Two categories:

### 2.1 Static datasets (converted once from the prototype)

| File | From prototype module | Updated |
|---|---|---|
| `metals.json` | `data.js` (METALS, COUNTRIES, DATA, FLOWS) | Rarely — manual |
| `matrix.json` | `matrix.js` (ACTORS, LEVERS, MATRIX) | Rarely — manual |
| `strategy.json` | `strategy.js` (STRATEGIES, families) | Occasionally — manual |
| `instruments.json` | `terminal.js` (INSTRUMENTS, BASKETS) | Occasionally — manual |
| `projection.json` | `terminal.js` (PROJECTION inputs) | Occasionally — manual |
| `winlose.json` | `terminal.js` (WINLOSE) | Occasionally — manual |
| `worldmap.json` | `worldmap.js` (geometry) | Never |

### 2.2 Feed-updated datasets

| File | Written by | Refresh cadence (MVP) |
|---|---|---|
| `prices.json` | price feed script | every 15–30 min, market hours |
| `news.json` | news feed script | hourly |

---

## 3. Record shapes

The feed files are the ones that matter for the build. Their shapes:

**`prices.json`** — array of:
```json
{
  "ticker": "GLD",
  "price": 272.40,
  "change": 0.6,
  "currency": "USD",
  "asOf": "2026-05-22T14:30:00Z",
  "source": "google-finance",
  "isLive": true
}
```
`isLive: false` marks a representative/assessed value for a metal with no ticker — the Terminal uses this flag to show the distinction.

**`news.json`** — array of:
```json
{
  "id": "n-20260522-001",
  "date": "2026-05-22",
  "headline": "...",
  "excerpt": "...",
  "url": "https://...",
  "source": "rss:fastmarkets",
  "metals": ["gallium", "germanium"],
  "strategies": ["exportControl"],
  "lever": "tradePolicy",
  "actors": ["prodState", "centralGov"],
  "impact": 2,
  "tagStatus": "proposed"
}
```
`tagStatus` is `proposed` (rule-based tagging, not yet checked) or `reviewed` (a human has confirmed/corrected the tags). The Terminal treats only `reviewed` items as confirmed signal.

The static files keep the exact structure of the prototype modules — see those modules for their shapes; they are not redesigned.

---

## 4. Refresh model

**Static-refresh** (MVP). No running server.

```
GitHub Actions (scheduled)
  → run price feed script   → write /data/prices.json
  → run news feed script    → write /data/news.json
  → commit changed JSON back to the repo
  → GitHub Pages redeploys the static site
```

The app always reads whatever JSON is currently in the repo. "Near-real-time" therefore means *as fresh as the last scheduled run*. Every feed file carries `asOf`; the app surfaces staleness rather than hiding it.

**Resilience rule:** a feed script that fails must leave the previous good JSON in place — never write a partial or empty file. The app continues on the last good data and shows its age.

---

## 5. Integrity & validation

- Each feed script validates its output against the record shape above before writing. A malformed record is dropped and logged, not written.
- The static files have a known shape; a simple JSON-schema check in CI guards against a bad manual edit.
- No credentials in any JSON file or anywhere in the repo. If a news-API key is used, it lives in GitHub Actions secrets only.

---

## 6. Upgrade path

If the project outgrows flat files — many more metals, sub-minute refresh, multi-user query, or a need to query across history — the migration is **PostgreSQL with `JSONB` columns**. The same JSON documents become rows in a `JSONB` column, immediately queryable, with no reshaping. The flat-file schema in Section 3 is deliberately designed to map onto that one-to-one. This is a future option, explicitly **not** an MVP task.

---

*Companion to the invest-metals Product Specification. Wellspring research product.*
