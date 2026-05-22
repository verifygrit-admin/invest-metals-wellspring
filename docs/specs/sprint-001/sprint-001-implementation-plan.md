# invest-metals — Sprint 001 Implementation Plan

**Companion to:** Product Specification v1.0, Execution Plan & Sprint Series v1.0, Data System Note v1.0, Operator Outline
**Status:** Plan — no implementation performed. Read-only analysis of the codebase.
**Date:** 2026-05-22
**Author:** Claude Code (Builder), planning pass

---

## 0. How to read this document

This plan was produced by reading, in order: `docs/specs/sprint-001/sprint-001-spec.md`, `assets/PRODUCT-SPEC.md`, `assets/DATA-SYSTEM.md`, then the referenced `assets/EXECUTION-PLAN.md`, `README.md`, and the prototype asset `assets/metals_geographic_outlook.html` (3,063 lines). A subagent performed the deep structural read of the prototype's render layer (lines 2205–3063); the data-module map below is from direct inspection.

It plans **Sprint 1 in full execution detail** and provides a **lighter forward map for Sprints 2–6**, because Sprint 1 is the only sprint that can begin today — nothing else can proceed until the repo exists and deploys (Execution Plan §4 dependency map: S1 is the root).

> **⚠ READ FIRST — Scope ambiguity A0 (below).** The file named `sprint-001-spec.md` does **not** contain a Sprint-1-specific spec; it contains the **Operator Outline** (the whole-lifecycle run document). The actual Sprint 1 definition lives in `EXECUTION-PLAN.md §3`. This plan treats *Execution Plan Sprint 1 — "Repo creation & static foundation"* as the authoritative definition of "Sprint 001." Confirm this reading before execution.

---

## 1. Current-state findings (what exists / what does not)

### 1.1 What exists
| Path | Contents |
|---|---|
| `assets/PRODUCT-SPEC.md` | Product spec v1.0 (scope, data sources, FR-1..FR-10, NFRs) |
| `assets/EXECUTION-PLAN.md` | Six-sprint series + Definition of Done + dependency map + risk register |
| `assets/DATA-SYSTEM.md` | Flat-file JSON store decision, record shapes, refresh model |
| `docs/OPERATOR-OUTLINE.md` | Operator run document (duplicated as `docs/specs/sprint-001/sprint-001-spec.md`) |
| `docs/specs/sprint-001/sprint-001-spec.md` | **= Operator Outline content** (see A0) |
| `README.md` | Public README baseline (Pages URL placeholder unfilled) |
| `assets/metals_geographic_outlook.html` | **The prototype** — single self-contained HTML, 151 KB, 3,063 lines, four views + 5 inline data modules + render layer |
| `.claude/settings.local.json` | Local Claude settings (MCP servers) |

### 1.2 What does NOT exist yet (all created during the sprint series)
- No `/app`, `/data`, `/feeds`, `/.github/workflows` directories.
- No `package.json` / Node project; no feed scripts.
- **No git repository** (environment reports git: false) and **no GitHub remote** — Sprint 1 creates both.
- No live deployment; README Pages URL is a placeholder.

### 1.3 Prototype anatomy (the Sprint-2 conversion target, mapped now to de-risk S1)
The prototype is six `<script>`/`<style>` blocks. The five data modules map 1:1 onto the Data System Note §2 files:

