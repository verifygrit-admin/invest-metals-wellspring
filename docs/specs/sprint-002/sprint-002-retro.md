## Sprint 002 Retro — invest-metals-wellspring

**Date:** 2026-05-22
**Sprint:** S2 — JSON store conversion (the data-contract sprint)
**Sessions:** 2. (1) A Mission Control planning and early-execution dialogue that produced the spec, the implementation plan, and Tasks 0–8 (tooling scaffold through the validation runner + negative test). (2) A fresh Claude Code terminal session that oriented against `git log` and executed Tasks 9–12 (CI workflow, local serve verification, visual-identity gate, push + post-deploy verification) plus the §10 revision-log entry.

---

### What shipped

The single coherent surface: a flat-file JSON store under `/data` that is the source of truth for all non-feed data, with the app refactored to read from it. The four goals as delivered:

- **Goal 1 — five prototype modules → seven static JSON files (freeze-point).** The prototype's inline data (`data.js`, `matrix.js`, `strategy.js`, `terminal.js`, `worldmap.js` — conceptual `<script>` blocks in `app/index.html`) was transcribed via a `node:vm` extraction harness into `metals.json`, `worldmap.json`, `matrix.json`, `strategy.json`, `instruments.json`, `projection.json`, `winlose.json`. `terminal.js` splits four ways (instruments/projection/winlose static, `NEWS`→feed). Round-trip verified.
- **Goal 2 — app fully data-driven.** `DATA_BASE='data'` constant + an async `init()` doing `Promise.all` across the nine files at load; the inline `const` data literals were removed and replaced by `let` bindings assigned in `init()`. Render functions unchanged. Structural + content `grep` confirms no inline data remains.
- **Goal 3 — CI JSON-schema guard.** Nine Draft-07 schemas (seven static + two feed) under `/schemas`, a `validate-all.mjs` runner, a malformed-fixture negative test, and `.github/workflows/validate.yml` running `npm run validate` + `npm test` on push to main.
- **Goal 4 — seed feed placeholders.** `prices.json` (A1: `chg`→`change`) and `news.json` (A2: the 12 prototype events backfilled `source:"seed"`, `tagStatus:"reviewed"`), both valid against their schemas and fetched by `init()` without error. `PRICES` is fetched-but-not-rendered in S2 (D1 — render wiring deferred to S3).

**Definition of Done line closed:** Execution Plan §2 — "all data is read from /data JSON files; nothing hard-coded in app code" — **met.**

**Commit count:** 12 (`bf77154..a15220a`), which includes the §10 revision-log entry (`a15220a`). The retro commit itself is the 13th.

---

### Verification record

Stated precisely, distinguishing what was tested, what was confirmed programmatically, and what was eyeballed — in the same register the S1 retro used for AT-1.5.

- **Goal 1 — round-trip:** `node:test` round-trip suite green — each static file deep-equals the re-extracted prototype object (no field lost or renamed). The negative-fixture test confirms the schema guard *rejects* a malformed file (the `metals.invalid.json` fixture fails its schema), so the guard is proven to fail loudly, not just pass quietly.
- **Goal 2 — visual-identity gate (Task 11):** the operator performed a manual click-through of all four views (Map, Matrix, Strategies, Terminal) at `localhost:3000` (assembled `_site/`) against the Sprint 1 baseline screenshots; all four matched. **PASS.** This is a local-serve comparison, operator-eyeballed.
- **AT-1.5 — now CLOSED.** The S1 retro left AT-1.5 open: the Sprint 1 live-site visual click-through had been confirmed only programmatically. This sprint's §8 pre-launch step required establishing a trustworthy Sprint 1 baseline, so the operator performed that Sprint 1 visual click-through this sprint (it is the comparison target Task 11 ran against). AT-1.5 is therefore **closed** as of S2.
- **Goal 3 — CI:** `validate.yml` went green on its first real CI run on Node 20 (`npm ci` → `npm run validate` all 9 valid → `npm test` 10 pass). `deploy.yml` was left untouched (spec §5) — confirmed by reading it; only `validate.yml` was created.
- **Goal 4 — feeds:** `prices.json` and `news.json` validate against their schemas; `init()` fetches both without console error (HTTP-level confirmed; see §S4 below).
- **Post-deploy (live production):** the production URL was verified at the **HTTP/fetch level** — root `/` returns HTTP 200 (`text/html`, 65,664 bytes, matching the local served byte-size), and all nine `data/*.json` return HTTP 200 `application/json`. This confirms the deploy assembled `data/` into `_site/data/` and the relative `DATA_BASE` path resolves in production.
- **LIVE-DOM:** the rendered-DOM visual click-through on the live production URL (`https://verifygrit-admin.github.io/invest-metals-wellspring/`) was performed by the operator; all four views render correctly in production. The fetch layer is independently confirmed — root 200, all 9 `data/*.json` 200, `DATA_BASE` relative path resolves in production.
- **No open verification thread.** Unlike the Sprint 001 retro — which closed with AT-1.5 open (the S1 live-site visual click-through confirmed only programmatically) — Sprint 002 closes with **no open verification thread**. Goal 2's visual identity is confirmed at *both* layers: localhost (Task 11, assembled `_site/`) and live production (operator click-through above). That is a genuine difference between the two sprints: S1 deferred its last visual check; S2 does not.

---

### What was learned

