import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useAdjustStock,
  getListProductsQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import type { Product, ProductInput, ProductUpdate } from "@workspace/api-client-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Minus, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

function generateSku(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  let prefix = "";
  if (words.length === 0) return "";
  if (words.length === 1) {
    prefix = words[0].slice(0, 3).padEnd(3, "X");
  } else {
    prefix = words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X");
  }
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${num}`;
}

type FormState = Omit<ProductInput, "stock" | "price" | "costPrice" | "reorderLevel"> & {
  stock: string;
  price: string;
  costPrice: string;
  reorderLevel: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  description: "",
  photoUrl: "",
  price: "",
  costPrice: "",
  stock: "",
  reorderLevel: "5",
  categoryId: undefined,
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts(
    {
      search: search || undefined,
      categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined, categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined }) } }
  );

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setForm((f) => ({ ...f, photoUrl: response.url }));
      setPhotoPreview(response.url);
    },
    onError: (err) => toast({ title: "Upload failed", description: String(err), variant: "destructive" }),
  });

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Product created" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsDialogOpen(false);
        setEditingProduct(null);
        toast({ title: "Product updated" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeleteTarget(null);
        toast({ title: "Product deleted" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const adjustStockMutation = useAdjustStock({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(data.id) });
        setStockTarget(null);
        setStockDelta("");
        toast({ title: "Stock adjusted" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    setIsDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      photoUrl: product.photoUrl ?? "",
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      stock: String(product.stock),
      reorderLevel: String(product.reorderLevel),
      categoryId: product.categoryId ?? undefined,
    });
    setPhotoPreview(photoUrl(product.photoUrl));
    setIsDialogOpen(true);
  }

  function handleNameChange(name: string) {
    const updated: FormState = { ...form, name };
    if (!editingProduct && (!form.sku || form.sku === generateSkuFromPrev(form.name))) {
      updated.sku = name.trim() ? generateSku(name) : "";
    }
    setForm(updated);
  }

  function generateSkuFromPrev(prevName: string) {
    const words = prevName.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return "";
    let prefix = "";
    if (words.length === 1) prefix = words[0].slice(0, 3).padEnd(3, "X");
    else prefix = words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X");
    return `${prefix}-`;
  }

  function handleSubmit() {
    const data = {
      name: form.name,
      sku: form.sku,
      description: form.description || undefined,
      photoUrl: form.photoUrl || undefined,
      price: parseFloat(form.price),
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      stock: parseInt(form.stock, 10),
      reorderLevel: parseInt(form.reorderLevel, 10) || 5,
      categoryId: form.categoryId,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: data as ProductUpdate });
    } else {
      createMutation.mutate({ data: data as ProductInput });
    }
  }

  function handleAdjustStock() {
    if (!stockTarget) return;
    const delta = parseInt(stockDelta, 10);
    if (isNaN(delta)) return;
    adjustStockMutation.mutate({ id: stockTarget.id, data: { delta } });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function clearPhoto() {
    setForm((f) => ({ ...f, photoUrl: "" }));
    setPhotoPreview(null);
  }

  const isLowStock = (p: Product) => p.stock <= p.reorderLevel;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your products and stock levels.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
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
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-10"></th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : products?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No products found. Add your first product.
                </td>
              </tr>
            ) : (
              products?.map((product) => (
                <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    {product.photoUrl ? (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="h-9 w-9 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">
                    {product.categoryName ? (
                      <Badge variant="secondary">{product.categoryName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">${Number(product.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${isLowStock(product) ? "text-destructive" : ""}`}>
                      {product.stock}
                    </span>
                    {isLowStock(product) && (
                      <Badge variant="destructive" className="ml-2 text-xs">Low</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setStockTarget(product); setStockDelta(""); }}
                        title="Adjust stock"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
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
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
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
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Widget Pro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="WGT-001"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sale Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="5.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} placeholder="5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId != null ? String(form.categoryId) : "none"}
                onValueChange={(v) => setForm({ ...form, categoryId: v !== "none" ? Number(v) : undefined })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!stockTarget} onOpenChange={(open) => { if (!open) { setStockTarget(null); setStockDelta(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {stockTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Current stock: <strong>{stockTarget?.stock}</strong></p>
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
            <Button variant="outline" onClick={() => { setStockTarget(null); setStockDelta(""); }}>Cancel</Button>
            <Button onClick={handleAdjustStock} disabled={adjustStockMutation.isPending || !stockDelta}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
