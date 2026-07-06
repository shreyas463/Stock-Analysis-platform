"use client";

import * as React from "react";

/**
 * Stylized product mock for the landing hero — a miniature Basis research
 * view drawn with real design tokens. Purely decorative (aria-hidden);
 * numbers are illustrative and the panel is labeled as a preview.
 */
export function HeroMock() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-2xl select-none">
      {/* main panel */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/20">
        {/* faux window chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-neg/60" />
          <span className="size-2.5 rounded-full bg-warn/60" />
          <span className="size-2.5 rounded-full bg-pos/60" />
          <span className="ml-3 flex-1 truncate text-[11px] text-ink-faint">
            basis — NVDA · research · forecast lab
          </span>
          <span className="rounded border border-line bg-panel px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
            preview
          </span>
        </div>

        <div className="grid grid-cols-5 gap-0">
          {/* chart area */}
          <div className="col-span-3 border-r border-line p-4">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-mono text-xs font-bold text-brand">NVDA</span>
              <span className="tnum text-lg font-semibold text-ink">$132.41</span>
              <span className="tnum text-xs font-medium text-pos">+2.84%</span>
            </div>
            <svg viewBox="0 0 320 140" className="w-full">
              {/* grid */}
              {[35, 70, 105].map((y) => (
                <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="var(--line)" strokeWidth="1" />
              ))}
              {/* area fill */}
              <path
                d="M0,110 L30,98 L60,104 L90,84 L120,90 L150,70 L180,76 L210,52 L240,60 L270,38 L300,44 L320,30 L320,140 L0,140 Z"
                fill="var(--brand)"
                opacity="0.10"
              />
              {/* price line (draws itself) */}
              <path
                className="draw-path"
                d="M0,110 L30,98 L60,104 L90,84 L120,90 L150,70 L180,76 L210,52 L240,60 L270,38 L300,44 L320,30"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* benchmark line */}
              <path
                className="draw-path"
                style={{ animationDelay: "0.5s" }}
                d="M0,112 L40,106 L80,100 L120,96 L160,88 L200,84 L240,78 L280,72 L320,66"
                fill="none"
                stroke="var(--ink-faint)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.7"
              />
              <circle cx="320" cy="30" r="3.5" fill="var(--brand)" className="pulse-soft" />
            </svg>
            <div className="mt-2 flex gap-3 text-[10px] text-ink-faint">
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 rounded bg-brand" /> NVDA
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 rounded bg-ink-faint" /> S&P 500
              </span>
            </div>
          </div>

          {/* right rail: drift + stats */}
          <div className="col-span-2 flex flex-col gap-3 p-4">
            <div className="rounded-md border border-line bg-panel-2 p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                Forecast lab · 21d
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded bg-pos-soft px-1.5 py-0.5 text-[10px] font-semibold text-pos">
                  Beats baseline
                </span>
                <span className="text-[10px] text-ink-faint">40 windows</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  ["Damped Holt", "4.21% MAPE", true],
                  ["Naive baseline", "4.68% MAPE", false],
                  ["AR(2) returns", "4.74% MAPE", false],
                ].map(([label, val, chosen]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span
                      className={`text-[10px] ${chosen ? "font-semibold text-brand" : "text-ink-muted"}`}
                    >
                      {label}
                    </span>
                    <span className="tnum text-[10px] font-medium text-ink-muted">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Day P/L", "+$482"],
                ["Cash", "$21.4k"],
                ["80% range", "$118–147"],
                ["RSI(14)", "58"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-panel-2 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wide text-ink-faint">{k}</p>
                  <p className="tnum text-xs font-semibold text-ink">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto rounded-md border border-dashed border-line p-2">
              <p className="text-[9px] leading-relaxed text-ink-faint">
                Paper portfolio · avg-cost basis · every metric explains its formula
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="float-slow absolute -left-4 -top-5 hidden rounded-lg border border-line bg-panel px-3 py-2 shadow-lg sm:block">
        <p className="text-[9px] uppercase tracking-wide text-ink-faint">Alert triggered</p>
        <p className="text-[11px] font-semibold text-ink">AMD RSI(14) below 30</p>
      </div>
      <div className="float-slower absolute -bottom-5 -right-3 hidden rounded-lg border border-line bg-panel px-3 py-2 shadow-lg sm:block">
        <p className="text-[9px] uppercase tracking-wide text-ink-faint">Limit order filled</p>
        <p className="tnum text-[11px] font-semibold text-pos">AAPL 10 @ $99.86</p>
      </div>
    </div>
  );
}
