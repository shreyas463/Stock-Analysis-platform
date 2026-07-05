<div align="center">

# Basis

**An evidence-based investing workbench. Know why you own it.**

Research stocks · honest statistical forecasts · paper trading with exact accounting

`Next.js 15` · `React 19` · `TypeScript strict` · `Tailwind 4` · `SQLite + Drizzle` · `lightweight-charts`

</div>

---

Basis is a complete rebuild of this repository's original stock-analysis platform. It is a
single, self-contained TypeScript application for learning a disciplined investing process:
**research → decide → practice → review** — with paper money, never real money.

> **Disclaimer:** Basis is an educational tool. Nothing it displays is financial advice, and
> simulated results do not predict real returns.

## Why the rebuild?

The original app (Flask + Firebase + Next 14/MUI) had structural problems that could not be
patched around — the full audit is in [ARCHITECTURE.md](ARCHITECTURE.md#the-audit-that-motivated-the-rebuild):

- **Fabricated data everywhere.** Failed API calls silently fell back to randomly generated
  prices, news, forecasts and "top gainers" presented as real.
- **A fake ML advisor.** The ARIMA service added literal `random.uniform(-5, 5)` noise to its
  confidence scores, hardcoded `is_good_buy: True` when data was missing, and adjusted
  forecasts post-hoc with information the model could not have had.
- **Unsafe money handling.** Float arithmetic on balances, no transactions around trades
  (a crash mid-trade could create or destroy money), no idempotency.
- **Committed secrets.** Two live API keys were hardcoded in the source. If you forked this
  repo, treat them as compromised and rotate them.
- **It didn't build.** `next build` failed out of the box.

## What Basis does instead

| Area                    | The Basis approach                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data honesty**        | Every price carries `source`, `asOf`, and `synthetic`/`stale` flags rendered in the UI. A failed feed becomes an error state — never invented numbers. Demo mode is deterministic synthetic data, permanently labeled.                                                                                                                                                                                |
| **Forecast Lab** ⭐     | The flagship feature. Candidate models (AR(p) on returns — an ARIMA(p,1,0) equivalent — and damped Holt smoothing) compete against naive baselines in **walk-forward validation**. A model is shown only if it beats the best baseline by ≥3% relative MAPE; otherwise Basis says so, out loud. Prediction bands are empirical quantiles of real out-of-sample errors — no made-up confidence scores. |
| **Paper trading**       | Market / limit / stop / stop-limit orders, fractional shares, 5 bps slippage, buying-power and share checks, idempotency keys, and every fill inside one SQLite transaction. Money is integer cents; quantities are integer ten-thousandths of a share.                                                                                                                                               |
| **Research**            | Candlestick/line charts with SMA/Bollinger/RSI overlays and SPY comparison, fundamentals with plain-English tooltips, company news — one fast page per symbol.                                                                                                                                                                                                                                        |
| **Watchlists & alerts** | Multiple lists with notes and entry/exit targets; price, %-move, RSI, volume-spike, MA-cross and drawdown alerts evaluated deterministically, delivered in-app.                                                                                                                                                                                                                                       |
| **UI**                  | Custom design system on Tailwind 4 (dark + light), ⌘K command palette, keyboard-friendly, responsive, `prefers-reduced-motion` respected, skeleton/empty/error states everywhere.                                                                                                                                                                                                                     |

## Quick start

```bash
git clone https://github.com/shreyas463/Stock-Analysis-platform.git
cd Stock-Analysis-platform
npm run setup     # install + migrate + seed demo account
npm run dev       # http://localhost:3000
```

Sign in with the demo account — **demo@basis.app / demo1234** — or register your own.
With no configuration, Basis runs in **demo mode**: deterministic synthetic market data,
clearly labeled everywhere. No external calls, no keys, works offline.

### Live market data (optional)

```bash
cp .env.example .env.local
```

| Variable          | Required      | Purpose                                                                                            |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`  | in production | Signs session cookies (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `FINNHUB_API_KEY` | optional      | Live quotes, search, fundamentals, news ([free tier](https://finnhub.io)) — server-side only       |
| `STOOQ_ENABLED`   | optional      | Free end-of-day price history from Stooq (default on in live mode)                                 |
| `DATABASE_PATH`   | optional      | SQLite file location (default `./data/basis.db`)                                                   |
| `DEMO_MODE`       | optional      | Force demo mode even with keys present                                                             |

If live quotes fail mid-session, Basis degrades to the latest cached end-of-day close and
labels it **Delayed** — it never fabricates a price.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm start            # serve production build
npm test             # unit tests (money math, trading engine, forecast honesty, indicators)
npm run lint         # eslint (no-explicit-any is an error)
npm run typecheck    # tsc --noEmit (strict + noUncheckedIndexedAccess)
npm run db:migrate   # apply migrations
npm run db:seed      # seed the demo account (idempotent)
```

## Deployment

Any Node 22 host with a persistent disk (Fly.io, Railway, Render, a VPS):

```bash
docker build -t basis .
docker run -p 3000:3000 -v basis-data:/app/data -e SESSION_SECRET=<hex> basis
```

Vercel's serverless filesystem is ephemeral, so SQLite state won't persist there — use a
container host, or contribute the Postgres driver swap (Drizzle makes it a small change).

## Architecture, security, contributing

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, the money model, the forecast
  methodology, and the audit of the legacy code.
- [SECURITY.md](SECURITY.md) — threat model, auth design, and what to do about the
  previously-committed API keys.
- [CONTRIBUTING.md](CONTRIBUTING.md) — local workflow and quality gates.

## Data sources & limitations

- **Demo mode:** all prices are generated by a seeded geometric Brownian walk — useful for
  learning the workflow, meaningless for real research, and labeled as such on every surface.
- **Live mode:** Finnhub free-tier quotes may be delayed; Stooq history is end-of-day only.
  News and fundamentals coverage varies by symbol; missing values render as "—", never as
  invented numbers.
- **Forecasts** extrapolate daily closes only. They know nothing about earnings, news or
  intraday moves, and past validation error does not bound future error.

## License

MIT — see [LICENSE](LICENSE).
