# invest-metals — Operator Outline

**Companion to:** Product Specification v1.0, Execution Plan v1.0
**Purpose:** the run document for developing the MVP in Mission Control and operating it afterward.

---

## 1. What this document is

This outline is for the operator driving the build — translating the Execution Plan's sprints into work for Claude Code, and, once the MVP is live, running the recurring tasks the product needs. It assumes the Product Spec and Execution Plan are the authority on *what* is built; this document covers *how it is run*.

---

## 2. Roles

| Role | Who | Responsibility |
|---|---|---|
| Operator | Chris | Drives sprints, reviews output, owns the news-tagging review gate, makes scope calls |
| Builder | Claude Code | Implements sprint work against the spec |
| Reviewer | Claude (Mission Control) | Generates sprint prompts, reviews terminal output, advises next step |

---

## 3. Build phase — running the sprints

The build is six sprints (Execution Plan §3). For each sprint:

1. **Open the sprint.** State the sprint goal and its Definition-of-Done line to Claude Code, with the Product Spec and Execution Plan in context.
2. **Work the sprint.** Claude Code implements; the operator reviews output against the sprint's "done when" statement.
3. **Verify before closing.** Do not advance until the sprint's "done when" is demonstrably true — for a deployable sprint, that means checking the live GitHub Pages site, not just local.
4. **Commit and deploy.** Every sprint after S1 ends with `main` deploying a working site.

**Sprint sequence and gates:**

- **S1 → S2:** S1 begins with Claude Code creating the public repo via `gh repo create` inside the operator's authenticated GitHub session. Gate is a live, reachable GitHub Pages URL.
- **S2 → S3/S4:** gate is the dashboard running data-driven from `/data` with no behavior change.
- **S3 and S4** may run in parallel; both gate on a thin slice visibly working in the Terminal.
- **S5:** gate is an unattended scheduled refresh plus a passed failure simulation.
- **S6:** gate is every Definition-of-Done item verified.

**On the price feed (S3):** expect the Google Finance source to be the fragile part. If it resists, the correct move is *not* to fight the source — it is to implement an alternative adapter (Yahoo Finance, Stooq). The `PriceAdapter` interface exists precisely so this is a clean swap. Treat a source switch as normal, not as failure.

---

## 4. The news-tagging review gate — operator-owned

This is the one recurring task that cannot be automated in the MVP and is the operator's standing responsibility.

The news feed produces articles tagged `proposed` by rule-based logic. Rules are imperfect. Before an article counts as confirmed signal, the operator reviews it:

1. Open articles with `tagStatus: "proposed"`.
2. For each: check the proposed **strategy**, **method of influence**, **actor** tags, and the **impact** value against the article's actual content.
3. Correct any wrong tag.
4. Mark the article `reviewed`.

Only `reviewed` articles are treated by the Terminal as confirmed signal. `proposed` articles are visible but flagged as unverified.

**Cadence:** review should run at least as often as the news feed's editorial value decays — for an outlook product, a daily or every-other-day pass is reasonable. The point is that no `proposed` article sits unreviewed long enough to mislead.

**Improving the rules:** when the operator repeatedly corrects the same kind of mistag, that pattern is a rule improvement. Feed it back — a corrected rule reduces future review load. Over time the `proposed` tags get better and the gate gets lighter.

---

## 5. Operating phase — recurring tasks

Once the MVP is live, these are the standing tasks:

| Task | Cadence | Owner |
|---|---|---|
| News-tagging review (`proposed → reviewed`) | Daily / every other day | Operator |
| Check feed health (`asOf` not stale; no failures) | Weekly | Operator |
| Tagging-rule improvements from review patterns | As patterns emerge | Operator |
| Static-data refresh (matrix weights, strategies, instruments) | Occasional / as the world changes | Operator |
| Price-source check (is the adapter still working) | Weekly, or on visible breakage | Operator |

---

## 6. Health checks

The product is healthy when:

- The GitHub Pages site loads and all four views work.
- `prices.json` and `news.json` carry a recent `asOf`.
- The latest GitHub Actions runs succeeded.
- No `proposed` article is older than one review cycle.
- The Terminal correctly shows live vs. representative prices.

If a feed breaks: the site stays up on last-good data (the resilience rule). Fix the feed; do not let a broken feed pressure a rushed change to the live site.

---

## 7. Scope discipline

The MVP scope is fixed by Product Spec §3. The operator is the guard against scope creep. The recurring temptations and the answer:

- *"While we're here, let's redesign a view"* — no; UI is out of scope (Spec §3.2).
- *"Let's add the non-traded metals to the live feed"* — no; they have no ticker (Spec §4.1). Post-MVP.
- *"Let's automate the tagging"* — no; NLP tagging is post-MVP (Spec §10). The review gate stays.
- *"Let's add a backend now"* — no; static-refresh is the MVP model. The architecture already allows a backend later.

A genuine new requirement goes into Product Spec §10 (Open Items), not into the current sprint.

---

## 8. MVP acceptance

The build phase closes when the operator runs the Definition of Done (Execution Plan §2) and verifies every item true on the live site. At that point the project moves from build to operating phase, and this document's Sections 4–6 become the standing routine.

---

*Companion to the invest-metals Product Specification and Execution Plan. Wellspring research product.*