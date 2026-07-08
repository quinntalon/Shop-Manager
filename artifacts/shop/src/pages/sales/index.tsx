import { Link } from "wouter";
import { useListSales, getListSalesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ShoppingCart } from "lucide-react";

export default function Sales() {
  const { data: sales, isLoading } = useListSales(
    { limit: 100 },
    { query: { queryKey: getListSalesQueryKey({ limit: 100 }) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground mt-1">View and create sales transactions.</p>
        </div>
        <Link href="/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sale #</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : sales?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 opacity-30" />
                    <p className="font-medium">No sales yet</p>
                    <Link href="/sales/new">
                      <Button variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Create First Sale
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              sales?.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">#{sale.id}</td>
                  <td className="px-4 py-3">{sale.customerName || <span className="text-muted-foreground">Walk-in</span>}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(sale.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sales/${sale.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
