import { useEffect } from "react";
import { Link, useParams, useSearch } from "wouter";
import { useGetSale, getGetSaleQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Receipt, Printer, ImagePlus } from "lucide-react";

function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

export default function SaleDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const saleId = Number(params.id);
  const autoPrint = new URLSearchParams(search).get("print") === "1";

  const { data: sale, isLoading } = useGetSale(saleId, {
    query: { queryKey: getGetSaleQueryKey(saleId), enabled: !!saleId },
  });

  useEffect(() => {
    if (autoPrint && sale && !isLoading) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoPrint, sale, isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Receipt className="h-12 w-12 opacity-30" />
        <p className="font-medium">Sale not found</p>
        <Link href="/sales">
          <Button variant="outline">Back to Sales</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sale #{sale.id}</h1>
            <p className="text-muted-foreground mt-0.5">
              {new Date(sale.createdAt).toLocaleString(undefined, {
                weekday: "long", month: "long", day: "numeric",
                year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt — visible on screen and in print */}
      <div id="receipt" className="rounded-lg border bg-card print:border-0 print:shadow-none print:rounded-none">

        {/* Print-only header */}
        <div className="hidden print:block text-center py-6 border-b">
          <p className="text-2xl font-bold tracking-tight">Nexus POS</p>
          <p className="text-sm text-muted-foreground mt-1">Sales Receipt</p>
          <p className="text-sm mt-1">
            {new Date(sale.createdAt).toLocaleString(undefined, {
              weekday: "long", month: "long", day: "numeric",
              year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
          <p className="text-lg font-semibold mt-2">Sale #{sale.id}</p>
        </div>

        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-semibold">{sale.customerName || "Walk-in Customer"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Payment</p>
            <p className="font-semibold capitalize">
              {sale.paymentMethod === "mobile" ? "Mobile Pay" : sale.paymentMethod ?? "Cash"}
            </p>
          </div>
          {sale.note && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="font-medium text-sm">{sale.note}</p>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b print:bg-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Unit Price</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-5 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    {photoUrl(item.productPhotoUrl) ? (
                      <img
                        src={photoUrl(item.productPhotoUrl)!}
                        alt={item.productName ?? `Product #${item.productId}`}
                        className="h-9 w-9 rounded-md object-cover border shrink-0 print:hidden"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md border bg-muted flex items-center justify-center shrink-0 print:hidden">
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span>{item.productName ?? `Product #${item.productId}`}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Badge variant="secondary" className="print:bg-transparent print:border print:border-gray-300">
                    {item.quantity}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-semibold">
                  ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-5 border-t flex justify-end">
          <div className="text-right space-y-1">
            <p className="text-sm text-muted-foreground">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</p>
            <p className="text-2xl font-bold">Total: ${Number(sale.total).toFixed(2)}</p>
          </div>
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block text-center py-4 border-t text-sm text-muted-foreground">
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  );
}
