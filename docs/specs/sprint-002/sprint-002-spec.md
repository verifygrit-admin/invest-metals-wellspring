# Sprint 002 Operator Outline — JSON Store Conversion

**Status:** Pre-launch (Operator Outline phase)
**Target launch:** TBD — opens once `sprint-002-spec.md` exists and CF-2 + CF-3 are resolved within it
**Domain coverage:** Execution Plan §3 Sprint 2 — JSON store conversion (the data-contract sprint)
**Estimated shape:** 4 goals, 1–2 sessions, ~8–14 commits, ≤ 40 working exchanges
**Register:** Foundation — this sprint lays the data contract every later sprint depends on

---

## §1 Context

Sprint 1 closed on 2026-05-22. It shipped the public repo `invest-metals-wellspring`, the Product Spec §6 directory scaffold, the prototype deployed byte-identical as `app/index.html` (151,360 bytes, empty diff against the local file), a GitHub Actions deploy workflow that redeploys on every push to `main`, and a live GitHub Pages site. The sprint goal was met: the repo exists, the prototype is deployed, and the four views are present and byte-identical to the local prototype. The one open verification thread is AT-1.5 — the live site was confirmed *programmatically* (HTTP 200, byte-identical HTML, all four view containers and render functions present) but a *visual* click-through of the four live views was not performed; the retro recommends closing that with a quick manual pass.

The project is in a **foundation register**. Sprint 1 stood up infrastructure; Sprint 2 establishes the data contract. Per Execution Principle 2 ("convert before connecting"), the JSON store is the contract every later sprint depends on — Sprints 3 and 4 (the two feeds) both fetch against the shape this sprint defines. This sprint therefore sits on the critical path: it cannot be parallelized away and it cannot be done sloppily, because a shape decision made loosely here propagates into both feed adapters.

No resequencing has occurred. The Execution Plan §3 sequence (S1 → S2 → S3/S4 → S5 → S6) and §4 dependency map are intact, and Sprint 2 is the next sprint exactly as planned. The retro's stated open condition — "Sprint 2 execution opens only after `sprint-002-spec.md` exists and CF-2 + CF-3 are resolved within it" — is a precondition this outline carries into §8, not a sequencing change.

---

## §2 Scope summary

Sprint 2 delivers one coherent surface: a **flat-file JSON store** under `/data` that is the single source of truth for all non-feed data, with the app refactored to read from it. Concretely, the prototype's five inline JS data modules become seven static JSON files, and the app is refactored to fetch those files at load instead of consuming inline objects. A CI JSON-schema check guards the static files against bad manual edits. The acceptance bar is strict and visual: the deployed dashboard must be **visually identical to Sprint 1** while being entirely data-driven from `/data`. This sprint changes how data reaches the app; it changes nothing the user sees.

---

## §3 Goals (4)

**1. Convert the five prototype modules to seven static JSON files (frozen-interface freeze-point).** Transcribe `data.js`, `matrix.js`, `strategy.js`, `terminal.js`, and `worldmap.js` into the seven static files named in Data System Note §2.1: `metals.json`, `matrix.json`, `strategy.json`, `instruments.json`, `projection.json`, `winlose.json`, `worldmap.json`. The structure of each is preserved exactly — this is a transcription, not a redesign (Product Spec FR-1; Data System Note §3 closing sentence). Note the asymmetry: five source modules map to seven files because `terminal.js` splits into `instruments.json`, `projection.json`, and `winlose.json`. **This goal is the frozen-interface freeze-point** — the seven JSON shapes it produces are the contract Goals 2 and 4, and all of Sprints 3–6, consume. Acceptance: each file is valid JSON, parses, and round-trips to the original module's object shape with no field lost or renamed.

**2. Refactor the app to fetch JSON at load.** Replace the prototype's inline JS data objects with `fetch()` calls against `/data/*.json` at app load (Product Spec FR-2 — no data hard-coded in app code). All four views (`mapView`, `matrixView`, `strategyView`, `terminalView`) and their render functions must drive off the fetched data. Acceptance: the deployed dashboard is **visually identical to the Sprint 1 deploy** — same four views, same content, same behavior — and a `grep` of the app code confirms no inline data objects remain. This goal closes the literal Sprint 2 "done when" condition.

