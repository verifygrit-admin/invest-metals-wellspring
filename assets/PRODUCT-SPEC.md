# invest-metals — Product Specification

**Project:** Industrial & Tech-Critical Metals — Investment Outlook Dashboard
**Owner:** Wellspring
**Status:** MVP specification · v1.0
**Repo:** public, GitHub Pages deployment

---

## 1. Purpose

`invest-metals` turns the existing four-view metals dashboard prototype into a deployed, self-updating product by wiring in two live data sources: near-real-time pricing and a tagged news/signal feed. The MVP goal is a **thin slice of both feeds, working end to end** — not a complete data system. It proves the architecture and de-risks the two feeds before any build-out.

This spec is the source document for the Execution Plan, Sprint Series, Operator Outline, and README.

---

## 2. What already exists

The prototype is complete and is the starting asset. It is a single self-contained HTML file with four views, backed by five JavaScript data modules:

| Module | Contents |
|---|---|
| `data.js` | 15 metals; country production/processing/application shares; trade flows |
| `matrix.js` | 6 actor types, 5 methods of influence, per-metal actor-lever weights |
| `strategy.js` | 9 pricing/permission strategy plays with dated instances |
| `terminal.js` | Instruments, projection model, news events, winners/losers verdicts |
| `worldmap.js` | Simplified world map geometry |

The four views — Geographic Map, Movers Matrix, Strategies, Terminal — are described in the project's companion note and are **not changing** in this MVP. The MVP work is data plumbing, not UI redesign.

**Key head start:** the shape of every data structure already exists in these modules. The MVP does not design a schema from scratch — it converts the existing modules to JSON files and makes two of them (prices, news) self-updating.

---

## 3. Scope

### 3.1 In scope (MVP)

- Convert the prototype's static JS data modules to a flat-file JSON store.
- A **price feed**: a scheduled script that fetches near-real-time prices for the exchange-traded subset of instruments and writes updated JSON.
- A **news feed**: a scheduled script that pulls articles from free sources, applies rule-based strategy/method/actor tagging, and writes updated JSON.
- Wire both feeds into the existing Terminal view.
- Deploy the static site via GitHub Pages, with feeds refreshed via GitHub Actions on a schedule.

### 3.2 Out of scope (MVP — see Open Items)

- A backend service (the architecture is designed for one later; the MVP does not build one).
- Live data for the non-exchange-traded metals (gallium, germanium, rhodium, dysprosium have no ticker — they remain on representative/assessed values).
- Fully automatic news tagging via NLP (the MVP uses rule-based tagging with human review).
- Custom user-assembled baskets.
- A recycling/secondary-supply vector.
- Any change to the four-view UI beyond what the feeds require.

---

## 4. Data sources

### 4.1 Price feed

**Source (MVP):** a free pricing source accessed via CLI/script. The intended path is Google Finance data — note the honest constraint below — with the architecture isolating the source behind an adapter.

**Known fragility — must be designed around:** there is no official, supported Google Finance API; it was discontinued. "Google Finance via CLI" in practice means either the `GOOGLEFINANCE()` function inside a Google Sheet (read out via the Sheets API) or unofficial scraping of finance web pages. Both are free; both can break without notice when Google changes a page. This is acceptable for an MVP but **the price feed must sit behind a `PriceAdapter` interface** so the source can be swapped (Yahoo Finance, Stooq, Alpha Vantage free tier) without touching the rest of the system.

**Coverage limit — must be stated in the UI:** only the exchange-traded instruments can carry live prices. The metals with no ticker (gallium, germanium, rhodium, dysprosium, and others without a clean instrument) stay on representative or assessed values. The Terminal must visibly distinguish a live price from a representative one.

**Output:** `prices.json` — one record per instrument ticker: `{ ticker, price, change, currency, asOf, source, isLive }`.

### 4.2 News & signal feed

**Source (MVP):** free news sources — RSS feeds from commodity and trade publications, and optionally one free news-API tier. Social media is a stretch goal, not MVP-critical.

**Tagging — the hard part:** each article must carry the three inline markers the Terminal already renders: probable **strategy** (from `strategy.js`), **method of influence** (from `matrix.js` levers), and **actor types** (from `matrix.js` actors), plus a signed price-signal value. Fully automatic classification is a real NLP problem and is out of MVP scope. The MVP uses **rule-based tagging**: keyword and source rules produce a *proposed* tagging, which a human reviews and corrects before it goes live. The Operator Outline owns this review step.

**Output:** `news.json` — one record per article: `{ id, date, headline, excerpt, url, source, metals[], strategies[], lever, actors[], impact, tagStatus }` where `tagStatus` is `proposed` or `reviewed`.

---

## 5. Data system

**Decision: flat-file JSON store. No database.**

