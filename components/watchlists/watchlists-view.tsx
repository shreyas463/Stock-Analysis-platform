"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { api, del, patch, post, ApiClientError } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/format";
import { PageHeader } from "@/components/page-header";
import { SymbolCombobox } from "@/components/trade/symbol-combobox";
import { ItemsTable } from "./items-table";
import type { Watchlist, WatchlistsResponse } from "./types";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** Dialog with a single name field; used for both create and rename. */
function NameDialog({
  title,
  description,
  submitLabel,
  initialName,
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
}: {
  title: string;
  description: string;
  submitLabel: string;
  initialName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [name, setName] = React.useState(initialName ?? "");
  React.useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onSubmit(name.trim());
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="watchlist-name">Name</Label>
            <Input
              id="watchlist-name"
              autoFocus
              maxLength={40}
              placeholder="e.g. Semiconductors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="rounded-md bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WatchlistsView() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["watchlists"],
    queryFn: () => api<WatchlistsResponse>("/api/watchlists"),
    refetchInterval: 60_000,
  });

  const lists = React.useMemo(() => data?.watchlists ?? [], [data]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active: Watchlist | null = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const createList = useMutation({
    mutationFn: (name: string) => post<{ watchlist: { id: string } }>("/api/watchlists", { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setActiveId(res.watchlist.id);
      setCreateOpen(false);
      setCreateError(null);
    },
    onError: (err) => setCreateError(errMessage(err, "Could not create the list")),
  });

  const renameList = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      patch(`/api/watchlists/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setRenameOpen(false);
      setRenameError(null);
    },
    onError: (err) => setRenameError(errMessage(err, "Could not rename the list")),
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => del(`/api/watchlists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setDeleteOpen(false);
      setActiveId(null);
      toast.success("Watchlist deleted");
    },
    onError: (err) => toast.error(errMessage(err, "Could not delete the list")),
  });

  const addItem = useMutation({
    mutationFn: ({ listId, symbol }: { listId: string; symbol: string }) =>
      post(`/api/watchlists/${listId}/items`, { symbol }),
    onSuccess: (_data, { symbol }) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      toast.success(`${symbol} added`);
    },
    onError: (err) => toast.error(errMessage(err, "Could not add that symbol")),
  });

  return (
    <div>
      <PageHeader
        title="Watchlists"
        description="Track symbols you're researching — with notes and entry/exit targets."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New list
          </Button>
        }
      />

      {isPending ? (
        <WatchlistsSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your watchlists"
          description="Something went wrong while fetching your lists."
          retry={() => refetch()}
        />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListIcon />}
          title="No watchlists yet"
          description="Create a list to group the symbols you're following — earnings plays, long-term holds, sector baskets."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> Create your first list
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* List rail */}
          <div className="flex shrink-0 gap-1 overflow-x-auto lg:w-52 lg:flex-col">
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveId(l.id)}
                className={cn(
                  "flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors",
                  active?.id === l.id
                    ? "bg-panel-2 font-medium text-ink"
                    : "text-ink-muted hover:bg-panel-2/60 hover:text-ink",
                )}
              >
                <span className="truncate">{l.name}</span>
                <span className="text-xs tnum text-ink-faint">{l.items.length}</span>
              </button>
            ))}
          </div>

          {/* Active list */}
          {active && (
            <Card className="min-w-0 flex-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold tracking-tight">{active.name}</h2>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Rename list"
                    onClick={() => setRenameOpen(true)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Delete list"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-w-sm">
                  <SymbolCombobox
                    value={null}
                    placeholder={addItem.isPending ? "Adding…" : "Add a symbol to this list…"}
                    disabled={addItem.isPending}
                    onSelect={(symbol) => addItem.mutate({ listId: active.id, symbol })}
                  />
                </div>
                <ItemsTable listId={active.id} items={active.items} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <NameDialog
        title="New watchlist"
        description="Give the list a short, descriptive name."
        submitLabel="Create list"
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setCreateError(null);
        }}
        onSubmit={(name) => createList.mutate(name)}
        pending={createList.isPending}
        error={createError}
      />
      {active && (
        <>
          <NameDialog
            title="Rename watchlist"
            description={`Rename “${active.name}”.`}
            submitLabel="Rename"
            initialName={active.name}
            open={renameOpen}
            onOpenChange={(o) => {
              setRenameOpen(o);
              if (!o) setRenameError(null);
            }}
            onSubmit={(name) => renameList.mutate({ id: active.id, name })}
            pending={renameList.isPending}
            error={renameError}
          />
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete “{active.name}”?</DialogTitle>
                <DialogDescription>
                  This removes the list and its {active.items.length}{" "}
                  {active.items.length === 1 ? "symbol" : "symbols"}. This can&apos;t be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteList.isPending}
                  onClick={() => deleteList.mutate(active.id)}
                >
                  {deleteList.isPending ? "Deleting…" : "Delete list"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export function WatchlistsSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex gap-1 lg:w-52 lg:flex-col">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 lg:w-full" />
        ))}
      </div>
      <Card className="flex-1">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