**3. Add the CI JSON-schema check for the static files.** A schema check runs in CI (Execution Plan §3 S2; Product Spec — implied by FR-1 plus Data System Note §5) that validates each of the seven static files against a known shape, so a bad manual edit fails the build rather than silently shipping. Acceptance: the check runs on push, passes against the seven correct files, and fails against a deliberately malformed test fixture.

**4. Provision feed-file placeholders consistent with the locked A1/A2 decisions.** `prices.json` and `news.json` do not get live feeds this sprint (those are Sprints 3 and 4), but their *shape* must be settled now so the app's fetch layer and the schema check are complete and Sprints 3–4 inherit a fixed target. This goal commits a seed/placeholder `prices.json` and `news.json` whose record shapes match Data System Note §3 exactly, reflecting the A1 resolution (price overlay shape; the `chg`→`change` rename) and the A2 resolution (the 12 prototype news events backfilled with `source:"seed"`, `tagStatus:"reviewed"`). Acceptance: both files are valid against the §3 shapes, the app reads them without error, and the news placeholders carry the A2-specified `source` and `tagStatus` values.

---

## §4 Open design questions

**1. Schema-check tooling — JSON Schema validator vs. hand-rolled check.** The CI guard in Goal 3 can be a standard JSON Schema validator (e.g. `ajv` run from a small CI step) or a hand-rolled Node script that asserts shape. *Lean:* a standard JSON Schema validator, because the Data System Note §3 shapes are simple and writing them as schema files is cheap, gives Sprints 3–4 a reusable artifact (the feed scripts validate against the same schemas per Data System Note §5), and avoids a bespoke check drifting from the documented shape. Flag if planning reaches for a hand-rolled script without a concrete reason — the only good reason would be a dependency-avoidance constraint, which the public-repo zero-cost posture does not require.

**2. Fetch sequencing — parallel `Promise.all` vs. sequential.** Goal 2's refactor fetches seven (eventually nine) files at load. They can be fetched in parallel or sequentially. *Lean:* parallel via `Promise.all`, because the files are independent and parallel fetch is simply faster with no downside on a static host; sequential offers nothing here. Flag only if a load-order dependency surfaces during the refactor — none is expected, since the prototype's modules have no inter-module load order.

**3. Where the app resolves the `/data` path.** The deploy workflow assembles `data/` into `_site/data/` at build time (retro, A3 — closed), so fetch paths are `data/*.json` relative to the app root. The open question is whether the app hard-codes that relative path or derives it from a single configurable base. *Lean:* a single `DATA_BASE` constant at the top of the app's data layer, because it costs nothing now and isolates the one thing most likely to change if the deploy path is ever restructured. This is not a new abstraction layer — it is one constant.

**4. Feed-placeholder fidelity — minimal stub vs. faithful seed.** Goal 4's `prices.json` and `news.json` placeholders could be near-empty stubs (just enough to not error) or faithful seeds (representative price records for the thin-slice instruments; the full 12 prototype news events). *Lean:* faithful seed, because A2 explicitly specifies the 12 prototype events be backfilled as `source:"seed"`/`tagStatus:"reviewed"`, and a faithful `prices.json` lets Goal 2's Terminal refactor be visually verified against real-shaped data rather than against an empty file. The minimal-stub option would defer real shape exposure to Sprint 3, which contradicts "convert before connecting." This question is effectively resolved by the A1/A2 lock — it is listed here so planning confirms the placeholders match the *locked* decisions, not an earlier draft of them.

---

## §5 Out of scope (explicit)

