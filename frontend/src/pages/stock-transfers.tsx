import { useState, useRef } from "react";
import { useRole } from "@/hooks/use-role";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStockTransfers,
  useCreateStockTransfer,
  getListStockTransfersQueryKey,
} from "@workspace/api-client-react";
import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
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
import { ArrowRightLeft, Plus, Warehouse, Store, PackageCheck, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProductInput } from "@workspace/api-client-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function generateSku(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  let prefix = "";
  if (words.length === 1) {
    prefix = words[0].slice(0, 3).padEnd(3, "X");
  } else {
    prefix = words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X");
  }
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${num}`;
}

function generateSkuPrefix(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).padEnd(3, "X") + "-";
  return words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X") + "-";
}

type AddProductForm = Omit<ProductInput, "price" | "costPrice" | "reorderLevel" | "stock"> & {
  price: string;
  costPrice: string;
  reorderLevel: string;
  warehouseStock: string;
};

const EMPTY_ADD_FORM: AddProductForm = {
  name: "",
  sku: "",
  description: "",
  photoUrl: "",
  price: "",
  costPrice: "",
  warehouseStock: "",
  reorderLevel: "5",
  categoryId: undefined,
};

export default function StockTransfers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = useRole();
  const isAdmin = role === "admin";

  // Transfer dialog state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Add Product dialog state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddProductForm>(EMPTY_ADD_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: transfers, isLoading } = useListStockTransfers();
  const { data: products } = useListProducts();
  const { data: categories } = useListCategories();

  const selectedProduct = products?.find((p) => String(p.id) === selectedProductId);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setAddForm((f) => ({ ...f, photoUrl: response.url }));
      setPhotoPreview(response.url);
    },
    onError: (err) => toast({ title: "Upload failed", description: String(err), variant: "destructive" }),
  });

  const createProductMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsAddProductOpen(false);
        setAddForm(EMPTY_ADD_FORM);
        setPhotoPreview(null);
        toast({ title: "Product added", description: "Stock is now in the warehouse. Transfer it to the shop when ready." });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const createTransferMutation = useCreateStockTransfer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsTransferOpen(false);
        resetTransferForm();
        toast({ title: "Transfer completed", description: "Stock moved from warehouse to shop." });
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: "Transfer failed", description: msg, variant: "destructive" });
      },
    },
  });

  function resetTransferForm() {
    setSelectedProductId("");
    setQuantity("");
    setNotes("");
  }

  function openTransferDialog() {
    resetTransferForm();
    setIsTransferOpen(true);
  }

  function handleTransferSubmit() {
    const qty = parseInt(quantity, 10);
    if (!selectedProductId || isNaN(qty) || qty < 1) return;
    createTransferMutation.mutate({
      productId: Number(selectedProductId),
      quantity: qty,
      notes: notes.trim() || undefined,
    });
  }

  function handleNameChange(name: string) {
    const updated = { ...addForm, name };
    if (!addForm.sku || addForm.sku === generateSkuPrefix(addForm.name)) {
      updated.sku = name.trim() ? generateSku(name) : "";
    }
    setAddForm(updated);
  }

  function handleAddProductSubmit() {
    const warehouseQty = parseInt(addForm.warehouseStock, 10);
    createProductMutation.mutate({
      data: {
        name: addForm.name,
        sku: addForm.sku,
        description: addForm.description || undefined,
        photoUrl: addForm.photoUrl || undefined,
        price: parseFloat(addForm.price),
        costPrice: addForm.costPrice ? parseFloat(addForm.costPrice) : undefined,
        stock: 0,
        warehouseStock: !isNaN(warehouseQty) && warehouseQty > 0 ? warehouseQty : 0,
        reorderLevel: parseInt(addForm.reorderLevel, 10) || 5,
        categoryId: addForm.categoryId,
      } as ProductInput & { warehouseStock?: number },
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function clearPhoto() {
    setAddForm((f) => ({ ...f, photoUrl: "" }));
    setPhotoPreview(null);
  }

  const canTransfer =
    !!selectedProductId &&
    !!quantity &&
    parseInt(quantity, 10) > 0 &&
    !createTransferMutation.isPending;

  const canAddProduct =
    !!addForm.name &&
    !!addForm.sku &&
    !!addForm.price &&
    !isNaN(parseFloat(addForm.price)) &&
    !createProductMutation.isPending &&
    !isUploading;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">
            Receive products into the warehouse, then transfer stock to the shop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => { setAddForm(EMPTY_ADD_FORM); setPhotoPreview(null); setIsAddProductOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
          <Button onClick={openTransferDialog}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>
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
                          setIsTransferOpen(true);
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
                    No transfers yet. Add a product above, then transfer stock to the shop.
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

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={(open) => { if (!open) { setIsAddProductOpen(false); setAddForm(EMPTY_ADD_FORM); setPhotoPreview(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product to Warehouse</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label>Product Photo</Label>
              <div className="flex items-center gap-3">
                <div
                  className="relative h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                        onClick={(e) => { e.stopPropagation(); clearPhoto(); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {isUploading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6" />
                          <span className="text-xs">Upload</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Click to upload</p>
                  <p>JPG, PNG, WebP up to 5 MB</p>
                  {isUploading && <p className="text-primary mt-1">Uploading…</p>}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={addForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Widget Pro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU <span className="text-destructive">*</span></Label>
                <Input
                  value={addForm.sku}
                  onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                  placeholder="WGT-001"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sale Price (₵) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price (₵)</Label>
                <Input type="number" min="0" step="0.01" value={addForm.costPrice} onChange={(e) => setAddForm({ ...addForm, costPrice: e.target.value })} placeholder="5.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Initial Warehouse Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={addForm.warehouseStock}
                  onChange={(e) => setAddForm({ ...addForm, warehouseStock: e.target.value })}
                  placeholder="e.g. 100"
                />
                <p className="text-xs text-muted-foreground">Units received into warehouse today</p>
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={addForm.reorderLevel} onChange={(e) => setAddForm({ ...addForm, reorderLevel: e.target.value })} placeholder="5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={addForm.categoryId != null ? String(addForm.categoryId) : "none"}
                onValueChange={(v) => setAddForm({ ...addForm, categoryId: v !== "none" ? Number(v) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Warehouse className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Shop stock starts at <strong>0</strong>. Use <strong>New Transfer</strong> to move units from the warehouse to the shop.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddProductOpen(false); setAddForm(EMPTY_ADD_FORM); setPhotoPreview(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAddProductSubmit} disabled={!canAddProduct}>
              {createProductMutation.isPending ? "Adding…" : "Add to Warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={(open) => { if (!open) { setIsTransferOpen(false); resetTransferForm(); } }}>
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
            <Button variant="outline" onClick={() => { setIsTransferOpen(false); resetTransferForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleTransferSubmit} disabled={!canTransfer}>
              {createTransferMutation.isPending ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
