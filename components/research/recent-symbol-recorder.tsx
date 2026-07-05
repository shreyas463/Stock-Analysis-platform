"use client";

import * as React from "react";
import { recordRecent } from "./recent";

/** Invisible: records the viewed symbol into "recently viewed" localStorage. */
export function RecentSymbolRecorder({ symbol, name }: { symbol: string; name: string | null }) {
  React.useEffect(() => {
    recordRecent(symbol, name);
  }, [symbol, name]);
  return null;
}