- **Any live price fetching or `PriceAdapter` implementation** — that is Sprint 3. Goal 4 commits a *placeholder* `prices.json` only; no network source is wired.
- **Any news fetching, RSS adapter, or rule-based tagger** — that is Sprint 4. Goal 4 commits a *seed* `news.json` only; no source and no tagging logic.
- **The scheduled-refresh GitHub Actions workflow** — that is Sprint 5. Sprint 2 touches only the existing deploy workflow and the CI schema-check step.
- **The `proposed → reviewed` review loop** — that is Sprint 6. The seed news records are born `reviewed` per A2, but no review *mechanism* is built.
- **Any change to the four-view UI** — Product Spec §3.2 fixes the four-view UI as out of scope for the entire MVP. Goal 2's success condition is *visual identity* with Sprint 1; any visible change is a failure, not a feature.
- **Postgres / JSONB migration** — Product Spec §10 and Data System Note §6 place this permanently post-MVP. The flat-file schema is designed to map onto it later; this sprint builds the flat files, not the migration.
- **Closing AT-1.5's visual click-through** — the retro's recommended manual visual pass of the Sprint 1 live site is a one-off verification action, not Sprint 2 scope. It is folded into §8 as a pre-launch sanity step because Goal 2's acceptance bar ("visually identical to Sprint 1") needs a trustworthy Sprint 1 baseline to compare against.

---

## §6 Risk posture

**Structural risk: moderate — higher than a polish sprint, lower than a feed sprint.** Sprint 2 writes no fragile external integration (that risk lives in Sprints 3–4), so its risk is not source fragility. Its risk is **contract correctness**: this is the sprint that fixes the JSON shapes, and a shape transcribed wrong or a field silently renamed here propagates into both feed adapters and is expensive to unwind later. The principal risk axis is therefore **transcription fidelity**, not scope creep. The mitigating discipline is Goal 1's round-trip acceptance test (every field present, nothing renamed) and Goal 3's CI schema check, which together make a shape error fail loudly rather than ship.

A secondary axis is **silent visual regression**. Goal 2 rewires the entire data path; a subtle fetch or parse error could degrade a view without an outright crash. The mitigating discipline is Goal 2's strict acceptance bar — visual identity with the Sprint 1 deploy — and the §8 pre-launch step that establishes a trustworthy Sprint 1 visual baseline (closing the AT-1.5 thread) so "identical" is a real comparison and not a comparison against an unverified reference.

**Invariants / requirements this sprint's goals expose:**

- **FR-1 (modules converted to JSON with no structural change):** Goal 1 *is* this requirement. The softening mechanism is a "helpful" cleanup — renaming a field, flattening a nested object, dropping an unused key during transcription. Any such change breaks the head-start premise (Product Spec §2: "the MVP does not design a schema from scratch") and silently diverges the JSON shape from the prototype the four views still expect. Held by construction via Goal 1's round-trip test: the JSON must reproduce the original module object exactly.
- **FR-2 (app reads all data from JSON; nothing hard-coded):** Goal 2 *is* this requirement. The softening mechanism is a partial refactor that leaves one module inline "for now." Held by construction via Goal 2's `grep` acceptance check — no inline data objects may remain.
- **A1 / `chg`→`change` rename (CF-2):** the Data System Note §3 `prices.json` shape uses `change`; the prototype module may use `chg`. Goal 4's placeholder must use the *locked* field name. The risk is the placeholder being written against the un-renamed field, which would then disagree with the schema check and with Sprint 3's adapter. Held by construction by resolving CF-2 inside `sprint-002-spec.md` before launch (§8) so the spec, not memory, is the authority for the field name.
- **A2 / news seed backfill (CF-3):** Goal 4's `news.json` placeholders must carry `source:"seed"` and `tagStatus:"reviewed"` for the 12 prototype events. The risk is seeding them as `proposed`, which would make Sprint 6's review loop treat already-known events as unreviewed signal. Held by construction by resolving CF-3 inside `sprint-002-spec.md` before launch (§8).
- **Non-functional: public-repo, no credentials (Product Spec §8):** low exposure this sprint — no feed means no API key — but the CI schema-check step (Goal 3) must not introduce any secret. No softening expected; flagged only because Goal 3 touches CI.

**Inherited carry-forwards from the Sprint 1 retro:**

