import { useState } from "react";
import { useListCustomers, useGetCustomerPurchases, useGetLoyaltyAccount, useAdjustLoyaltyPoints, getLoyaltyAccountQueryKey } from "@workspace/api-client-react";
import type { Customer } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookUser, Search, Phone, ShoppingBag, X, ArrowUpRight, Star, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getListCustomersQueryKey } from "@workspace/api-client-react";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
  bank: "Bank",
  delivery: "Delivery",
};

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n);
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function AdjustPointsDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"add" | "deduct">("add");

  const adjustMutation = useAdjustLoyaltyPoints({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getLoyaltyAccountQueryKey(customer?.phone ?? "") });
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        toast({ title: `Points adjusted. New balance: ${data.balance} pts` });
        onClose();
      },
      onError: (e) => {
        toast({ title: "Adjustment failed", description: e.message, variant: "destructive" });
      },
    },
  });

  function handleSubmit() {
    if (!customer?.phone) return;
    const n = Math.abs(Number(points));
    if (!n) return;
    adjustMutation.mutate({
      customerPhone: customer.phone,
      customerName: customer.name,
      points: mode === "deduct" ? -n : n,
      note: note || undefined,
    });
  }

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            Adjust Points — {customer?.name}
          </DialogTitle>
          <DialogDescription>Manually add or deduct loyalty points for this customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                mode === "add" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "border-border text-muted-foreground"
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> Add points
            </button>
            <button
              type="button"
              onClick={() => setMode("deduct")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                mode === "deduct" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground"
              }`}
            >
              <Minus className="h-3.5 w-3.5" /> Deduct
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>Points</Label>
            <Input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment…"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!points || adjustMutation.isPending}
          >
            {adjustMutation.isPending ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerHistorySheet({
  customer,
  loyaltyEnabled,
  onClose,
  onAdjustPoints,
}: {
  customer: Customer | null;
  loyaltyEnabled: boolean;
  onClose: () => void;
  onAdjustPoints: () => void;
}) {
  const { data: purchases, isLoading } = useGetCustomerPurchases(customer?.name ?? "", {
    query: { enabled: !!customer },
  });

  const { data: loyalty, isLoading: loyaltyLoading } = useGetLoyaltyAccount(
    customer?.phone ?? "",
    { query: { enabled: !!(loyaltyEnabled && customer?.phone) } }
  );

  return (
    <Sheet open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <BookUser className="h-4 w-4 text-primary" />
            {customer?.name}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-2">
              {customer?.phone && (
                <span className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
              )}
              <span className="flex items-center gap-3 text-sm">
                <span className="font-medium text-foreground">{customer?.totalOrders} orders</span>
                <span>·</span>
                <span className="font-medium text-foreground">{fmt(customer?.totalSpent ?? 0)} total</span>
              </span>

              {/* Loyalty balance */}
              {loyaltyEnabled && customer?.phone && (
                <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      {loyaltyLoading ? "…" : `${loyalty?.balance ?? 0} points`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-yellow-400 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400"
                    onClick={onAdjustPoints}
                  >
                    Adjust
                  </Button>
                </div>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6 space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : !purchases || purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 opacity-30" />
              <p className="text-sm">No purchase history found.</p>
            </div>
          ) : (
            purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{fmt(p.total)}</span>
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                      {PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(p.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                    {p.note && <span>· {p.note}</span>}
                  </div>
                </div>
                <Link href={`/sales/${p.id}`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [adjustCustomer, setAdjustCustomer] = useState<Customer | null>(null);
  const { settings } = useSettings();
  const loyaltyEnabled = settings?.loyaltyEnabled ?? false;

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__customerSearchTimeout);
    (window as any).__customerSearchTimeout = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: customers, isLoading } = useListCustomers(
    { search: debouncedSearch || undefined },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookUser className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            All customers derived from sales with a recorded name
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => handleSearch("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <BookUser className="h-10 w-10 opacity-25" />
            <p className="text-sm">
              {debouncedSearch ? `No customers matching "${debouncedSearch}"` : "No customers yet — add a customer name when creating a sale."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                {loyaltyEnabled && (
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      Points
                    </span>
                  </TableHead>
                )}
                <TableHead>Last Purchase</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={`${customer.name}-${customer.phone}`}
                  className="cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary">{customer.totalOrders}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(customer.totalSpent)}
                  </TableCell>
                  {loyaltyEnabled && (
                    <TableCell className="text-right tabular-nums">
                      {customer.phone ? (
                        <span className="flex items-center justify-end gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {customer.loyaltyPoints ?? 0}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-sm">
                    {relativeDate(customer.lastOrderAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                      }}
                    >
                      History
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CustomerHistorySheet
        customer={selectedCustomer}
        loyaltyEnabled={loyaltyEnabled}
        onClose={() => setSelectedCustomer(null)}
        onAdjustPoints={() => {
          setAdjustCustomer(selectedCustomer);
          setSelectedCustomer(null);
        }}
      />

      <AdjustPointsDialog
        customer={adjustCustomer}
        onClose={() => setAdjustCustomer(null)}
      />
    </div>
  );
}
