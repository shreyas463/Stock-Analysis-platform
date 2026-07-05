"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { post, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SymbolCombobox } from "@/components/trade/symbol-combobox";
import { KIND_META, KIND_ORDER, previewSentence, type AlertKind } from "./alert-kinds";

export function NewAlertDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<AlertKind>("price_below");
  const [thresholdStr, setThresholdStr] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const meta = KIND_META[kind];
  const needsThreshold = meta.unit !== null;

  const inputValue = thresholdStr.trim() === "" ? null : Number(thresholdStr);
  const inputValid =
    !needsThreshold ||
    (inputValue !== null && Number.isFinite(inputValue) && meta.validate(inputValue) === null);
  const threshold =
    needsThreshold && inputValue !== null && Number.isFinite(inputValue)
      ? meta.toThreshold(inputValue)
      : null;
  const preview = previewSentence(
    symbol,
    kind,
    needsThreshold ? (inputValid ? threshold : null) : null,
  );

  const clientError =
    needsThreshold && inputValue !== null && Number.isFinite(inputValue)
      ? meta.validate(inputValue)
      : null;

  React.useEffect(() => {
    if (open) {
      setSymbol(null);
      setKind("price_below");
      setThresholdStr("");
      setError(null);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      post("/api/alerts", {
        symbol,
        kind,
        ...(needsThreshold && threshold !== null ? { threshold } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert created");
      onOpenChange(false);
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Could not create the alert"),
  });

  const canSubmit = !!symbol && inputValid && (!needsThreshold || inputValue !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New alert</DialogTitle>
          <DialogDescription>
            Alerts are evaluated while you use the app and land in the notification bell.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="alert-symbol">Symbol</Label>
            <SymbolCombobox
              id="alert-symbol"
              value={symbol}
              onSelect={(s) => setSymbol(s)}
              autoFocus
            />
            {symbol && (
              <p className="text-xs text-ink-muted">
                Watching <span className="font-mono font-semibold text-ink">{symbol}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="alert-kind">Condition</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as AlertKind);
                  setThresholdStr("");
                }}
              >
                <SelectTrigger id="alert-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsThreshold && (
              <div className="space-y-1.5">
                <Label htmlFor="alert-threshold">Threshold</Label>
                <div className="relative">
                  {meta.unit === "$" && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                      $
                    </span>
                  )}
                  <Input
                    id="alert-threshold"
                    inputMode="decimal"
                    className={meta.unit === "$" ? "pl-7 pr-2 tnum" : "pr-9 tnum"}
                    placeholder={meta.inputHint}
                    value={thresholdStr}
                    onChange={(e) => setThresholdStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  {meta.unit !== "$" && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
                      {meta.unit}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {clientError && <p className="text-xs text-neg">{clientError}</p>}

          {preview && (
            <div className="flex items-start gap-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">
              <BellPlusIcon className="mt-0.5 size-4 shrink-0" />
              <span>{preview}</span>
            </div>
          )}

          {error && <p className="rounded-md bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || create.isPending}>
              {create.isPending ? "Creating…" : "Create alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