- **CF-2 (lock A1 — price overlay shape, `chg`→`change` rename):** must be resolved in `sprint-002-spec.md`. Blocks S2 execution. Captured in §8.
- **CF-3 (lock A2 — news seed backfill: `source:"seed"`, `tagStatus:"reviewed"` for the 12 prototype events):** must be resolved in `sprint-002-spec.md`. Blocks S2 execution. Captured in §8.
- **CF-5 (create `sprint-002-spec.md` from the implementation plan's S2 section + CF-2/CF-3 resolutions):** this is the sprint-open precondition itself. Captured as §8 step 1.
- **CF-1 (bump deploy-workflow action versions to Node 24-compatible before 2026-06-02):** maintenance; the retro explicitly states it blocks nothing until June. *Not* pulled into Sprint 2 scope — but if Sprint 2 lands close to June, it is a cheap opportunistic add. Left in §9 as a watch item, not a goal.
- **CF-4 (lock A6 — Google Finance via Sheets API vs. scraping):** the retro routes this to the Sprint 2 spec *or* the Sprint 3 spec. Recommendation: **defer A6 to the Sprint 3 spec.** A6 is a price-*source* decision; it has no bearing on the JSON store and resolving it now would pull Sprint 3 thinking into a Sprint 2 document. Noted in §9.

---

## §7 Estimated shape

- **Sessions:** 1–2. A focused single session is plausible given Sprint 1's ~1-hour duration and the transcription-heavy nature of the work; budget 2 if the Goal 2 refactor surfaces a parse or path issue.
- **Commits:** ~8–14. Rough split: ~7 for the static file conversions (one per file, or batched), 1–2 for the app fetch refactor, 1 for the CI schema-check step, 1–2 for the feed placeholders, 1 for README/spec housekeeping. **Ceiling: 20** — beyond that, suspect the refactor has grown past transcription.
- **Working exchanges:** ≤ 40. **Ceiling: 60** — crossing it means a goal has hit an unplanned obstacle (most likely a fetch-path or schema-validator issue); stop and reassess rather than push through.
- **Static JSON files created:** 7 (Goal 1) + 2 feed placeholders (Goal 4) = **9 files under `/data`**.
- **Schema files / fixtures:** 7 schema definitions + at least 1 deliberately-malformed test fixture for Goal 3's negative case.
- **CI steps added:** 1 (the JSON-schema check). The deploy workflow is otherwise untouched.
- **Renderer / UI delta:** **zero by design.** Goal 2's success is visual identity with Sprint 1. Any UI delta is a regression.
- **No parallel dispatch.** The four goals are near-linear (Goal 1 → Goal 2; Goal 3 and Goal 4 follow Goal 1). Goal 1 is the freeze-point; once its nine shapes are committed, Goals 2/3/4 could overlap, but the sprint is small enough that linear execution is the lower-risk default.

---

## §8 Pre-launch steps

1. **Create `docs/specs/sprint-002/sprint-002-spec.md`** (CF-5) from the Execution Plan §3 Sprint 2 section. This is the sprint-open precondition stated in the Sprint 1 retro.
2. **Resolve CF-2 inside `sprint-002-spec.md`** — lock the A1 decision: the price overlay shape and the `chg`→`change` field rename. The spec, not memory, becomes the authority Goal 4 and Sprint 3 read.
3. **Resolve CF-3 inside `sprint-002-spec.md`** — lock the A2 decision: the 12 prototype news events backfilled as `source:"seed"`, `tagStatus:"reviewed"`.
4. **Confirm AT-1.5 is closed** — perform the one-off manual visual click-through of the four views on the Sprint 1 live site (`https://verifygrit-admin.github.io/invest-metals-wellspring/`), so Goal 2's "visually identical to Sprint 1" acceptance bar compares against a verified baseline.
5. **Sanity-check repo state** — confirm `main` is green, the deploy workflow still redeploys, and the `/data` scaffold from Sprint 1 (currently `.gitkeep` placeholders) is as expected before the conversion overwrites it.
6. **Confirm CF-4 (A6) is explicitly routed to the Sprint 3 spec** and is *not* pulled into `sprint-002-spec.md` — a one-line note in the spec recording the deferral is sufficient.
7. **Launch Sprint** — fire the Launch Sprint directive with `sprint-002-spec.md` (now carrying the CF-2 and CF-3 resolutions) and this outline as source.

---

## §9 Outlook (forward-looking, non-binding)

Sprints 3 and 4 follow — the two thin-slice feeds, which the Execution Plan §4 dependency map shows can run in either order or in parallel once Sprint 2's JSON contract is fixed. Sprint 3 (price feed) carries the A6 source decision (CF-4, deferred here) and the project's first fragile external integration behind the `PriceAdapter` interface. Sprint 4 (news feed) carries the rule-based tagging risk. Operator interest or the relative readiness of the two data sources may set their order; nothing in Sprint 2 forces it. One maintenance item also rises on the horizon: CF-1 (Node 24-compatible action versions, due 2026-06-02) — if Sprints 3–4 land in early June, folding CF-1 into whichever sprint is in flight is a cheap opportunistic close. All of this is non-binding and subject to resequence; each sprint gets its own outline.

---

## §10 Revision log entry (to file at sprint close)

```
### 2026-MM-DD — Sprint 002 close (JSON store conversion)

Sprint 002 shipped: the prototype's five inline JS data modules converted to
seven static JSON files under /data; the app refactored to fetch all data from
/data at load (no data hard-coded in app code); a CI JSON-schema check guarding
the static files; and seed/placeholder prices.json and news.json reflecting the
locked A1 and A2 decisions. ~N commits on close; final numbers to confirm at retro.

Definition of Done progress: "all data read from /data JSON files" — met.
Deployed dashboard verified visually identical to the Sprint 1 deploy.

§3 sequencing reaffirmed: S1 → S2 → S3/S4 → S5 → S6 intact. Sprints 3 and 4
(the two thin-slice feeds) are next and may run in either order.

Carry-forwards resolved: CF-2 (A1 lock), CF-3 (A2 lock), CF-5 (sprint-002-spec
created). Carried forward: CF-1 (Node 24 action bump, due 2026-06-02);
CF-4 (A6 source decision) routed to the Sprint 3 spec.
```

### 2026-05-22 — Sprint 002 close (JSON store conversion) — FILED

Sprint 002 shipped: the prototype's five inline JS data modules converted to
seven static JSON files under /data; the app refactored to fetch all data from
/data at load (no data hard-coded in app code); a CI JSON-schema check
(`validate.yml`) guarding the static files; and seed/placeholder prices.json and
news.json reflecting the locked A1 and A2 decisions. 12 commits on close (11
implementation/CI commits `bf77154`..`760350a`, plus this revision-log commit) —
within the 8–14 target, well under the ceiling of 20.

Definition of Done progress: "all data read from /data JSON files" — met.
Goal 2 visual-identity acceptance: PASS — manual click-through of all four views
(Map, Matrix, Strategies, Terminal) against the Sprint 1 baseline; all four match.
Deployed dashboard verified visually identical to the Sprint 1 deploy.

CI status on close: both GitHub Actions workflows green on push to main —
"Validate data" (validate.yml, first real run, Node 20: validate + tests pass)
and "Deploy to GitHub Pages". Post-deploy live verification: live root and all 9
data/*.json return HTTP 200 from the production URL, confirming data/ assembled
into _site/data/ and the relative DATA_BASE path resolves in production.

§3 sequencing reaffirmed: S1 → S2 → S3/S4 → S5 → S6 intact. Sprints 3 and 4
(the two thin-slice feeds) are next and may run in either order.

Carry-forwards resolved: CF-2 (A1 lock), CF-3 (A2 lock), CF-5 (sprint-002-spec
created). Carried forward: CF-1 (Node 24-compatible deploy-workflow action bump,
due 2026-06-02); CF-4 (A6 price-source decision) routed to the Sprint 3 spec.

---

*Sprint 002 Operator Outline. invest-metals is a Wellspring research product.*