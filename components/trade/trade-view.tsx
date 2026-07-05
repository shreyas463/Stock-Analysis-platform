"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { OrderTicket } from "./order-ticket";
import { SymbolContext } from "./symbol-context";
import { TradeActivity } from "./trade-activity";

function sanitizeSymbol(raw: string | null): string | null {
  if (!raw) return null;
  const sym = raw.trim().toUpperCase();
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(sym) ? sym : null;
}

export function TradeView({ initialSymbol }: { initialSymbol: string | null }) {
  const [symbol, setSymbol] = React.useState<string | null>(() => sanitizeSymbol(initialSymbol));

  return (
    <div>
      <PageHeader
        title="Paper Trading"
        description="Practice orders with simulated cash — market, limit, stop, and stop-limit."
      />
      <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <OrderTicket symbol={symbol} onSymbolChange={setSymbol} />
          <SymbolContext symbol={symbol} />
        </div>
        <TradeActivity />
      </div>
    </div>
  );
}