| Prototype block (lines) | Global objects | Spec module | → `/data` file(s) |
|---|---|---|---|
| `<style>` 7–654 | — | (CSS, stays in app) | — |
| script 655–1113 | `METALS`, `GROUPS`, `COUNTRIES`, `DATA`, `FLOWS` | `data.js` | `metals.json` |
| script 1114–1325 | `ACTORS`, `LEVERS`, `MATRIX`, `MATRIX_READING` | `matrix.js` | `matrix.json` |
| script 1326–1638 | `STRATEGY_FAMILIES`, `STRATEGIES`, `STRATEGY_INDEX` | `strategy.js` | `strategy.json` |
| script 1639–2172 | `BASKETS`, `INSTRUMENTS`, `PROJECTION`, `NEWS`, `WINLOSE` | `terminal.js` | `instruments.json`, `projection.json`, `winlose.json`, **+ seeds `news.json`** |
| script 2173–2204 | `WORLD_PATHS` | `worldmap.js` | `worldmap.json` |
| script 2205–3061 | render layer (`refresh`, `renderMap/Matrix/Strategy/Terminal`, `renderNewsDock`, `computeProjection`, `openDetail`) | — | stays in app |

**Render-layer facts that drive feed wiring (S3/S4), captured now:**
- All render functions read the global `const` objects **by bare identifier** — no `fetch`, no parameter passing. The data-access seam for S2 is therefore: convert these consts to fetched data and defer first paint behind the fetch.
- **Bootstrap = a single `refresh();` call at line 3060.** No `init()`, no `DOMContentLoaded`. This line is the exact fetch seam for S2.
- **Prices live in `INSTRUMENTS`** (line 1681), grouped *by metal*, each row `{ticker, name, type, listing, price, chg, exposure}`. Note: prototype uses **`chg`**, not `change`; rows for non-traded metals already use `price:null` placeholders.
- **No `isLive` flag exists anywhere today.** FR-5 requires adding it. The current "prices illustrative" status is hard-coded prose (lines 2687–2693, 2719), not data-driven.
- **`NEWS`** (line 1808) is an inline array of 12 hand-authored, dated events: `{id, date, metals, headline, excerpt, strategies, lever, actors, impact}`. It has **no `url`, no `source`, no `tagStatus`** fields — all three are required by the `news.json` spec shape.
- **Tag chips already render** (strategy/method/actor + impact, lines 2941–2952). **`tagStatus` does not render** — FR-8 requires adding it.
- `computeProjection()` (reads `NEWS` at ~line 2647) folds **all** news `impact` into the projection. FR-8 ("only `reviewed` treated as confirmed signal") means this must later be gated on `tagStatus === "reviewed"`.
- View switching is driven by `state.view` ∈ {map, matrix, strategy, terminal} swapping `.active`/`.hidden` on `#mapView/#matrixView/#strategyView/#terminalView`. Feeds do not touch view switching.

---

## 2. Ambiguities & missing inputs — FLAG BEFORE EXECUTION

Per the brief's requirement to flag blockers before they bite. Each is tagged with the **sprint it blocks** and a **recommendation** (decisions are surfaced, not made — route to operator).

