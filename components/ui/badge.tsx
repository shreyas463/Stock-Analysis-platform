import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-soft text-brand",
        secondary: "border-line bg-panel-2 text-ink-muted",
        pos: "border-transparent bg-pos-soft text-pos",
        neg: "border-transparent bg-neg-soft text-neg",
        warn: "border-transparent bg-warn-soft text-warn",
        outline: "border-line text-ink-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