The term "JSONB" specifically denotes a PostgreSQL column type; using it literally would require running Postgres. What this project needs — and the correct choice for this MVP — is a **flat-file JSON store**: the data layers become `.json` files on disk, the feed scripts write updated JSON on a schedule, and the static app reads JSON. No database, no server-side query layer, no hosting cost. This is detailed in the Data System Note.

**Upgrade path:** if the project later outgrows flat files (many metals, high refresh frequency, query needs), the natural migration is Postgres with `JSONB` columns — the same JSON documents, now queryable. The flat-file schema is designed to map cleanly onto that. This is a deliberate later option, not an MVP task.

---

## 6. Architecture

```
invest-metals/
  /data/            flat-file JSON store (the single source of truth)
    metals.json, matrix.json, strategy.json, instruments.json,
    projection.json, winlose.json, worldmap.json   (static — converted once)
    prices.json     (feed-updated)
    news.json       (feed-updated)
  /feeds/           the two refresh scripts
    price-adapter/  PriceAdapter interface + Google Finance implementation
    news-adapter/   NewsAdapter interface + RSS implementation + tagging rules
  /app/             the static site (the four-view dashboard)
  /.github/workflows/   GitHub Actions: scheduled feed refresh + Pages deploy
  README.md
```

**Refresh model (MVP):** static-refresh. A GitHub Actions workflow runs the feed scripts on a schedule (e.g. price feed every 15–30 min during market hours; news feed hourly), the scripts write updated JSON, the workflow commits the JSON back to the repo, GitHub Pages redeploys the static site. No running server.

**Adapter principle:** both feeds sit behind a defined interface (`PriceAdapter`, `NewsAdapter`). The rest of the system depends on the interface and the JSON shape, never on the specific source. Swapping Google Finance for Yahoo, or adding a news source, is a new adapter implementation — nothing else changes. This is what makes the later move to a backend service additive rather than a rewrite.

---

## 7. Functional requirements

| # | Requirement |
|---|---|
| FR-1 | The prototype's static data modules are converted to JSON files under `/data`, with no change to their structure. |
| FR-2 | The app reads all data from JSON files; no data is hard-coded in app code. |
| FR-3 | The price feed fetches near-real-time prices for all exchange-traded instruments and writes `prices.json`. |
| FR-4 | The price feed sits behind a `PriceAdapter` interface; the Google Finance implementation is swappable. |
| FR-5 | The Terminal visibly distinguishes a live price from a representative/assessed one (`isLive` flag surfaced in the UI). |
| FR-6 | The news feed pulls from free sources and writes `news.json`. |
| FR-7 | Each news article carries proposed strategy/method/actor tags and a price-signal value via rule-based tagging. |
| FR-8 | News articles show their `tagStatus`; only `reviewed` articles are treated as confirmed signal. |
| FR-9 | A GitHub Actions workflow refreshes both feeds on a schedule and redeploys the site. |
| FR-10 | The site deploys and runs as a static GitHub Pages site with no backend. |

---

## 8. Non-functional requirements

- **Cost:** zero hosting cost — static site on GitHub Pages, scheduled jobs on GitHub Actions free tier.
- **Resilience:** a feed failure must not break the site — the app falls back to the last good JSON and shows staleness (`asOf`).
- **Honesty:** the representative-vs-live distinction from the prototype is preserved and made visible. Nothing is presented as live that is not.
- **Transparency:** the projection remains a labeled heuristic, not investment advice. The repo and its README state this.
- **Public repo:** no proprietary logic, credentials, or API keys in the repo. Any key (if a news API tier is used) goes in GitHub Actions secrets, never in committed code.

---

## 9. Known constraints & honest caveats

1. **The price feed is fragile.** Free Google Finance access is unofficial and can break. Mitigated by the adapter pattern, not eliminated.
2. **Live prices cover only the exchange-traded subset.** Roughly a third of the 15 metals have no ticker; they stay representative. This is a data-reality limit, not a build gap.
3. **News tagging is rule-based, not intelligent.** It produces proposals a human must review. Accuracy depends on the rules and the reviewer.
4. **Static-refresh has latency.** "Near-real-time" means as fresh as the last scheduled run, not tick-by-tick. Acceptable for an outlook dashboard; not a trading tool.
5. **The projection is a heuristic.** It is not a forecast and not investment advice — unchanged from the prototype.

---

## 10. Open items (post-MVP)

- Backend service, if static-refresh latency or query needs require it.
- Postgres + JSONB migration, if flat files are outgrown.
- Automatic (NLP) news tagging to reduce the human review load.
- Assessed-price feeds for the non-exchange-traded metals.
- Custom user-assembled baskets; a recycling/secondary-supply vector.
- Social-media signal sources beyond news RSS.

---

*invest-metals is a Wellspring research product. All non-feed data is representative; the projection is a heuristic. Nothing in the product constitutes investment advice.*
