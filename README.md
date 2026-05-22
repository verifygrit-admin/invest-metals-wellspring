# invest-metals

**Industrial & Tech-Critical Metals — Investment Outlook Dashboard**

A four-view dashboard tracking 15 industrial and tech-critical metals across geography, market movers, market strategies, and an investor terminal. A Wellspring research product.

🔗 **Live site:** _(GitHub Pages URL — set after Sprint 1)_

---

## What this is

`invest-metals` is an investment-outlook dashboard for metals that matter to the technology sector — precious metals, battery metals, rare earths, and minor tech metals. It presents:

- **Geographic Map** — where metals are extracted, processed, and used, with trade flows.
- **Movers Matrix** — which actor types move each market, and by what method of influence.
- **Strategies** — the pricing and permission plays movers run, with dated real-world instances.
- **Terminal** — investable instruments, a framework-based price projection, a tagged news feed, and a winners/losers-by-horizon read.

It is built as a static site backed by a flat-file JSON data store, with two self-updating feeds: near-real-time prices and a tagged news/signal feed.

---

## Honest scope — read this

This is a **research prototype**, not a finished analytical product or a trading tool:

- **Most data is representative.** Production/processing shares, the actor-influence matrix, and the strategy verdicts are a structured reading of the well-established public picture — directionally reliable, not sourced or audited.
- **Live prices cover only part of the roster.** Exchange-traded instruments carry live prices; metals with no ticker (e.g. gallium, germanium, rhodium, dysprosium) stay on representative values. The Terminal marks the difference.
- **News tagging is rule-based.** Articles are auto-tagged by keyword rules and must be human-reviewed before they count as confirmed signal.
- **The projection is a heuristic.** It composes the dashboard's own framework into directional bands. **It is not a forecast and not investment advice.**

Nothing in this product constitutes investment advice.

---

## Architecture

```
invest-metals/
  /data/      flat-file JSON store — the single source of truth
              static datasets (converted from the prototype) + prices.json + news.json
  /feeds/     the two refresh scripts
              price-adapter/  — PriceAdapter interface + Google Finance implementation
              news-adapter/   — NewsAdapter interface + RSS + rule-based tagging
  /app/       the static four-view dashboard
  /.github/workflows/  — GitHub Actions: scheduled feed refresh + Pages deploy
```

**Data system:** flat-file JSON. No database. The app reads JSON; the feed scripts write JSON; GitHub Actions runs the feeds on a schedule and commits the results. See `DATA-SYSTEM.md`.

**Feeds behind adapters:** each feed sits behind an interface (`PriceAdapter`, `NewsAdapter`) so a source can be swapped without touching the rest of the system.

**Refresh model:** static-refresh — the site is static; data freshness is "as of the last scheduled run." Designed so a backend service can be added later without a rewrite.

---

## Getting started

**Prerequisites:** Node.js (LTS).

```bash
git clone https://github.com/<owner>/invest-metals.git
cd invest-metals

# install feed-script dependencies
npm install

# run the dashboard locally — serve the static app
npx serve app

# run the feeds manually (writes /data/prices.json and /data/news.json)
node feeds/price-adapter/run.js
node feeds/news-adapter/run.js
```

In deployment, the feeds run automatically via GitHub Actions on a schedule; no manual run is needed.

---

## The data feeds

**Price feed** — fetches near-real-time prices for the exchange-traded instruments from a free source (Google Finance, via the `PriceAdapter`). Note: free Google Finance access is unofficial and can break; the adapter pattern means switching to an alternative (Yahoo Finance, Stooq) is a contained change.

**News feed** — pulls articles from free commodity/trade RSS sources, applies rule-based tagging (probable strategy, method of influence, actor types, price-signal), and writes them as `proposed`. An operator reviews and promotes them to `reviewed`; only `reviewed` articles count as confirmed signal.

---

## Documentation

| Document | Purpose |
|---|---|
| `PRODUCT-SPEC.md` | What is built — scope, data sources, architecture, requirements |
| `DATA-SYSTEM.md` | The flat-file JSON store — schema, refresh model, upgrade path |
| `EXECUTION-PLAN.md` | The MVP build — six-sprint series with a Definition of Done |
| `OPERATOR-OUTLINE.md` | Running the build and operating the live product |
| _Companion Note_ | Background — the original four-view prototype and its provenance |

---

## Status

MVP in development. Built as a six-sprint series (see `EXECUTION-PLAN.md`). The MVP proves a thin slice of both data feeds end to end, deployed on GitHub Pages.

## Roadmap (post-MVP)

Backend service · Postgres/JSONB migration if flat files are outgrown · automatic (NLP) news tagging · assessed-price feeds for non-traded metals · custom user baskets · a recycling/secondary-supply vector · social-media signal sources.

---

## License & contributions

_(Set license before public release.)_ This is a Wellspring research product. No proprietary logic or credentials belong in this public repository; API keys, if any, live in GitHub Actions secrets.

---

*invest-metals — a Wellspring research product. All non-feed data is representative; the projection is a heuristic. Nothing here is investment advice.*
