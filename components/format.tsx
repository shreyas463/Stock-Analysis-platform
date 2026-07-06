import { cn } from "@/lib/utils";
import { fmtCents, fmtPct } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/misc";

/** Signed money with pos/neg color. */
export function MoneyDelta({
  cents,
  className,
  precise,
}: {
  cents: number;
  className?: string;
  precise?: boolean;
}) {
  return (
    <span
      className={cn(
        "tnum",
        cents > 0 ? "text-pos" : cents < 0 ? "text-neg" : "text-ink-muted",
        className,
      )}
    >
      {fmtCents(cents, { signed: true, precise })}
    </span>
  );
}

/** Signed percent (input is a fraction) with pos/neg color. */
export function PctDelta({
  value,
  className,
  digits,
}: {
  value: number;
  className?: string;
  digits?: number;
}) {
  return (
    <span
      className={cn(
        "tnum",
        value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-ink-muted",
        className,
      )}
    >
      {fmtPct(value, { signed: true, digits })}
    </span>
  );
}

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn("tnum", className)}>{fmtCents(cents)}</span>;
}

/**
 * Data provenance badge. Every price surface shows one of these — the core
 * honesty contract of the app: synthetic data is always labeled.
 */
export function SourceBadge({
  synthetic,
  stale,
  source,
  asOf,
  className,
}: {
  synthetic: boolean;
  stale?: boolean;
  source?: string;
  asOf?: number;
  className?: string;
}) {
  if (!synthetic && !stale) return null;
  const label = synthetic ? "Synthetic" : "Delayed";
  const explanation = synthetic
    ? "Demo mode: deterministic simulated prices, not real market data."
    : `Live quotes unavailable — showing the most recent end-of-day close${source ? ` from ${source}` : ""}.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={synthetic ? "warn" : "secondary"} className={cn("cursor-help", className)}>
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {explanation}
        {asOf ? ` As of ${new Date(asOf).toLocaleString()}.` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-ink-faint [&_svg]:size-8">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this data",
  description,
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-neg/30 bg-neg-soft/40 px-6 py-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-muted">{description}</p>}
      {retry && (
        <button
          onClick={retry}
          className="mt-1 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium hover:bg-panel-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
