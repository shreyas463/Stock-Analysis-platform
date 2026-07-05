import { cn } from "@/lib/utils";

/** Basis wordmark: a baseline with three rising evidence bars. */
export function BasisLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-brand", className)} aria-hidden="true">
      <rect x="4" y="18" width="5" height="8" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="13" y="12" width="5" height="14" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="22" y="6" width="5" height="20" rx="1" fill="currentColor" />
      <rect x="3" y="28" width="26" height="2" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function BasisWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BasisLogo className="size-5" />
      <span className="text-[15px] font-semibold tracking-tight">Basis</span>
    </span>
  );
}
