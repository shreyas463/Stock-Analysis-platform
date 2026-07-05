# Security

Basis is an educational paper-trading app — it stores no real financial credentials and moves
no real money — but it is built to production-grade security norms anyway.

## ⚠️ Action required if you forked the legacy code

The pre-rebuild history of this repository contained **committed secrets**:

- A CoinMarketCap API key in `backend/app.py` (env default) and a second one in
  `frontend/src/app/api/crypto-prices/route.ts`.
- A Finnhub key used as a hardcoded fallback in `backend/app.py`.

Treat all of them as compromised: **revoke and rotate them** in the respective provider
dashboards. They remain reachable in git history even though the files are deleted.

## Authentication & sessions

- Passwords hashed with **scrypt** (N=16384, r=8, p=1, 16-byte salt, constant-time compare).
- Sessions are 256-bit opaque tokens; the database stores only their **SHA-256 hash**, so a
  leaked DB cannot be replayed into live sessions.
- Cookies: `httpOnly`, `SameSite=Lax`, `Secure` in production, 30-day expiry; expired rows
  are pruned opportunistically.
- Login is rate-limited per email; register per instance. Login errors are uniform (no
  account enumeration).

## Authorization

Every API route resolves resources **through the authenticated user** (`requireUser()` →
`ensureDefaultPortfolio(user.id)` / `userId`-scoped queries). Object IDs from the client are
verified for ownership before use; the trade endpoint never accepts a `portfolioId` at all.

## Input validation & output hygiene

- All request bodies are validated with zod; symbols pass a strict regex before any provider
  call; SQL goes through Drizzle's parameterized builder only.
- API errors are mapped to stable `{error: {code, message}}` shapes; stack traces and
  internals never leave the server. Secrets are never logged.
- Security headers (`X-Frame-Options: DENY`, `nosniff`, referrer & permissions policies) are
  set globally in `next.config.ts`. React escaping + no `dangerouslySetInnerHTML` with user
  content.

## Secrets & configuration

- Configuration comes exclusively from environment variables validated at startup
  (`lib/env.ts`); the app **fails closed** in production if `SESSION_SECRET` is missing.
- Market-data keys are used only in server modules; nothing under `NEXT_PUBLIC_` exists.
- `.gitignore` excludes `.env*` and the SQLite database. CI runs `npm audit --audit-level=high`.

## Financial integrity (paper, but still)

- Integer-cents money, single-transaction fills, append-only cash ledger with running
  balances, and per-portfolio idempotency keys prevent duplicate or partial trades — see
  [ARCHITECTURE.md](ARCHITECTURE.md#the-money-model).

## Threat model (summary)

In scope: session theft, cross-user data access (IDOR), input-driven injection, secret
leakage, double-submission of trades, fabricated market data. Out of scope: DoS resilience,
multi-node consistency, real brokerage integration — this is a single-node educational tool.

## Reporting

Open a GitHub issue (or contact the repository owner privately for anything sensitive).
