import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useListCategories,
  useAdjustStock,
  getListProductsQueryKey,
  getGetProductQueryKey,
  useSetStorefrontStatus,
  useBulkSetStorefrontStatus,
} from "@workspace/api-client-react";
import type { ProductWithStorefront } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Minus,
  ImagePlus,
  Tag,
  MoreHorizontal,
  Globe,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// If VITE_STOREFRONT_URL is set (e.g. https://yourstore.vercel.app), the
// "View on Storefront" button links there. Otherwise it's hidden.
const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL as string | undefined)?.replace(/\/$/, "");

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // ── Stock adjustment dialog ───────────────────────────────────────────────
  const [stockTarget, setStockTarget] = useState<ProductWithStorefront | null>(null);
  const [stockDelta, setStockDelta] = useState("");

  // ── Bulk selection (Storefront tab) ───────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: categories } = useListCategories();
  const { data: rawProducts, isLoading } = useListProducts(
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

  const products = (rawProducts ?? []) as ProductWithStorefront[];
  const pendingProducts  = products.filter((p) => !p.storefrontActive);
  const liveProducts     = products.filter((p) =>  p.storefrontActive);

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  const storefrontMutation = useSetStorefrontStatus({
    mutation: {
      onSuccess: (data, vars) => {
        toast({
          title: vars.active ? "Activated on Storefront" : "Removed from Storefront",
          description: data.name,
        });
      },
      onError: (e: unknown) =>
        toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const bulkMutation = useBulkSetStorefrontStatus({
    mutation: {
      onSuccess: (data, vars) => {
        setSelectedIds(new Set());
        toast({
          title: vars.active
            ? `${data.updated} product${data.updated !== 1 ? "s" : ""} activated`
            : `${data.updated} product${data.updated !== 1 ? "s" : ""} deactivated`,
        });
      },
      onError: (e: unknown) =>
        toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isLowStock = (p: ProductWithStorefront) => p.stock <= p.reorderLevel;

  function effectivePrice(p: ProductWithStorefront) {
    const disc = p.discountPercent ?? 0;
    return disc > 0 ? p.price * (1 - disc / 100) : p.price;
  }

  function handleAdjustStock() {
    if (!stockTarget) return;
    const delta = parseInt(stockDelta, 10);
    if (isNaN(delta)) return;
    adjustStockMutation.mutate({ id: stockTarget.id, data: { delta } });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(pool: ProductWithStorefront[]) {
    if (pool.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pool.map((p) => p.id)));
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // ── Shared skeleton rows ──────────────────────────────────────────────────
  function SkeletonRows({ cols }: { cols: number }) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <tr key={i} className="border-b">
            <td colSpan={cols} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  // ── Storefront table row (shared between Pending and Live sections) ────────
  function StorefrontRow({ product }: { product: ProductWithStorefront }) {
    const disc = product.discountPercent ?? 0;
    const salePrice = effectivePrice(product);
    const isSelected = selectedIds.has(product.id);
    const zeroStock = product.stock === 0 && product.storefrontActive;

    return (
      <tr
        key={product.id}
        className={`border-b transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      >
        {/* Checkbox */}
        <td className="pl-4 pr-2 py-3 w-8">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(product.id)}
          />
        </td>

        {/* Image */}
        <td className="px-3 py-3 w-16">
          {product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt={product.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <ImagePlus className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </td>

        {/* Name + SKU */}
        <td className="px-3 py-3">
          <div className="font-medium leading-tight">{product.name}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</div>
        </td>

        {/* Category */}
        <td className="px-3 py-3">
          {product.categoryName ? (
            <Badge variant="secondary">{product.categoryName}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </td>

        {/* Price */}
        <td className="px-3 py-3 text-right">
          <div className="flex flex-col items-end gap-0.5">
            {disc > 0 ? (
              <>
                <span className="line-through text-xs text-muted-foreground">
                  ₵{Number(product.price).toFixed(2)}
                </span>
                <span className="font-semibold text-green-600">
                  ₵{salePrice.toFixed(2)}
                </span>
                <span className="text-xs text-green-600 flex items-center gap-0.5">
                  <Tag className="h-2.5 w-2.5" />{disc}% off
                </span>
              </>
            ) : (
              <span className="font-medium">₵{Number(product.price).toFixed(2)}</span>
            )}
          </div>
        </td>

        {/* Stock */}
        <td className="px-3 py-3 text-right">
          <div className="flex flex-col items-end gap-1">
            <span className={`font-semibold ${isLowStock(product) ? "text-destructive" : ""}`}>
              {product.stock}
            </span>
            {zeroStock && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                Out of stock
              </span>
            )}
            {!zeroStock && isLowStock(product) && (
              <Badge variant="destructive" className="text-xs">Low</Badge>
            )}
          </div>
        </td>

        {/* Date added */}
        <td className="px-3 py-3 text-right text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(product.createdAt)}
        </td>

        {/* Storefront status */}
        <td className="px-3 py-3 text-center">
          {product.storefrontActive ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Inactive
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* View on Storefront (activated only) */}
            {product.storefrontActive && STOREFRONT_URL && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="View on Storefront"
              >
                <a href={`${STOREFRONT_URL}/products/${product.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}

            {/* Activate / Deactivate */}
            <Button
              size="sm"
              variant={product.storefrontActive ? "outline" : "default"}
              className={product.storefrontActive ? "text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" : ""}
              disabled={storefrontMutation.isPending}
              onClick={() =>
                storefrontMutation.mutate({ id: product.id, active: !product.storefrontActive })
              }
            >
              {product.storefrontActive ? (
                <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Deactivate</>
              ) : (
                <><Globe className="h-3.5 w-3.5 mr-1.5" />Activate</>
              )}
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Manage stock levels and control which products appear on your Storefront.
        </p>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="storefront" className="relative">
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            Storefront
            {!isLoading && pendingProducts.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingProducts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Inventory ─────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          {/* Filters */}
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

          {/* Table */}
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
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Storefront</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows cols={9} />
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No products found. Add products from the Stock Transfers page.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const disc = product.discountPercent ?? 0;
                    const salePrice = effectivePrice(product);
                    return (
                      <tr
                        key={product.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        {/* Image */}
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

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {product.sku}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          {product.categoryName ? (
                            <Badge variant="secondary">{product.categoryName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Unit price (cost) */}
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {product.costPrice != null
                            ? `₵${Number(product.costPrice).toFixed(2)}`
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>

                        {/* Sale price */}
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

                        {/* Shop stock */}
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${isLowStock(product) ? "text-destructive" : ""}`}>
                            {product.stock}
                          </span>
                          {isLowStock(product) && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Low
                            </Badge>
                          )}
                        </td>

                        {/* Storefront status badge */}
                        <td className="px-4 py-3 text-center">
                          {product.storefrontActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <Globe className="h-3.5 w-3.5" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <EyeOff className="h-3.5 w-3.5" />
                              Off
                            </span>
                          )}
                        </td>

                        {/* Actions dropdown */}
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setStockTarget(product);
                                  setStockDelta("");
                                }}
                              >
                                <Minus className="h-4 w-4 mr-2" />
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {product.storefrontActive ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    storefrontMutation.mutate({ id: product.id, active: false })
                                  }
                                >
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Deactivate from Storefront
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    storefrontMutation.mutate({ id: product.id, active: true })
                                  }
                                >
                                  <Globe className="h-4 w-4 mr-2" />
                                  Activate on Storefront
                                </DropdownMenuItem>
                              )}
                              {product.storefrontActive && STOREFRONT_URL && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`${STOREFRONT_URL}/products/${product.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View on Storefront
                                  </a>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Tab 2: Storefront ─────────────────────────────────────────── */}
        <TabsContent value="storefront" className="space-y-6 mt-4">

          {/* Bulk action bar — shown when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium flex-1">
                {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                onClick={() =>
                  bulkMutation.mutate({ ids: Array.from(selectedIds), active: true })
                }
                disabled={bulkMutation.isPending}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Activate All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() =>
                  bulkMutation.mutate({ ids: Array.from(selectedIds), active: false })
                }
                disabled={bulkMutation.isPending}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Deactivate All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          {/* ── Pending activation ──────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Pending Activation</h2>
              <Badge variant="secondary">{pendingProducts.length}</Badge>
              <p className="text-sm text-muted-foreground ml-1">
                — these products are not visible on the Storefront yet
              </p>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-8">
                      <Checkbox
                        checked={
                          pendingProducts.length > 0 &&
                          pendingProducts.every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={() => toggleSelectAll(pendingProducts)}
                      />
                    </th>
                    <th className="w-16 px-3 py-3"></th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Product / SKU</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Date Added</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <SkeletonRows cols={9} />
                  ) : pendingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                          <p className="font-medium text-foreground">All products are live!</p>
                          <p className="text-sm">Every product in your inventory is active on the Storefront.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingProducts.map((p) => <StorefrontRow key={p.id} product={p} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Live on Storefront ───────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Live on Storefront</h2>
              <Badge className="bg-emerald-500 hover:bg-emerald-600">{liveProducts.length}</Badge>
              <p className="text-sm text-muted-foreground ml-1">
                — visible to customers right now
              </p>
              {STOREFRONT_URL && (
                <a
                  href={STOREFRONT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Storefront
                </a>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-8">
                      <Checkbox
                        checked={
                          liveProducts.length > 0 &&
                          liveProducts.every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={() => toggleSelectAll(liveProducts)}
                      />
                    </th>
                    <th className="w-16 px-3 py-3"></th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Product / SKU</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Date Added</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <SkeletonRows cols={9} />
                  ) : liveProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        No products are live yet. Activate products above to publish them.
                      </td>
                    </tr>
                  ) : (
                    liveProducts.map((p) => <StorefrontRow key={p.id} product={p} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Stock Adjustment Dialog (unchanged) ────────────────────────── */}
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