| # | Ambiguity / missing input | Blocks | Recommendation |
|---|---|---|---|
| **A0** | "Sprint 001" naming: `sprint-001-spec.md` contains the Operator Outline, not a Sprint-1 spec. Is the requested plan for **Execution Plan Sprint 1** (repo + static foundation) or the **whole sprint-001 doc** (full lifecycle)? | Scope of this plan | **Treat as Execution Plan Sprint 1.** This plan does so. Confirm; if the whole series is wanted, S2–S6 sections expand. |
| **A1** | **Price shape mismatch.** `prices.json` spec = flat per-**ticker** array with `change`/`currency`/`asOf`/`source`/`isLive`; prototype `INSTRUMENTS` = grouped-by-**metal** with `chg`, no live fields. How do they relate — replace or overlay? | S2, S3 | **Overlay, not replace.** `instruments.json` keeps the static roster (name/type/listing/exposure/seed price). `prices.json` is a thin per-ticker live overlay; the Terminal joins by `ticker` and sets `isLive`. Keeps non-traded metals on representative values cleanly. |
| **A2** | **News field gaps.** Prototype `NEWS` lacks `url`, `source`, `tagStatus`. On conversion, what `tagStatus` do the 12 curated seed events get — `reviewed` or `proposed`? And do they persist once the live feed runs? | S2, S4, S6 | Seed the 12 as **`reviewed`** (they were hand-authored/verified) with `source:"seed"` and best-effort `url`. Live feed appends `proposed` items. Keeps the existing dashboard signal intact while the feed proves out. |
| **A3** | **GitHub Pages publish path vs `/data` reachability** (architecture-level). If Pages serves the `/app` subfolder as root, sibling `/data/*.json` is **not** served and S2's `fetch` breaks. | S1 (config choice), S2 (fetch path), S5 | **Surface to operator — architecture decision.** Three options: (1) Pages serves **repo root** → app at `/app/`, fetch `../data/*.json`; (2) workflow copies `/data` into the published `/app/data`; (3) **Actions-based Pages deploy** assembling app+data into one artifact (cleanest, aligns with S5). Recommend deciding at S1 so S2 inherits it. S1 itself only needs the app served, so any option unblocks S1. |
| **A4** | **No git repo / no `gh` auth confirmed.** S1 step 1 is `gh repo create` inside the operator's authenticated session. | S1 | Verify at S1 open: `git`, `gh auth status`, repo name availability, public-repo permission. Operator-authenticated; Builder runs within that envelope. |
| **A5** | **No Node project decisions.** README implies `npm install` + `node feeds/.../run.js`. Module system (ESM vs CJS), Node version pin, and dependency choices (e.g. `rss-parser`, fetch lib) are undefined. | S3, S4, S5 | Decide at S3 start: **ESM, Node LTS (pin in `.nvmrc` + `engines`)**. Minimal deps; prefer built-in `fetch` (Node 18+). Defer `package.json` creation to S3 (S1/S2 are dependency-free static work). |
| **A6** | **Google Finance access method undecided.** `GOOGLEFINANCE()` via Sheets API (needs a service-account secret) vs. page scraping (no secret, more fragile). | S3 | Surface to operator. Either path sits behind `PriceAdapter`. If Sheets API: credential is an **Actions secret only** (NFR §8). Scraping needs no secret but breaks more often. Recommend starting with whichever the operator can authenticate fastest; the adapter makes the choice reversible. |
| **A7** | **Companion Note** referenced in README/Spec ("the original four-view prototype and its provenance") is **not in the repo.** | None (S1–S6) | Non-blocking. Note for documentation completeness at S6; the prototype HTML itself is the operative asset. |
| **A8** | **`computeProjection` consumes all news impact** regardless of tag state. FR-8 wants only `reviewed`. | S4/S6 | Plan to gate `computeProjection`'s news fold on `tagStatus === "reviewed"` when news goes feed-driven. Note now so S4 wiring anticipates it. |

**Hard blockers for Sprint 1 specifically:** only **A4** (git/gh preconditions) gates S1. **A3** is a decision S1 should *record* but does not strictly block S1's deploy. A0 should be confirmed before any execution.

---

## 3. SPRINT 1 — Repo creation & static foundation (detailed plan)

**Sprint goal (Execution Plan §3):** the repo exists, the prototype lives in it, and it deploys on GitHub Pages, unchanged.
**Done when:** the public repo exists and the prototype is reachable at its GitHub Pages URL, **identical to the local file**.
**Overall effort:** **S** (small). Largely sequential; minimal parallelism.

### 3.1 Deliverable → file paths → actions

