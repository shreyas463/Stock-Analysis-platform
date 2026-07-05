"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { post, ApiClientError } from "@/lib/client";
import { fmtCents, toCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUICK_AMOUNTS = [1_000, 10_000, 100_000] as const;

export function DepositDialog() {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (amountCents: number) =>
      post<{ ok: boolean; cashCents: number }>("/api/portfolio/deposit", { amountCents }),
    onSuccess: (_data, amountCents) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(`Added ${fmtCents(amountCents)} of paper cash`);
      setOpen(false);
      setAmount("");
      setFieldError(null);
    },
    onError: (err) => {
      setFieldError(err instanceof ApiClientError ? err.message : "Deposit failed — try again");
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setFieldError("Enter a positive dollar amount");
      return;
    }
    const cents = toCents(dollars);
    if (cents > 100_000_000_00) {
      setFieldError("Maximum deposit is $100,000,000");
      return;
    }
    setFieldError(null);
    mutation.mutate(cents);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setFieldError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Add paper cash
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add paper cash</DialogTitle>
          <DialogDescription>
            Deposit simulated cash into your paper portfolio. This is practice money — nothing real
            moves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount">Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                $
              </span>
              <Input
                id="deposit-amount"
                inputMode="decimal"
                className="pl-7 tnum"
                placeholder="10,000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAmount(String(d))}
                className="rounded-md border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium tnum text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                ${d.toLocaleString("en-US")}
              </button>
            ))}
          </div>
          {fieldError && (
            <p className="rounded-md bg-neg-soft px-3 py-2 text-xs text-neg">{fieldError}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !amount}>
              {mutation.isPending ? "Adding…" : "Add cash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
