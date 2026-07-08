import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useCreateSale,
  getListSalesQueryKey,
  getListProductsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetSalesByDayQueryKey,
  getGetTopProductsQueryKey,
} from "@workspace/api-client-react";
import type { Product, SaleInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function photoUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `${BASE_URL}/api/storage${objectPath}`;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewSale() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  const { data: products, isLoading } = useListProducts(
    { search: search || undefined },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined }) } }
  );

  const createSaleMutation = useCreateSale({
    mutation: {
      onSuccess: (sale) => {
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesByDayQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
        toast({ title: `Sale #${sale.id} created`, description: `Total: $${Number(sale.total).toFixed(2)}` });
        navigate(`/sales/${sale.id}?print=1`);
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error ?? String(e);
        toast({ title: "Sale failed", description: msg, variant: "destructive" });
      },
    },
  });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > product.stock) {
          toast({ title: "Not enough stock", description: `Only ${product.stock} available`, variant: "destructive" });
          return prev;
        }
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: newQty } : c);
      }
      if (product.stock < 1) {
        toast({ title: "Out of stock", variant: "destructive" });
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) => prev
      .map((c) => {
        if (c.product.id !== productId) return c;
        const newQty = c.quantity + delta;
        if (newQty > c.product.stock) {
          toast({ title: "Not enough stock", variant: "destructive" });
          return c;
        }
        return { ...c, quantity: Math.max(0, newQty) };
      })
      .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }

  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  function handleCheckout() {
    if (cart.length === 0) return;
    const data: SaleInput = {
      customerName: customerName || undefined,
      note: note || undefined,
      items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
    };
    createSaleMutation.mutate({ data });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground mt-0.5">Search products and build your cart.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product search panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                  ))
                ) : products?.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No products found</td></tr>
                ) : (
                  products?.map((product) => {
                    const inCart = cart.find((c) => c.product.id === product.id);
                    const outOfStock = product.stock === 0;
                    return (
                      <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {photoUrl(product.photoUrl) ? (
                              <img
                                src={photoUrl(product.photoUrl)!}
                                alt={product.name}
                                className="h-10 w-10 rounded-md object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center shrink-0">
                                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{product.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">${Number(product.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={outOfStock ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={inCart ? "secondary" : "default"}
                            disabled={outOfStock}
                            onClick={() => addToCart(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {inCart ? `Add (${inCart.quantity})` : "Add"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cart / checkout panel */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Cart</h2>
              {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 text-sm">
                    {photoUrl(item.product.photoUrl) ? (
                      <img
                        src={photoUrl(item.product.photoUrl)!}
                        alt={item.product.name}
                        className="h-8 w-8 rounded-md object-cover border shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-md border bg-muted flex items-center justify-center shrink-0">
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">${Number(item.product.price).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="w-16 text-right font-semibold">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer info */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Customer (optional)</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note..." className="h-8 text-sm" />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || createSaleMutation.isPending}
            onClick={handleCheckout}
          >
            {createSaleMutation.isPending ? "Processing..." : `Checkout — $${total.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
