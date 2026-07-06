import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  BellIcon,
  CandlestickChartIcon,
  FlaskConicalIcon,
  KeyboardIcon,
  LineChartIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getQuotes, isDemoMode } from "@/lib/market-data";
import { fmtPct } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BasisWordmark } from "@/components/shell/logo";
import { HeroMock } from "@/components/landing/hero-mock";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Basis — know why you own it",
  description:
    "An evidence-based investing workbench: research stocks, practice with paper trading, and get forecasts that admit when they can't beat a coin flip.",
};

export const dynamic = "force-dynamic";

const TICKER_SYMBOLS = [
  "SPY",
  "QQQ",
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "JPM",
  "V",
  "XOM",
];

const FEATURES = [
  {
    icon: LineChartIcon,
    title: "Research that goes deep",
    body: "Candlestick charts with SMA, Bollinger and RSI overlays, fundamentals with plain-English explanations, and company news — on one fast page.",
  },
  {
    icon: FlaskConicalIcon,
    title: "Forecasts that earn trust",
    body: "Every model fights naive baselines in walk-forward validation. If nothing beats the baseline, Basis tells you — no invented confidence scores, ever.",
    flagship: true,
  },
  {
    icon: CandlestickChartIcon,
    title: "A real paper-trading engine",
    body: "Market, limit, stop and stop-limit orders with fractional shares, slippage, buying-power checks and exact integer-cents accounting.",
  },
  {
    icon: BellIcon,
    title: "Watchlists & smart alerts",
    body: "Price, RSI, volume-spike, moving-average-cross and drawdown alerts — evaluated deterministically, delivered in-app.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Provenance on every number",
    body: "Live, delayed or synthetic — every price carries its source and timestamp. A failed data feed becomes an error state, never fake data.",
  },
  {
    icon: KeyboardIcon,
    title: "Fast, keyboard-first UI",
    body: "⌘K command palette, instant search, dark and light themes, and a responsive layout that respects reduced motion.",
  },
];

const METHOD = [
  ["Research", "Understand the business and the price history before acting."],
  ["Decide", "Size the position and set your exit conditions up front."],
  ["Practice", "Execute with paper money and realistic frictions."],
  ["Review", "Compare outcomes against the benchmark — and against your plan."],
] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const demo = isDemoMode();
  const quotes = await getQuotes(TICKER_SYMBOLS).catch(() => new Map());
  const ticker = TICKER_SYMBOLS.map((s) => quotes.get(s)).filter((q): q is NonNullable<typeof q> =>
    Boolean(q),
  );

  return (
    <div className="dark relative min-h-screen overflow-x-clip bg-bg text-ink">
      {/* background effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-grid-bg absolute inset-x-0 top-0 h-[720px]" />
        <div
          className="aurora-blob left-[-10%] top-[-12%] h-[480px] w-[560px]"
          style={{ background: "var(--brand)" }}
        />
        <div
          className="aurora-blob aurora-blob-2 right-[-12%] top-[8%] h-[420px] w-[520px]"
          style={{ background: "var(--chart-5)", opacity: 0.22 }}
        />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <BasisWordmark />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Get started <ArrowRightIcon />
            </Link>
          </Button>
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-14 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-xs text-ink-muted backdrop-blur">
            <span className="size-1.5 rounded-full bg-pos" />
            Paper trading · education only · no real money
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Know <span className="text-gradient-brand">why</span> you own it.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-sm leading-relaxed text-ink-muted sm:text-base">
            Basis is an evidence-based investing workbench: deep stock research, honest statistical
            forecasts, and a paper-trading engine with exact accounting — so you can practice a
            disciplined process before a single real dollar moves.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">
                Start with $100k paper money <ArrowRightIcon />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">Explore the demo account</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={340} className="mt-14">
          <HeroMock />
        </Reveal>
      </section>

      {/* ticker marquee */}
      {ticker.length > 0 && (
        <section
          aria-label="Sample quotes"
          className="relative z-10 border-y border-line bg-panel/60 py-3 backdrop-blur"
        >
          <div className="overflow-hidden" aria-hidden>
            <div className="marquee-track flex w-max gap-8">
              {[...ticker, ...ticker].map((q, i) => (
                <span key={`${q.symbol}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-ink">{q.symbol}</span>
                  <span className="tnum text-ink-muted">${(q.priceCents / 100).toFixed(2)}</span>
                  <span className={cn("tnum", q.changePct >= 0 ? "text-pos" : "text-neg")}>
                    {fmtPct(q.changePct, { signed: true })}
                  </span>
                </span>
              ))}
            </div>
          </div>
          {demo && (
            <p className="mt-1.5 text-center text-[10px] text-ink-faint">
              Synthetic demo data — connect a free market-data key for live quotes
            </p>
          )}
        </section>
      )}

      {/* features */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            A workbench, not a casino
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-muted">
            Everything is built around one loop: research, decide, practice, review.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className={cn("glow-card h-full p-5", f.flagship && "ring-1 ring-brand/30")}>
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-brand-soft">
                  <f.icon className="size-4.5 text-brand" />
                </div>
                {f.flagship && (
                  <span className="float-right rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                    Flagship
                  </span>
                )}
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* method */}
      <section className="relative z-10 border-y border-line bg-panel/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight">The method</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-4">
            {METHOD.map(([title, body], i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="relative text-center sm:text-left">
                  <span className="text-gradient-brand text-3xl font-bold">{i + 1}</span>
                  <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* honesty */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              No fake data. <span className="text-gradient-brand">Ever.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Most demo trading apps quietly substitute invented numbers when a data feed fails.
              Basis was rebuilt around the opposite contract:
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "Every price carries its source and timestamp — live, delayed or synthetic.",
                "A failed feed becomes a visible error state, never a fabricated quote.",
                "Forecast models must beat naive baselines in walk-forward validation, or Basis says so out loud.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-pos" />
                  <span className="text-ink-muted">{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="glow-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                From the forecast engine
              </p>
              <blockquote className="mt-3 border-l-2 border-brand pl-4 text-sm leading-relaxed text-ink">
                “No candidate model beat the best baseline: damped Holt scored 9.48% MAPE vs 9.61%
                for naive across 40 windows.{" "}
                <span className="text-brand">Basis refuses to dress a baseline up as a model</span>,
                so the naive range is shown instead.”
              </blockquote>
              <p className="mt-3 text-[11px] text-ink-faint">
                — an actual response from{" "}
                <span className="font-mono">/api/stocks/AAPL/forecast</span>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <div className="glow-card relative overflow-hidden p-10 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(600px 200px at 50% 0%, color-mix(in oklab, var(--brand) 18%, transparent), transparent)",
              }}
            />
            <h2 className="relative text-2xl font-semibold tracking-tight">
              Practice like it&apos;s real. Because one day it will be.
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Free, open-source, and runs entirely on your machine — with or without a market-data
              key.
            </p>
            <div className="relative mt-6">
              <Button size="lg" asChild>
                <Link href="/register">
                  Create your account <ArrowRightIcon />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
          <BasisWordmark />
          <p className="max-w-xl text-[11px] leading-relaxed text-ink-faint">
            Basis is an educational paper-trading platform. Nothing here is financial advice, and
            simulated results do not predict real returns. Market data may be delayed or, in demo
            mode, synthetic.
          </p>
        </div>
      </footer>
    </div>
  );
}
