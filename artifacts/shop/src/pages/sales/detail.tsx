import { useEffect } from "react";
import { Link, useParams, useSearch } from "wouter";
import { useGetSale, useGetDefaultReceiptTemplate, getGetSaleQueryKey, getGetDefaultReceiptTemplateQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Receipt, Printer, ImagePlus } from "lucide-react";
import { ReceiptView } from "@/components/receipt/receipt-view";

function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "momo": return "Momo";
    case "card": return "Card";
    case "bank": return "Bank";
    case "delivery": return "Delivery";
    case "cash": return "Cash";
    default: return method ?? "Cash";
  }
}

export default function SaleDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const saleId = Number(params.id);
  const autoPrint = new URLSearchParams(search).get("print") === "1";

  const { data: sale, isLoading } = useGetSale(saleId, {
    query: { queryKey: getGetSaleQueryKey(saleId), enabled: !!saleId },
  });

  const { data: template, isLoading: isTemplateLoading } = useGetDefaultReceiptTemplate({
    query: { queryKey: getGetDefaultReceiptTemplateQueryKey() },
  });

  useEffect(() => {
    if (autoPrint && sale && !isLoading && template && !isTemplateLoading) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoPrint, sale, isLoading, template, isTemplateLoading]);

  if (isLoading || isTemplateLoading) {
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

  const paperWidthMm = template?.config.paperSize === "58mm" ? "58mm" : "80mm";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <style>{`@media print { @page { size: ${paperWidthMm} auto; margin: 0; } }`}</style>

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

      {/* On-screen summary */}
      <div className="rounded-lg border bg-card print:hidden">
        <div className="p-5 border-b flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-semibold">{sale.customerName || "Walk-in Customer"}</p>
            {sale.customerPhone && (
              <p className="text-sm text-muted-foreground mt-0.5">{sale.customerPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Payment</p>
            <p className="font-semibold capitalize">{paymentMethodLabel(sale.paymentMethod)}</p>
            {sale.paymentMethod === "momo" && sale.transactionId && (
              <p className="text-xs text-muted-foreground mt-0.5">Txn: {sale.transactionId}</p>
            )}
            {sale.paymentMethod === "bank" && sale.bankName && (
              <p className="text-xs text-muted-foreground mt-0.5">{sale.bankName}</p>
            )}
            {sale.paymentMethod === "delivery" && sale.deliveryPaymentStatus && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {sale.deliveryPaymentStatus === "paid" ? "Paid" : "Pay on Delivery"}
              </p>
            )}
          </div>
          {sale.note && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="font-medium text-sm">{sale.note}</p>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Unit Price</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Discount</th>
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
                        className="h-9 w-9 rounded-md object-cover border shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md border bg-muted flex items-center justify-center shrink-0">
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span>{item.productName ?? `Product #${item.productId}`}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Badge variant="secondary">
                    {item.quantity}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-5 py-3 text-right">
                  {(item.discount ?? 0) > 0 ? (
                    <span className="text-destructive">-${Number(item.discount).toFixed(2)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  ${(Number(item.unitPrice) * item.quantity - Number(item.discount ?? 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-5 border-t flex justify-end">
          <div className="text-right space-y-1">
            <p className="text-sm text-muted-foreground">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</p>
            <p className="text-sm text-muted-foreground">Subtotal: ${Number(sale.subtotal).toFixed(2)}</p>
            {sale.discountTotal > 0 && (
              <p className="text-sm text-destructive">Discount: -${Number(sale.discountTotal).toFixed(2)}</p>
            )}
            <p className="text-2xl font-bold">Total: ${Number(sale.total).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Printed receipt — rendered from the default receipt template */}
      {template && (
        <div className="hidden print:block">
          <ReceiptView config={template.config} sale={sale} />
        </div>
      )}
    </div>
  );
}