| ID | Deliverable (from §3 Sprint 1) | Concrete file/path actions |
|---|---|---|
| **D1** | Create public `invest-metals` repo via `gh` CLI | Verify `gh auth status`; `gh repo create invest-metals --public` within operator session; add as `origin` remote (or create-from-local). Confirm repo name free (A4). |
| **D2** | Initialize repo structure per Product Spec §6 | Create dirs with `.gitkeep` placeholders: `data/`, `feeds/price-adapter/`, `feeds/news-adapter/`, `app/`, `.github/workflows/`. Add `.gitignore` (node_modules, OS files). |
| **D3** | Move prototype app into `/app` | Copy `assets/metals_geographic_outlook.html` → **`app/index.html`** (rename to `index.html` so Pages serves it as the directory default). **Byte-identical content** — no edits to markup/JS in S1. Decide whether to keep or remove the `assets/` copy (recommend: keep as provenance, single source for S2 extraction). |
| **D4** | Configure GitHub Pages to serve the app | Enable Pages. **Publish-path choice = A3 decision.** For S1, minimal: serve so `app/index.html` resolves (either Pages "root" with app at `/app/`, or Pages pointed at `/app`). Record the choice in a `docs/` note for S2. |
| **D5** | Confirm four-view dashboard deploys & runs live | Open the live Pages URL; verify all four views (Map, Matrix, Strategy, Terminal) render; visually diff against the local `assets/...html`. Fill the README "Live site" URL placeholder. |

### 3.2 Work streams — parallel vs sequential

```
WS-1 Repo bootstrap (D1)         ─┐  SEQUENTIAL ROOT — everything waits on this
                                  │
WS-2 Scaffold + move app (D2,D3) ─┤  can be PREPARED locally in parallel with WS-1
WS-4 README URL fill (part of D5)─┘  (prep only; commit after WS-1)
                                  │
WS-3 Pages config (D4)            │  SEQUENTIAL after first push (needs remote)
WS-5 Live verification (D5)       │  SEQUENTIAL after Pages build completes
```

- **Parallelizable (local prep, before/while repo is created):** WS-2 (build the directory tree + place `app/index.html` + `.gitignore`) and the README placeholder edit can be staged locally regardless of remote state.
- **Strictly sequential:** WS-1 (repo create) → first commit/push → WS-3 (Pages config needs the remote) → Pages build (external wait) → WS-5 (verify the live URL).
- **Subagent value in S1 is low** — it is short, sequential, and gated on external GitHub state and operator auth. Recommend running S1 as a single linear thread, not fanned out.

### 3.3 Dependencies & ordering constraints
1. **A0 confirmed** and **A4 verified** (gh auth, repo name) **before any action.**
2. Repo must exist (D1) before Pages can be configured (D4).
3. `app/index.html` must be committed and pushed before the Pages build can serve it.
4. **[PUSH CHECK applies]** — D5 verification is only valid against **pushed** code; a local-only "it works" does not satisfy "done when … reachable at its GitHub Pages URL." (Execution Plan §3 S1 gate; Operator Outline §3.3.)
5. Record the A3 publish-path decision before S2 opens — S2 inherits the fetch base path from it.

### 3.4 Verification steps
1. `gh repo view` confirms a public repo named `invest-metals` exists under the operator's account.
2. Repo tree matches Product Spec §6 (`/data`, `/feeds/price-adapter`, `/feeds/news-adapter`, `/app`, `/.github/workflows`, `README.md`).
3. `app/index.html` is byte-identical to `assets/metals_geographic_outlook.html` (diff = empty).
4. Pages build shows green; the published URL returns HTTP 200.
5. Manual: the live URL loads; each of the four views renders and is interactive; the live render matches the local file open in a browser.

### 3.5 Acceptance tests (Sprint 1)
- **AT-1.1** A public GitHub repo `invest-metals` exists and is reachable. *(D1)*
- **AT-1.2** The committed directory structure equals Product Spec §6. *(D2)*
- **AT-1.3** `diff app/index.html assets/metals_geographic_outlook.html` produces no output. *(D3)*
- **AT-1.4** GitHub Pages is enabled and the latest Pages deployment succeeded. *(D4)*
- **AT-1.5** The live Pages URL loads and all four views (Map, Matrix, Strategy, Terminal) render and switch correctly — visually identical to the local prototype. *(D5, sprint gate)*
- **AT-1.6** README "Live site" placeholder is replaced with the real URL. *(D5)*

**Sprint 1 closes only when AT-1.5 passes against the live, pushed site** — not local.

---

## 4. Forward map — Sprints 2–6 (lighter detail; expands when scheduled)

