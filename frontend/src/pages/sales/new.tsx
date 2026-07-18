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
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, ImagePlus, Banknote, CreditCard, Smartphone, Landmark, Truck, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

type PaymentMethod = "cash" | "momo" | "card" | "bank" | "delivery";
type DeliveryPaymentStatus = "pay_on_delivery" | "paid";

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export default function NewSale() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [bankName, setBankName] = useState("");
  const [deliveryPaymentStatus, setDeliveryPaymentStatus] = useState<DeliveryPaymentStatus>("pay_on_delivery");
  const [cartDiscount, setCartDiscount] = useState("");

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
        toast({ title: `Sale #${sale.id} created`, description: `Total: ₵${Number(sale.total).toFixed(2)}` });
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
      return [...prev, { product, quantity: 1, discount: 0 }];
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

  function updateItemDiscount(productId: number, value: string) {
    setCart((prev) => prev.map((c) => {
      if (c.product.id !== productId) return c;
      const lineTotal = Number(c.product.price) * c.quantity;
      let discount = value === "" ? 0 : Number(value);
      if (Number.isNaN(discount) || discount < 0) discount = 0;
      if (discount > lineTotal) discount = lineTotal;
      return { ...c, discount };
    }));
  }

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const itemDiscountTotal = cart.reduce((sum, item) => sum + item.discount, 0);
  const rawCartDiscount = cartDiscount === "" ? 0 : Number(cartDiscount);
  const maxCartDiscount = Math.max(subtotal - itemDiscountTotal, 0);
  const appliedCartDiscount = Number.isNaN(rawCartDiscount)
    ? 0
    : Math.min(Math.max(rawCartDiscount, 0), maxCartDiscount);
  const discountTotal = itemDiscountTotal + appliedCartDiscount;
  const total = Math.max(subtotal - discountTotal, 0);

  function handleCheckout() {
    if (cart.length === 0) return;
    const data: SaleInput = {
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      note: note || undefined,
      paymentMethod,
      transactionId: paymentMethod === "momo" ? transactionId || undefined : undefined,
      bankName: paymentMethod === "bank" ? bankName || undefined : undefined,
      deliveryPaymentStatus: paymentMethod === "delivery" ? deliveryPaymentStatus : undefined,
      cartDiscount: appliedCartDiscount || undefined,
      items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity, discount: c.discount || undefined })),
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
                        <td className="px-4 py-3 text-right font-semibold">₵{Number(product.price).toFixed(2)}</td>
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
              <div className="space-y-3">
                {cart.map((item) => {
                  const lineTotal = Number(item.product.price) * item.quantity;
                  const lineNet = lineTotal - item.discount;
                  return (
                    <div key={item.product.id} className="space-y-1.5 pb-2 border-b last:border-0">
                      <div className="flex items-center gap-2 text-sm">
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
                          <p className="text-xs text-muted-foreground">₵{Number(item.product.price).toFixed(2)} each</p>
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
                          ₵{lineNet.toFixed(2)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5 pl-10">
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Label className="text-xs text-muted-foreground shrink-0">Discount</Label>
                        <Input
                          type="number"
                          min={0}
                          max={lineTotal}
                          step="0.01"
                          value={item.discount === 0 ? "" : item.discount}
                          onChange={(e) => updateItemDiscount(item.product.id, e.target.value)}
                          placeholder="0.00"
                          className="h-7 text-xs w-24"
                        />
                        {item.discount > 0 && (
                          <span className="text-xs text-destructive font-medium">-₵{item.discount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₵{subtotal.toFixed(2)}</span>
                  </div>
                  {itemDiscountTotal > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Item discounts</span>
                      <span>-₵{itemDiscountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {appliedCartDiscount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Cart discount</span>
                      <span>-₵{appliedCartDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>₵{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart-wide discount */}
          {cart.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Cart Discount
              </h2>
              <Input
                type="number"
                min={0}
                max={maxCartDiscount}
                step="0.01"
                value={cartDiscount}
                onChange={(e) => setCartDiscount(e.target.value)}
                placeholder="0.00"
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">Fixed amount off the entire cart (max ₵{maxCartDiscount.toFixed(2)}).</p>
            </div>
          )}

          {/* Payment method */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Payment Method</h2>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "cash", label: "Cash", Icon: Banknote },
                { value: "momo", label: "Momo", Icon: Smartphone },
                { value: "card", label: "Card", Icon: CreditCard },
                { value: "bank", label: "Bank", Icon: Landmark },
                { value: "delivery", label: "Delivery", Icon: Truck },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                    paymentMethod === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {paymentMethod === "momo" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Transaction ID</Label>
                <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. MP240715.1234.A56789" className="h-8 text-sm" />
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GT Bank" className="h-8 text-sm" />
              </div>
            )}

            {paymentMethod === "delivery" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Status</Label>
                <select
                  value={deliveryPaymentStatus}
                  onChange={(e) => setDeliveryPaymentStatus(e.target.value as DeliveryPaymentStatus)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="pay_on_delivery">Pay on Delivery</option>
                  <option value="paid">Paid</option>
                </select>
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
              <Label className="text-xs">Telephone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 024 123 4567" className="h-8 text-sm" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note..." className="h-8 text-sm" />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={
              cart.length === 0 ||
              createSaleMutation.isPending ||
              (paymentMethod === "momo" && !transactionId.trim()) ||
              (paymentMethod === "bank" && !bankName.trim())
            }
            onClick={handleCheckout}
          >
            {createSaleMutation.isPending ? "Processing..." : `Checkout — ${total.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
