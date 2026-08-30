# MacroNations — Introduction to Finance

An interactive, playable finance course that lives on the MacroNations platform alongside
StrategyArena. Same design language, same Supabase backend, **fully isolated `fin_` data**.

## Files

| File | What it is |
|---|---|
| `finance-curriculum.html` | The book. 14-chapter blended survey with live spreadsheets, quizzes, and arena links. Chapters 1–3 fully written; 4–14 are navigable and being authored. |
| `finance-retirement.html` | Arena — **Compounding Lab** (Ch 3 & 14): lifetime savings simulation vs a head-start ghost saver. |
| `finance-dcf.html` | Arena — **Valuation Arena** (Ch 6): build a DCF on 4 companies, make Buy/Hold/Sell calls. |
| `finance-portfolio.html` | Arena — **Portfolio Builder** (Ch 8 & 10): allocate across 5 assets on a live efficient frontier. |
| `finance-options.html` | Arena — **Options Lab** (Ch 12): multi-leg payoff builder with Black–Scholes pricing. |
| `finance-market-floor.html` | Arena — **Trading Floor** (Ch 11): trade a 30-day market vs buy-and-hold. |
| `fin-progress.js` | Progress reporter (`FINProgress`). Same Supabase project; writes to `fin_` tables. |
| `fin-schema.sql` | Creates the isolated `fin_` tables + RLS + the course row. **(Already run.)** |

## Hosting

All files must be served from the **same origin** as the StrategyArena/MacroNations app
(the same GitHub Pages repo), so the Supabase login session is shared — a student who signs
into the console is automatically authenticated in the book and arenas, no second login.
Keep `fin-progress.js` in that repo next to the HTML files (referenced by relative path).

## Supabase

Same project as StrategyArena (`qgelvmefyexyzpwqupev`). Auth is project-level, so the shared
session just works. Course data is isolated in `fin_`-prefixed tables:
`fin_courses`, `fin_enrollments`, `fin_chapter_progress`, `fin_arena_results`,
`fin_telemetry`, `fin_profiles`, `fin_subscriptions`, `fin_platform_settings`.

The seeded course row (`fin_courses`) has a fixed id and a `FINANCE` join code. To own it,
set its `owner_id` to your auth UID (Supabase → Authentication → Users).

## Access gating

Off by default — the whole book is open. To gate chapters behind a subscription, set
`FIN_GATE_ENABLED = true` near the top of the engine script in `finance-curriculum.html`
(free preview through `FIN_FREE_THROUGH`, default 3). Gating reads `fin_profiles` /
`fin_subscriptions`; point those at the `sa_` equivalents instead if you'd rather share one
subscription across both courses.

## Console / gradebook integration

The existing MacroNations console (`index.html`) reads the `sa_` tables, so it won't show
finance progress out of the box. Two options:
1. **Keep isolated (current):** finance progress lives in `fin_` tables; build a small
   finance view or extend the console to read `fin_` for this course.
2. **Share the platform tables:** point `fin-progress.js` at `sa_chapter_progress` /
   `sa_arena_results` and register the course in `sa_courses` so the existing gradebook
   picks it up automatically. (Trades isolation for zero console work.)

## Live spreadsheets

Chapters embed editable, auto-recalculating spreadsheet widgets (`.fin-sheet`), driven by a
small `COMPUTE` registry in the engine. Add a new one by dropping a `data-sheet="key"` block
in a chapter and adding `COMPUTE.key` to the engine script.

## Build status — COMPLETE

- ✅ Infrastructure: `fin-progress.js`, `fin-schema.sql`
- ✅ Book scaffold, design system, engine, live-spreadsheet framework
- ✅ All 14 chapters, front matter, worked examples, concept checks, exercises + solutions, graded quizzes
- ✅ 12 live in-browser spreadsheets (one-dollar machine, PV/NPV, compounding/EAR, loan amortizer, bond pricer, DDM, NPV/IRR, two-asset diversification, CAPM, WACC, credit-card payoff, 401(k) match)
- ✅ All 5 arenas (Compounding Lab, Valuation/DCF, Portfolio Builder, Options Lab, Trading Floor)
- ✅ Verified end-to-end in a headless browser: every sheet computes, every quiz grades, no page errors

### Chapter map
1. What Finance Is · 2. The Time Value of Money · 3. Compounding & Growth · 4. Annuities, Loans & Mortgages · 5. Bonds & Interest Rates · 6. Valuing a Company (DCF arena) · 7. Investment Decisions: NPV & IRR · 8. Risk & Return (Portfolio arena) · 9. Cost of Capital & Capital Structure · 10. Portfolios & Diversification (Portfolio arena) · 11. Market Efficiency & Behavior (Trading Floor arena) · 12. Options & Derivatives (Options arena) · 13. Budgeting, Credit & Debt · 14. Building Wealth & Retirement (Compounding Lab arena)
