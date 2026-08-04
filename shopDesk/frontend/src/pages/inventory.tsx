import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useListCategories,
  useAdjustStock,
  getListProductsQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
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
import { Search, Minus, ImagePlus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState("");

  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts(
    {
      search: search || undefined,
      categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    },
    {
      query: {
        queryKey: getListProductsQueryKey({
          search: search || undefined,
          categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
        }),
      },
    }
  );

  const adjustStockMutation = useAdjustStock({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(data.id) });
        setStockTarget(null);
        setStockDelta("");
        toast({ title: "Stock adjusted" });
      },
      onError: (e: unknown) =>
        toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  function handleAdjustStock() {
    if (!stockTarget) return;
    const delta = parseInt(stockDelta, 10);
    if (isNaN(delta)) return;
    adjustStockMutation.mutate({ id: stockTarget.id, data: { delta } });
  }

  const isLowStock = (p: Product) => p.stock <= p.reorderLevel;

  function effectivePrice(p: Product) {
    const disc = (p as Product & { discountPercent?: number }).discountPercent ?? 0;
    return disc > 0 ? p.price * (1 - disc / 100) : p.price;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          View products and shop stock levels. Add products and manage pricing from Stock Transfers.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20"></th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sale Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Shop Stock</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td colSpan={8} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : products?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No products found. Add products from the Stock Transfers page.
                </td>
              </tr>
            ) : (
              products?.map((product) => {
                const disc = (product as Product & { discountPercent?: number }).discountPercent ?? 0;
                const salePrice = effectivePrice(product);
                return (
                  <tr
                    key={product.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={product.name}
                          className="w-12 h-12 aspect-square rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <ImagePlus className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3">
                      {product.categoryName ? (
                        <Badge variant="secondary">{product.categoryName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {/* Unit Price = cost price */}
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {product.costPrice != null
                        ? `₵${Number(product.costPrice).toFixed(2)}`
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {/* Sale Price = selling price with discount applied */}
                    <td className="px-4 py-3 text-right font-medium">
                      <div className="flex flex-col items-end gap-0.5">
                        {disc > 0 ? (
                          <>
                            <span className="line-through text-xs text-muted-foreground">
                              ₵{Number(product.price).toFixed(2)}
                            </span>
                            <span className="text-green-600 font-semibold">
                              ₵{salePrice.toFixed(2)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                              <Tag className="h-2.5 w-2.5" />
                              {disc}% off
                            </span>
                          </>
                        ) : (
                          <span>₵{Number(product.price).toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${isLowStock(product) ? "text-destructive" : ""}`}
                      >
                        {product.stock}
                      </span>
                      {isLowStock(product) && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Low
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setStockTarget(product);
                          setStockDelta("");
                        }}
                        title="Adjust shop stock"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Shop Stock Adjustment Dialog */}
      <Dialog
        open={!!stockTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStockTarget(null);
            setStockDelta("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Shop Stock — {stockTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Current shop stock: <strong>{stockTarget?.stock}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Adjustment (positive to add, negative to remove)</Label>
              <Input
                type="number"
                value={stockDelta}
                onChange={(e) => setStockDelta(e.target.value)}
                placeholder="e.g. 10 or -3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStockTarget(null);
                setStockDelta("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={adjustStockMutation.isPending || !stockDelta}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
