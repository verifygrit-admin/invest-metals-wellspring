## Sprint 001 Retro — invest-metals-wellspring

**Date:** 2026-05-22
**Sprint:** S1 — Repo creation & static foundation
**Session duration:** ~1 hour (approximate)

---

### What shipped

- Public repo `invest-metals-wellspring` at `https://github.com/verifygrit-admin/invest-metals-wellspring`
- Product Spec §6 directory scaffold committed (`data/`, `feeds/price-adapter/`, `feeds/news-adapter/`, `app/`, `.github/workflows/`), each with a `.gitkeep` placeholder
- Prototype deployed byte-identical as `app/index.html` (151,360 bytes; diff against `assets/metals_geographic_outlook.html` empty)
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) live — redeploys on every push to `main`
- Live site confirmed at `https://verifygrit-admin.github.io/invest-metals-wellspring/`
- README updated with live URL (commit `d6fad27`)

**Sprint goal met:** repo exists, prototype deployed, Pages live, four views present and byte-identical to the local prototype.

**Verification note on AT-1.5:** the live site was verified *programmatically* — HTTP 200, served HTML byte-identical to `app/index.html`, all four view containers (`mapView`, `matrixView`, `strategyView`, `terminalView`) and all render functions present. A *visual* click-through of the four views on the live page was **not** performed in this session. The literal AT-1.5 wording ("render and switch correctly") is best closed with a quick manual visual pass.

---

### What was learned

**Enabling GitHub Pages on a net-new repo is the friction point — two attempts failed before the deploy ran green.** The actual sequence:

1. **`gh api ... -f source='{...}'` → HTTP 422.** This was a *field-encoding* error, not a permission or capability error: `gh api -f` sends string-typed form fields, so `source` arrived as a JSON string when the API expects an object (`"... is not of type object"`). This call used the operator's authenticated `gh` PAT (`repo` scope), not a workflow token.
2. **First deploy run with `enablement: true` on `configure-pages@v4` → failed.** Error: `Create Pages site failed / HttpError: Resource not accessible by integration`. The workflow's ephemeral `GITHUB_TOKEN` (an "integration" token) is not permitted to *create* a net-new Pages site, even with `pages: write`.
3. **Rerun of the same workflow → green.** `configure-pages@v4` succeeded, then `upload-pages-artifact` and `deploy-pages` completed. The Pages site existed by the time of the rerun.

**Unconfirmed:** the *exact* reason Pages became enabled between the failed run and the green rerun was not verified in-session. It was either the operator enabling Pages via the repo UI (Settings → Pages → Source: GitHub Actions) or the prior `enablement: true` attempt registering. The retro does not assert which.

**Practical takeaways for future net-new repos:**
- The corrected first-enable call is `gh api repos/:owner/<repo>/pages --method POST -f build_type=workflow` (drop the `source` field entirely for the workflow build type). This path was recommended but **not executed this session**, so it is documented as the likely fix, not a proven one.
- `gh api -f` is string-only; for nested object fields use `-F 'source[branch]=main' -F 'source[path]=/'` or omit optional fields.
- `enablement: true` on `configure-pages@v4` cannot bootstrap a net-new Pages site under the workflow's integration token; rely on a one-time enable (operator PAT via `gh api`, or the UI) instead of expecting the workflow to self-enable from cold.

---

### Carry-forward

| # | Item | Category | Blocks |
|---|---|---|---|
| CF-1 | Bump `actions/checkout`, `configure-pages`, `upload-pages-artifact`, `deploy-pages` to Node 24-compatible versions before 2026-06-02 (runner deprecation warning) | Maintenance | Nothing until June |
| CF-2 | Lock A1 decision (price overlay shape, `chg`→`change` rename) in the Sprint 2 spec before execution | Decision required | S2 execution |
| CF-3 | Lock A2 decision (news seed backfill — `source:"seed"`, `tagStatus:"reviewed"` for the 12 prototype events) in the Sprint 2 spec | Decision required | S2 execution |
| CF-4 | Lock A6 decision (Google Finance via Sheets API vs. scraping) in the Sprint 2 spec or defer to the S3 spec | Decision required | S3 execution |
| CF-5 | Create `docs/specs/sprint-002/sprint-002-spec.md` from the implementation plan's S2 section + CF-2/CF-3 resolutions before opening S2 | Scaffolding | S2 open |

---

### A3 status — closed

The deploy workflow assembles `data/` into `_site/data/` at build time (`cp -r data/. _site/data/`). S2 fetch paths therefore inherit `data/*.json` relative to the app root. No further decision needed.

---

### Next session open condition

Sprint 2 execution opens only after `sprint-002-spec.md` exists and CF-2 + CF-3 are resolved within it.

---

*Sprint 1 complete. invest-metals is a Wellspring research product.*
