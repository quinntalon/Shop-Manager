import { useState } from "react";
import { useListCustomers, useGetCustomerPurchases } from "@workspace/api-client-react";
import type { Customer } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BookUser, Search, Phone, ShoppingBag, X, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
  bank: "Bank",
  delivery: "Delivery",
};

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
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

function CustomerHistorySheet({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const { data: purchases, isLoading } = useGetCustomerPurchases(customer?.name ?? "", {
    query: { enabled: !!customer },
  });

  return (
    <Sheet open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <BookUser className="h-4 w-4 text-primary" />
            {customer?.name}
          </SheetTitle>
          <SheetDescription className="space-y-1">
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

  // Simple debounce via timeout ref
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
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
