import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStockTransfers,
  useCreateStockTransfer,
  getListStockTransfersQueryKey,
} from "@workspace/api-client-react";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Plus, Warehouse, Store, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StockTransfers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const { data: transfers, isLoading } = useListStockTransfers();
  const { data: products } = useListProducts();

  const selectedProduct = products?.find((p) => String(p.id) === selectedProductId);

  const createMutation = useCreateStockTransfer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsDialogOpen(false);
        resetForm();
        toast({ title: "Transfer completed", description: "Stock moved from warehouse to shop." });
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: "Transfer failed", description: msg, variant: "destructive" });
      },
    },
  });

  function resetForm() {
    setSelectedProductId("");
    setQuantity("");
    setNotes("");
  }

  function openDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function handleSubmit() {
    const qty = parseInt(quantity, 10);
    if (!selectedProductId || isNaN(qty) || qty < 1) return;
    createMutation.mutate({
      productId: Number(selectedProductId),
      quantity: qty,
      notes: notes.trim() || undefined,
    });
  }

  const canSubmit =
    !!selectedProductId &&
    !!quantity &&
    parseInt(quantity, 10) > 0 &&
    !createMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">
            Move stock from the warehouse into the shop.
          </p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Summary cards */}
      {products && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Warehouse className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Warehouse Stock</p>
              <p className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + (p.warehouseStock ?? 0), 0)}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Store className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Shop Stock</p>
              <p className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PackageCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transfers Today</p>
              <p className="text-2xl font-bold">
                {transfers?.filter((t) => {
                  const d = new Date(t.createdAt);
                  const now = new Date();
                  return (
                    d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate()
                  );
                }).length ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product stock overview */}
      {products && products.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Stock Overview</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1.5">
                      <Warehouse className="h-3.5 w-3.5" /> Warehouse
                    </span>
                  </th>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1.5">
                      <Store className="h-3.5 w-3.5" /> Shop
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{product.warehouseStock ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      <ArrowRightLeft className="h-3.5 w-3.5 inline" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${product.stock <= product.reorderLevel ? "text-destructive" : ""}`}>
                        {product.stock}
                      </span>
                      {product.stock <= product.reorderLevel && (
                        <Badge variant="destructive" className="ml-2 text-xs">Low</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(product.warehouseStock ?? 0) === 0}
                        onClick={() => {
                          setSelectedProductId(String(product.id));
                          setQuantity("");
                          setNotes("");
                          setIsDialogOpen(true);
                        }}
                      >
                        Transfer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Transfer History</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : transfers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No transfers yet. Create one above to move stock from the warehouse to the shop.
                  </td>
                </tr>
              ) : (
                transfers?.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.productSku}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="secondary">+{t.quantity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.notes ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        <span className="text-xs text-muted-foreground">
                          ({p.warehouseStock ?? 0} in warehouse)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5" /> Warehouse
                </span>
                <span className="font-semibold">{selectedProduct.warehouseStock ?? 0}</span>
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Shop
                </span>
                <span className="font-semibold">{selectedProduct.stock}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Quantity to transfer</Label>
              <Input
                type="number"
                min="1"
                max={selectedProduct?.warehouseStock ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10"
              />
              {selectedProduct && parseInt(quantity, 10) > (selectedProduct.warehouseStock ?? 0) && (
                <p className="text-xs text-destructive">
                  Exceeds available warehouse stock ({selectedProduct.warehouseStock ?? 0})
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Restocking for weekend"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {createMutation.isPending ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