- **The Node 20 / Node 24 gap is real, not theoretical.** During Task 9, the bare `node --test test/` invocation failed locally on Node v24.13.1 — the test runner interprets the trailing `test/` positional as a module entry point and errors before discovering any test files. The same suite passes cleanly via `npm test` (`node --test`, no path) and, decisively, passed on CI's Node 20 on `validate.yml`'s first real run. The failure was environment/argument-form only, not a data or test defect — CI-green confirmed it. This is **live in-sprint evidence that CF-1 (the Node 24 action-version bump) is a real maintenance item**, surfaced here through a Node-24-only behavior change, not just a deprecation warning carried forward on faith.
- **The mid-sprint session handoff worked because the fresh session oriented against `git log`, not prose.** The second (terminal) session was given an explicit orient-first instruction: read the spec + implementation plan, then `git log --oneline` / `git status` to confirm Tasks 0–8 were actually committed before executing Tasks 9–12. State was verified against the repository, not trusted from the handoff narrative. This is the process note: a session boundary mid-sprint is safe when the receiving session re-derives state from the source of truth (commits) rather than from a context summary.
- **Goal 1 transcription / Goal 2 refactor — one in-sprint shape correction, otherwise clean.** The commit history is not a straight line: `86ba60b — fix(s2): correct metals/worldmap split and feed shapes to DATA-SYSTEM.md §2.1/§3` records a mid-sprint correction. The initial transcription split and the feed-file shapes diverged from the canonical Data System Note §2.1/§3 (COUNTRIES/FLOWS placement and the feed record shape — flat array of §3 records vs. an earlier object-keyed draft), and were corrected before the schemas were authored against the corrected shapes (`2e1a0f0`). The fetch refactor itself (Tasks 3–6: `DATA_BASE` + `Promise.all`, sidebar defer, inline-data removal, feed wire-in) shows no parse or path obstacle in the history — the freeze-point discipline (correct the shape, then author schemas against it) caught the divergence at the right time rather than after schemas hardened around a wrong shape.

---

### Carry-forward

| # | Item | Category | Blocks |
|---|---|---|---|
| CF-1 | Bump `actions/checkout`, `configure-pages`, `upload-pages-artifact`, `deploy-pages` to Node 24-compatible versions before 2026-06-02. Now carries in-sprint evidence (§What was learned) that Node 24 behavior changes are real, not just deprecation noise. | Maintenance | Nothing until June; watch item for S3 |
| CF-2 | Lock A1 (price overlay shape, `chg`→`change` rename) | Decision — **RESOLVED** | Was: S2 execution. Locked in `sprint-002-spec.md`; shipped in `prices.json`. |
| CF-3 | Lock A2 (news seed backfill — `source:"seed"`, `tagStatus:"reviewed"` for the 12 prototype events) | Decision — **RESOLVED** | Was: S2 execution. Locked in spec; shipped in `news.json`. |
| CF-4 | Lock A6 (Google Finance via Sheets API vs. scraping) — routed to the Sprint 3 spec. No longer deferrable: S3 *is* the price feed and A6 is its opening question. | Decision required | S3 execution |
| CF-5 | Create `sprint-002-spec.md` from the implementation plan + CF-2/CF-3 resolutions | Scaffolding — **RESOLVED** | Was: S2 open. Created; now git-tracked (see CF-6). |
| CF-6 | Filing asymmetry: `sprint-002-spec.md` is now git-tracked (pulled in whole by the §10 commit `a15220a`) while `sprint-002-operator-outline.md` remains untracked. Housekeeping, not a defect. | Housekeeping | Nothing |
| CF-7 | `.claude/settings.local.json` sits modified/uncommitted in the working tree (pre-existing, intentionally never staged this sprint). Housekeeping, not a defect. | Housekeeping | Nothing |

---

### Sprint shape vs. estimate

Operator Outline §7 projected: 4 goals, 1–2 sessions, ~8–14 commits (ceiling 20), ≤40 working exchanges (ceiling 60), 9 files under `/data`, 7 schemas + ≥1 malformed fixture, 1 CI step, zero renderer/UI delta.

Actuals:

| Metric | Estimate | Actual | Verdict |
|---|---|---|---|
| Goals | 4 | 4 delivered | on plan |
| Sessions | 1–2 | 2 | within range |
| Commits | 8–14 (ceiling 20) | 12 (`bf77154..a15220a`) | within target |
| `/data` files | 9 | 9 | on plan |
| Schemas / fixtures | 7 + ≥1 | 9 schemas (7 static + 2 feed, per D3) + 1 fixture | on plan (feed schemas added per D3) |
| CI steps | 1 | 1 (`validate.yml`) | on plan |
| Renderer/UI delta | zero by design | zero (visual-identity PASS) | on plan |

**No ceiling was approached.** The sprint went to plan; the only deviation from the outline's lean was authoring 9 schemas instead of 7 (the two feed schemas, flagged as D3 and confirmed) so the placeholders are guarded and S3/S4 inherit them.

---

### Next session open condition

Sprint 3 (price feed — the first thin-slice feed, the project's first fragile external integration behind a `PriceAdapter` interface) execution opens only after `sprint-003-spec.md` exists and CF-4 (A6 — Google Finance via Sheets API vs. scraping) is resolved within it.

**Watch item:** CF-1 (Node 24-compatible deploy-action versions, due 2026-06-02). If Sprint 3 lands near that date, fold the action-version bump into whichever sprint is in flight as a cheap opportunistic close.

---

*Sprint 2 complete. invest-metals is a Wellspring research product.*
