# invest-metals — Execution Plan & Sprint Series

**Companion to:** Product Specification v1.0
**Goal:** a lightweight MVP — a thin slice of both data feeds, working end to end, deployed on GitHub Pages.

---

## 1. Execution principles

1. **Thin slice, both feeds.** The MVP proves price *and* news end to end, each on a small set, rather than building either out fully. The two feeds carry different risks (price = source fragility; news = tagging), and both unknowns must be hit early.
2. **Convert before connecting.** The prototype's data must be in the JSON store before any feed is wired — the JSON store is the contract every later sprint depends on.
3. **Adapter-first.** Every feed is built behind its interface from the first sprint, so the fragile source is isolated from day one.
4. **Deployable every sprint.** After Sprint 1, `main` always deploys a working GitHub Pages site. No sprint leaves the site broken.
5. **Honesty preserved.** The representative-vs-live distinction and the heuristic-not-advice framing survive into the deployed product.

---

## 2. Definition of Done (MVP)

The MVP is done when all of the following are true:

- The four-view dashboard deploys and runs as a static GitHub Pages site.
- All data is read from `/data` JSON files; nothing is hard-coded in app code.
- `prices.json` is refreshed on a schedule with near-real-time prices for the exchange-traded instruments; the Terminal shows live vs. representative.
- `news.json` is refreshed on a schedule; articles carry rule-proposed strategy/method/actor tags; the Terminal news dock renders them and shows `tagStatus`.
- A GitHub Actions workflow runs both feeds on schedule and redeploys.
- The README lets a new operator set up and run the project.

---

## 3. Sprint series

Six sprints. Each is small and independently shippable. Each sprint statement names what "done" means for that sprint.

### Sprint 1 — Repo creation & static foundation
**Goal:** the repo exists, the prototype lives in it, and it deploys on GitHub Pages, unchanged.
- Create the public `invest-metals` repo via the `gh` CLI (`gh repo create`), run by Claude Code within the operator's authenticated GitHub session and permissions envelope.
- Initialize the repo structure (per Product Spec §6).
- Move the prototype's app into `/app`.
- Configure GitHub Pages to serve `/app`.
- Confirm the four-view dashboard deploys and runs live.
**Done when:** the public repo exists and the prototype is reachable at its GitHub Pages URL, identical to the local file.

### Sprint 2 — JSON store conversion
**Goal:** the prototype's static JS modules become JSON files; the app reads them.
- Convert `data.js`, `matrix.js`, `strategy.js`, `terminal.js`, `worldmap.js` into the `/data` JSON files (Data System Note §2).
- Refactor the app to fetch JSON at load instead of using inline JS objects.
- Add the CI JSON-schema check for the static files.
**Done when:** the deployed dashboard is visually identical to Sprint 1 but is now data-driven from `/data`.

### Sprint 3 — Price feed, thin slice
**Goal:** live prices for a small set of exchange-traded instruments, end to end.
- Define the `PriceAdapter` interface.
- Implement the Google Finance adapter (with the §9 fragility caveat understood).
- Fetch prices for a thin slice — e.g. 5–6 liquid instruments (GLD, SLV, COPX, ALB, FCX, NEM).
- Write valid `prices.json` with `isLive` flags; representative values retained for non-traded metals.
- Wire `prices.json` into the Terminal; show live vs. representative distinctly.
**Done when:** the Terminal shows real, recent prices for the thin slice, correctly marked, with representative values clearly distinct.

### Sprint 4 — News feed, thin slice
**Goal:** real articles from free sources, rule-tagged, in the news dock.
- Define the `NewsAdapter` interface.
- Implement an RSS adapter pulling from 2–3 free commodity/trade sources.
- Build the rule-based tagger: keyword/source rules → proposed strategy/method/actor tags + impact.
- Write valid `news.json` with `tagStatus: "proposed"`.
- Wire `news.json` into the Terminal news dock; render the three tag markers and `tagStatus`.
**Done when:** the news dock shows real, recent, rule-tagged articles, each marked `proposed`.

### Sprint 5 — Scheduled refresh & resilience
**Goal:** both feeds run themselves; failure is safe.
- GitHub Actions workflow: scheduled runs of both feed scripts, commit updated JSON, redeploy.
- Implement the resilience rule — a failed feed leaves the last good JSON intact.
- Surface `asOf` staleness in the UI.
**Done when:** the site updates on schedule with no manual action, and a simulated feed failure does not break it.

### Sprint 6 — Review loop, docs & MVP close
**Goal:** the tagging review loop works; the project is operable by someone new.
- Implement the `proposed → reviewed` path: an operator can confirm/correct tags and mark an article `reviewed`.
- Confirm the Terminal treats only `reviewed` items as confirmed signal.
- Finalize the README.
- MVP acceptance pass against the Definition of Done (§2).
**Done when:** every Definition of Done item is verified true and the README lets a new operator run the project.

---

## 4. Sprint dependency map

```
S1 Repo creation & static foundation
   └─ S2 JSON store conversion
        ├─ S3 Price feed (thin slice)
        └─ S4 News feed (thin slice)
             └─ S5 Scheduled refresh & resilience
                  └─ S6 Review loop, docs & MVP close
```

S3 and S4 both depend on S2 and can be done in either order or in parallel. Everything else is linear.

---

## 5. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Google Finance access breaks | Medium | `PriceAdapter` isolates it; swapping to Yahoo/Stooq is a new adapter, not a rewrite |
| Rule-based tagging is low-accuracy | Medium | `proposed`/`reviewed` split — a human gate catches errors; rules improve over sprints |
| GitHub Actions schedule limits / minutes | Low | Free-tier scheduled jobs are sufficient at MVP cadence; tune frequency if needed |
| Scope creep into UI redesign | Medium | Spec §3.2 fixes the four-view UI as out of scope; sprints touch data plumbing only |
| Feed write corrupts good data | Low | Resilience rule (S5) — validate before write, never write partial files |

---

## 6. Out of scope (this MVP)

Backend service; Postgres/JSONB migration; automatic NLP tagging; assessed-price feeds for non-traded metals; custom baskets; recycling vector; social-media sources. All carried in Product Spec §10.

---

*Companion to the invest-metals Product Specification. Wellspring research product.*