These are planned at roadmap depth so dependencies and the parallel window (S3 ∥ S4) are visible. Each will get a full Sprint-1-style breakdown when it opens.

### Sprint 2 — JSON store conversion · effort **M**
- **Deliverables → paths:** extract the five data modules into `data/metals.json`, `data/matrix.json`, `data/strategy.json`, `data/instruments.json`, `data/projection.json`, `data/winlose.json`, `data/worldmap.json`, `data/news.json` (seed, per A2). Refactor `app/index.html`: convert the bare-const globals (esp. `INSTRUMENTS`, `NEWS`, all others) to **`let`**, replace the line-3060 `refresh();` with an **async bootstrap** that `await`s `fetch()` of each JSON then calls `refresh()`. Add `STRATEGY_INDEX` rebuild after fetch (it's a derived IIFE today). Add CI JSON-schema check (`.github/workflows/` + `schemas/`).
- **Dependencies:** S1 done + **A3 fetch-path decision** (this is where it bites) + **A1/A2 shapes** locked.
- **Ordering:** convert-before-connect — JSON store is the contract for S3–S6 (Execution Plan §1.2).
- **Acceptance:** deployed dashboard **visually identical** to S1 but all data fetched from `/data`; no inline data objects remain (`grep` finds no large `const` data literals in app); CI schema check passes.
- **Watch-out:** `STRATEGY_INDEX` and any other derived/computed structures must rebuild post-fetch; `computeProjection` must not run before data resolves.

### Sprint 3 — Price feed, thin slice · effort **M** · **parallel with S4**
- **Deliverables → paths:** `feeds/price-adapter/PriceAdapter.js` (interface), `feeds/price-adapter/googleFinance.js` (impl, A6), `feeds/price-adapter/run.js` (writes `data/prices.json`), `package.json` (A5). Thin slice 5–6 tickers (GLD, SLV, COPX, ALB, FCX, NEM). Wire join in `app/index.html` renderTerminal: match `prices.json[ticker]` onto `INSTRUMENTS` rows, set `isLive`, surface live-vs-representative in UI (FR-5).
- **Dependencies:** S2 (JSON store + fetch wiring) + A1 (overlay model) + A5 (Node setup) + A6 (source method).
- **Acceptance:** Terminal shows real recent prices for the thin slice, correctly marked `isLive`; representative values visually distinct; `prices.json` validates against shape.

### Sprint 4 — News feed, thin slice · effort **M** · **parallel with S3**
- **Deliverables → paths:** `feeds/news-adapter/NewsAdapter.js` (interface), `feeds/news-adapter/rss.js` (2–3 RSS sources), `feeds/news-adapter/tagger.js` (keyword/source rules → proposed strategy/lever/actor + impact), `feeds/news-adapter/run.js` (writes `data/news.json`). Wire `tagStatus` rendering into `renderNewsDock` (FR-8, new — does not exist today). Anticipate A8 (gate `computeProjection` on `reviewed`).
- **Dependencies:** S2 + A2 (news shape, seed policy).
- **Acceptance:** news dock shows real recent rule-tagged articles each marked `proposed`; the three tag chips + `tagStatus` render; `news.json` validates.

### Sprint 5 — Scheduled refresh & resilience · effort **M/L**
- **Deliverables → paths:** `.github/workflows/feeds.yml` (scheduled price + news runs, commit JSON, redeploy), resilience rule (failed feed leaves last-good JSON; validate-before-write), `asOf` staleness surfaced in UI.
- **Dependencies:** S3 **and** S4 both merged (needs both feed scripts) + A3 (deploy model — if Actions-based Pages was chosen, this workflow owns it).
- **Acceptance:** site updates on schedule unattended; a **simulated feed failure does not break the site** (last-good data persists, staleness shown).

### Sprint 6 — Review loop, docs & MVP close · effort **M**
- **Deliverables → paths:** the `proposed → reviewed` operator path (per Operator Outline §4); confirm Terminal treats only `reviewed` as confirmed signal (closes A8); finalize `README.md`; MVP acceptance pass vs Execution Plan §2 Definition of Done.
- **Dependencies:** S5 + A8 resolution.
- **Acceptance:** every Definition-of-Done item verified true on the live site; README lets a new operator run the project.

### Dependency / parallel summary
```
S1 ─→ S2 ─┬─→ S3 (price)  ┐
          └─→ S4 (news)   ┴─→ S5 (schedule+resilience) ─→ S6 (review+docs+close)
```
**Only S3 ∥ S4 are parallelizable** (both depend solely on S2, no shared files: prices touch `feeds/price-adapter/` + the Terminal price-join; news touch `feeds/news-adapter/` + the news dock). The merge-conflict surface is the shared `app/index.html`; assign price wiring and news wiring to distinct, well-bounded regions (renderTerminal price-join vs renderNewsDock) to keep them independent.

---

## 5. Cross-cutting appendix — data-shape reconciliation (spans S2–S4)

This is the highest-leverage thing to settle early because it touches S2, S3, and S4. Captured here so it isn't rediscovered three times.

**Prices (A1).** Keep two files:
- `instruments.json` — static roster, grouped by metal, fields as today: `{ticker, name, type, listing, exposure, price (seed/representative), chg}`. Rename `chg`→`change` here OR keep `chg` and normalize at read — **decide once.**
- `prices.json` — live overlay per spec: `{ticker, price, change, currency, asOf, source, isLive}` for the exchange-traded subset only.
- Terminal render joins by `ticker`: if a live record exists → use it, `isLive:true`; else fall back to the static row, `isLive:false`. Non-traded metals (rhodium, gallium, germanium notes with `price:null`) stay representative.

**News (A2).** `news.json` per spec: `{id, date, headline, excerpt, url, source, metals[], strategies[], lever, actors[], impact, tagStatus}`. The 12 prototype events are missing `url`, `source`, `tagStatus` — backfill `source:"seed"`, best-effort `url`, `tagStatus:"reviewed"`. Live RSS items append with `tagStatus:"proposed"`.

**Field-name drift to resolve once:** prototype uses `chg`; spec uses `change`. Pick `change` in JSON (matches spec) and update the two render reads (`ins.chg` at lines ~2734–2743), or keep `chg` in JSON and leave render untouched. Recommend matching the spec (`change`).

---

## 6. Proposed execution shape (subagent strategy)

- **Sprint 1:** single linear thread (no subagents). Short, sequential, gated on external GitHub state + operator auth.
- **Sprint 2:** single thread (the app refactor is one coherent change to `index.html` + N JSON extractions); a subagent can do the mechanical JS-object→JSON extraction in parallel with the app refactor, then reconcile.
- **Sprints 3 ∥ 4:** the prime parallel window — dispatch **two subagents**, one per feed (`price-adapter` + Terminal price-join; `news-adapter` + news dock), with the shared-file boundary in §4 enforced. Reconvene to merge `app/index.html`.
- **Sprint 5:** single thread (the workflow ties both feeds together; not parallelizable against itself).
- **Sprint 6:** single thread.

---

## 7. Effort summary

| Sprint | Effort | Parallel? | Hard precondition |
|---|---|---|---|
| S1 Repo + static foundation | **S** | No | A0 confirm, A4 (git/gh) |
| S2 JSON store conversion | **M** | No | A3 (fetch path), A1, A2 |
| S3 Price feed (thin slice) | **M** | **∥ S4** | A1, A5, A6 |
| S4 News feed (thin slice) | **M** | **∥ S3** | A2 |
| S5 Schedule + resilience | **M/L** | No | S3 + S4, A3 |
| S6 Review loop + docs + close | **M** | No | A8 |

---

*Plan only. No implementation performed. The single file written by this pass is this document. invest-metals is a Wellspring research product.*
