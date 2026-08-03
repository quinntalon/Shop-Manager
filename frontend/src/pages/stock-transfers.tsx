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
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import {
  useAddWarehouseStock,
  useBulkDiscount,
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
  ArrowRightLeft,
  Plus,
  Warehouse,
  Store,
  PackageCheck,
  ImagePlus,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  PackagePlus,
  Tag,
  Percent,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductInput } from "@workspace/api-client-react";

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
  if (words.length === 1) prefix = words[0].slice(0, 3).padEnd(3, "X");
  else prefix = words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X");
  return `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateSkuPrefix(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).padEnd(3, "X") + "-";
  return words.slice(0, 3).map((w) => w[0]).join("").padEnd(3, "X") + "-";
}

type ProductForm = {
  name: string; sku: string; description: string; photoUrl: string;
  price: string; costPrice: string; warehouseStock: string;
  discountPercent: string; reorderLevel: string; categoryId: number | undefined;
};

const EMPTY_FORM: ProductForm = {
  name: "", sku: "", description: "", photoUrl: "",
  price: "", costPrice: "", warehouseStock: "",
  discountPercent: "0", reorderLevel: "5", categoryId: undefined,
};

function effectivePrice(price: number, discountPercent: number) {
  return discountPercent > 0 ? price * (1 - discountPercent / 100) : price;
}

export default function StockTransfers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = useRole();
  const isAdmin = role === "admin";

  // ── Transfer dialog ────────────────────────────────────────────────────────
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // ── Add Product dialog ─────────────────────────────────────────────────────
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  // ── Edit Product dialog ────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // ── Add Warehouse Stock dialog ─────────────────────────────────────────────
  const [addQtyTarget, setAddQtyTarget] = useState<Product | null>(null);
  const [addQtyAmount, setAddQtyAmount] = useState("");

  // ── Per-product discount dialog ────────────────────────────────────────────
  const [discountTarget, setDiscountTarget] = useState<Product | null>(null);
  const [discountPct, setDiscountPct] = useState("");

  // ── Global discount dialog ─────────────────────────────────────────────────
  const [isGlobalDiscountOpen, setIsGlobalDiscountOpen] = useState(false);
  const [globalDiscountPct, setGlobalDiscountPct] = useState("");
  const [globalDiscountScope, setGlobalDiscountScope] = useState<"all" | "pick">("all");
  const [pickedProductIds, setPickedProductIds] = useState<Set<number>>(new Set());
  const [discountProductSearch, setDiscountProductSearch] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: transfers, isLoading } = useListStockTransfers();
  const { data: products } = useListProducts();
  const { data: categories } = useListCategories();

  const selectedProduct = products?.find((p) => String(p.id) === selectedProductId);

  // ── Upload (shared: separate instances for add vs edit) ────────────────────
  const { uploadFile: uploadAddFile, isUploading: isUploadingAdd } = useUpload({
    onSuccess: (r) => { setAddForm((f) => ({ ...f, photoUrl: r.url })); setAddPhotoPreview(r.url); },
    onError: (e) => toast({ title: "Upload failed", description: String(e), variant: "destructive" }),
  });
  const { uploadFile: uploadEditFile, isUploading: isUploadingEdit } = useUpload({
    onSuccess: (r) => { setEditForm((f) => ({ ...f, photoUrl: r.url })); setEditPhotoPreview(r.url); },
    onError: (e) => toast({ title: "Upload failed", description: String(e), variant: "destructive" }),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createProductMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsAddProductOpen(false);
        setAddForm(EMPTY_FORM);
        setAddPhotoPreview(null);
        toast({ title: "Product added", description: "Stock is in the warehouse — transfer to shop when ready." });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const updateProductMutation = useUpdateProduct({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(data.id) });
        setIsEditOpen(false);
        setEditingProduct(null);
        toast({ title: "Product updated" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const deleteProductMutation = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeleteTarget(null);
        toast({ title: "Product deleted" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  const addWarehouseStockMutation = useAddWarehouseStock({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setAddQtyTarget(null);
        setAddQtyAmount("");
        toast({ title: "Warehouse stock updated" });
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
        toast({ title: "Transfer failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      },
    },
  });

  const bulkDiscountMutation = useBulkDiscount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDiscountTarget(null);
        setDiscountPct("");
        setIsGlobalDiscountOpen(false);
        setGlobalDiscountPct("");
        setPickedProductIds(new Set());
        toast({ title: "Discount applied" });
      },
      onError: (e: unknown) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function resetTransferForm() { setSelectedProductId(""); setQuantity(""); setNotes(""); }

  function handleAddNameChange(name: string) {
    const updated = { ...addForm, name };
    if (!addForm.sku || addForm.sku === generateSkuPrefix(addForm.name)) {
      updated.sku = name.trim() ? generateSku(name) : "";
    }
    setAddForm(updated);
  }

  function handleAddProductSubmit() {
    const qty = parseInt(addForm.warehouseStock, 10);
    createProductMutation.mutate({
      data: {
        name: addForm.name,
        sku: addForm.sku,
        description: addForm.description || undefined,
        photoUrl: addForm.photoUrl || undefined,
        price: parseFloat(addForm.price),
        costPrice: addForm.costPrice ? parseFloat(addForm.costPrice) : undefined,
        stock: 0,
        warehouseStock: !isNaN(qty) && qty > 0 ? qty : 0,
        discountPercent: parseInt(addForm.discountPercent, 10) || 0,
        reorderLevel: parseInt(addForm.reorderLevel, 10) || 5,
        categoryId: addForm.categoryId,
      } as ProductInput & { warehouseStock?: number; discountPercent?: number },
    });
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    const disc = (product as Product & { discountPercent?: number }).discountPercent ?? 0;
    setEditForm({
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      photoUrl: product.photoUrl ?? "",
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      warehouseStock: String((product as Product & { warehouseStock?: number }).warehouseStock ?? 0),
      discountPercent: String(disc),
      reorderLevel: String(product.reorderLevel),
      categoryId: product.categoryId ?? undefined,
    });
    setEditPhotoPreview(product.photoUrl ?? null);
    setIsEditOpen(true);
  }

  function handleEditSubmit() {
    if (!editingProduct) return;
    updateProductMutation.mutate({
      id: editingProduct.id,
      data: {
        name: editForm.name,
        sku: editForm.sku,
        description: editForm.description || undefined,
        photoUrl: editForm.photoUrl || undefined,
        price: parseFloat(editForm.price),
        costPrice: editForm.costPrice ? parseFloat(editForm.costPrice) : undefined,
        discountPercent: parseInt(editForm.discountPercent, 10) || 0,
        reorderLevel: parseInt(editForm.reorderLevel, 10) || 5,
        categoryId: editForm.categoryId,
      } as Parameters<typeof updateProductMutation.mutate>[0]["data"],
    });
  }

  function handleProductDiscount() {
    if (!discountTarget) return;
    const pct = parseInt(discountPct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    bulkDiscountMutation.mutate({ discountPercent: pct, productIds: [discountTarget.id] });
  }

  function handleGlobalDiscount() {
    const pct = parseInt(globalDiscountPct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const productIds = globalDiscountScope === "pick" && pickedProductIds.size > 0
      ? Array.from(pickedProductIds)
      : undefined;
    bulkDiscountMutation.mutate({ discountPercent: pct, productIds });
  }

  function togglePickedProduct(id: number) {
    setPickedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const canTransfer = !!selectedProductId && !!quantity && parseInt(quantity, 10) > 0 && !createTransferMutation.isPending;
  const canAddProduct = !!addForm.name && !!addForm.sku && !!addForm.price && !isNaN(parseFloat(addForm.price)) && !createProductMutation.isPending && !isUploadingAdd;
  const canEditProduct = !!editForm.name && !!editForm.sku && !!editForm.price && !isNaN(parseFloat(editForm.price)) && !updateProductMutation.isPending && !isUploadingEdit;

  // ── Photo upload section (reusable render) ─────────────────────────────────
  function PhotoUpload({
    preview, onClear, onClickArea, isUploading, fileRef, onFileChange,
  }: {
    preview: string | null; onClear: () => void; onClickArea: () => void;
    isUploading: boolean; fileRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) {
    return (
      <div className="space-y-1.5">
        <Label>Product Photo</Label>
        <div className="flex items-center gap-3">
          <div
            className="relative h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0"
            onClick={() => !isUploading && onClickArea()}
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="h-full w-full object-contain" />
                <button type="button" className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80" onClick={(e) => { e.stopPropagation(); onClear(); }}>
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                {isUploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <><ImagePlus className="h-6 w-6" /><span className="text-xs">Upload</span></>}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Click to upload</p>
            <p>JPG, PNG, WebP up to 5 MB</p>
            {isUploading && <p className="text-primary mt-1">Uploading…</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">Receive products into the warehouse, then transfer stock to the shop.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => { setIsGlobalDiscountOpen(true); setGlobalDiscountPct(""); setGlobalDiscountScope("all"); setPickedProductIds(new Set()); }}>
                <Percent className="h-4 w-4 mr-2" />
                Set Discount
              </Button>
              <Button variant="outline" onClick={() => { setAddForm(EMPTY_FORM); setAddPhotoPreview(null); setIsAddProductOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </>
          )}
          <Button onClick={() => { resetTransferForm(); setIsTransferOpen(true); }}>
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
              <p className="text-2xl font-bold">{products.reduce((s, p) => s + ((p as Product & { warehouseStock?: number }).warehouseStock ?? 0), 0)}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Store className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Shop Stock</p>
              <p className="text-2xl font-bold">{products.reduce((s, p) => s + p.stock, 0)}</p>
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
                  const d = new Date(t.createdAt), now = new Date();
                  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                }).length ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Overview table */}
      {products && products.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Stock Overview</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sale Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1.5"><Warehouse className="h-3.5 w-3.5" /> Warehouse</span>
                  </th>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1.5"><Store className="h-3.5 w-3.5" /> Shop</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const disc = (product as Product & { discountPercent?: number }).discountPercent ?? 0;
                  const wh = (product as Product & { warehouseStock?: number }).warehouseStock ?? 0;
                  const salePrice = effectivePrice(product.price, disc);
                  return (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {product.costPrice != null ? `₵${Number(product.costPrice).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {disc > 0 ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="line-through text-xs text-muted-foreground">₵{Number(product.price).toFixed(2)}</span>
                            <span className="font-semibold text-green-600">₵{salePrice.toFixed(2)}</span>
                            <span className="inline-flex items-center gap-0.5 text-xs text-green-600"><Tag className="h-2.5 w-2.5" />{disc}% off</span>
                          </div>
                        ) : (
                          <span className="font-medium">₵{Number(product.price).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right"><span className="font-semibold">{wh}</span></td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        <ArrowRightLeft className="h-3.5 w-3.5 inline" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${product.stock <= product.reorderLevel ? "text-destructive" : ""}`}>{product.stock}</span>
                        {product.stock <= product.reorderLevel && <Badge variant="destructive" className="ml-2 text-xs">Low</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" disabled={wh === 0} onClick={() => { setSelectedProductId(String(product.id)); setQuantity(""); setNotes(""); setIsTransferOpen(true); }}>
                            Transfer
                          </Button>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(product)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setAddQtyTarget(product); setAddQtyAmount(""); }}>
                                  <PackagePlus className="h-4 w-4 mr-2" /> Add to Warehouse
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const disc = (product as Product & { discountPercent?: number }).discountPercent ?? 0;
                                  setDiscountTarget(product);
                                  setDiscountPct(String(disc));
                                }}>
                                  <Tag className="h-4 w-4 mr-2" /> Set Discount
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(product)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer History */}
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
                  <tr key={i} className="border-b"><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : transfers?.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No transfers yet. Add a product and transfer stock to the shop.</td></tr>
              ) : (
                transfers?.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.productSku}</td>
                    <td className="px-4 py-3 text-right"><Badge variant="secondary">+{t.quantity}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{t.notes ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Product Dialog ────────────────────────────────────────────── */}
      <Dialog open={isAddProductOpen} onOpenChange={(open) => { if (!open) { setIsAddProductOpen(false); setAddForm(EMPTY_FORM); setAddPhotoPreview(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product to Warehouse</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <PhotoUpload preview={addPhotoPreview} onClear={() => { setAddForm((f) => ({ ...f, photoUrl: "" })); setAddPhotoPreview(null); }} onClickArea={() => addFileRef.current?.click()} isUploading={isUploadingAdd} fileRef={addFileRef} onFileChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAddFile(file); e.target.value = ""; }} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={addForm.name} onChange={(e) => handleAddNameChange(e.target.value)} placeholder="Widget Pro" />
              </div>
              <div className="space-y-1.5">
                <Label>SKU <span className="text-destructive">*</span></Label>
                <Input value={addForm.sku} onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })} placeholder="WGT-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sale Price (₵) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price / Cost (₵)</Label>
                <Input type="number" min="0" step="0.01" value={addForm.costPrice} onChange={(e) => setAddForm({ ...addForm, costPrice: e.target.value })} placeholder="5.00" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Initial Warehouse Stock</Label>
                <Input type="number" min="0" value={addForm.warehouseStock} onChange={(e) => setAddForm({ ...addForm, warehouseStock: e.target.value })} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" value={addForm.discountPercent} onChange={(e) => setAddForm({ ...addForm, discountPercent: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={addForm.reorderLevel} onChange={(e) => setAddForm({ ...addForm, reorderLevel: e.target.value })} placeholder="5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={addForm.categoryId != null ? String(addForm.categoryId) : "none"} onValueChange={(v) => setAddForm({ ...addForm, categoryId: v !== "none" ? Number(v) : undefined })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Warehouse className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Shop stock starts at <strong>0</strong>. Use <strong>New Transfer</strong> to move units to the shop.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddProductOpen(false); setAddForm(EMPTY_FORM); setAddPhotoPreview(null); }}>Cancel</Button>
            <Button onClick={handleAddProductSubmit} disabled={!canAddProduct}>{createProductMutation.isPending ? "Adding…" : "Add to Warehouse"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ───────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditingProduct(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product — {editingProduct?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <PhotoUpload preview={editPhotoPreview} onClear={() => { setEditForm((f) => ({ ...f, photoUrl: "" })); setEditPhotoPreview(null); }} onClickArea={() => editFileRef.current?.click()} isUploading={isUploadingEdit} fileRef={editFileRef} onFileChange={(e) => { const file = e.target.files?.[0]; if (file) uploadEditFile(file); e.target.value = ""; }} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sale Price (₵)</Label>
                <Input type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price / Cost (₵)</Label>
                <Input type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" value={editForm.discountPercent} onChange={(e) => setEditForm({ ...editForm, discountPercent: e.target.value })} placeholder="0" />
                {editForm.discountPercent && parseInt(editForm.discountPercent) > 0 && editForm.price && (
                  <p className="text-xs text-green-600">
                    Effective price: ₵{effectivePrice(parseFloat(editForm.price), parseInt(editForm.discountPercent)).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={editForm.reorderLevel} onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editForm.categoryId != null ? String(editForm.categoryId) : "none"} onValueChange={(v) => setEditForm({ ...editForm, categoryId: v !== "none" ? Number(v) : undefined })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={!canEditProduct}>{updateProductMutation.isPending ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add to Warehouse Dialog ───────────────────────────────────────── */}
      <Dialog open={!!addQtyTarget} onOpenChange={(open) => { if (!open) { setAddQtyTarget(null); setAddQtyAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add to Warehouse — {addQtyTarget?.name}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Current warehouse stock: <strong>{(addQtyTarget as (Product & { warehouseStock?: number }) | null)?.warehouseStock ?? 0}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Quantity to receive</Label>
              <Input type="number" min="1" value={addQtyAmount} onChange={(e) => setAddQtyAmount(e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddQtyTarget(null); setAddQtyAmount(""); }}>Cancel</Button>
            <Button
              onClick={() => { if (!addQtyTarget) return; const qty = parseInt(addQtyAmount, 10); if (isNaN(qty) || qty < 1) return; addWarehouseStockMutation.mutate({ productId: addQtyTarget.id, quantity: qty }); }}
              disabled={!addQtyAmount || parseInt(addQtyAmount, 10) < 1 || addWarehouseStockMutation.isPending}
            >
              {addWarehouseStockMutation.isPending ? "Adding…" : "Add to Warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Per-product Discount Dialog ───────────────────────────────────── */}
      <Dialog open={!!discountTarget} onOpenChange={(open) => { if (!open) { setDiscountTarget(null); setDiscountPct(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Set Discount — {discountTarget?.name}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Current price: <strong>₵{Number(discountTarget?.price ?? 0).toFixed(2)}</strong></p>
            <div className="space-y-1.5">
              <Label>Discount Percentage (0 = no discount)</Label>
              <div className="relative">
                <Input type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="e.g. 10" className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              {discountPct && parseInt(discountPct) > 0 && discountTarget && (
                <p className="text-xs text-green-600">
                  Effective price: ₵{effectivePrice(Number(discountTarget.price), parseInt(discountPct)).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDiscountTarget(null); setDiscountPct(""); }}>Cancel</Button>
            <Button onClick={handleProductDiscount} disabled={discountPct === "" || bulkDiscountMutation.isPending}>
              {bulkDiscountMutation.isPending ? "Applying…" : "Apply Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Global Discount Dialog ────────────────────────────────────────── */}
      <Dialog open={isGlobalDiscountOpen} onOpenChange={(open) => { if (!open) { setIsGlobalDiscountOpen(false); setGlobalDiscountPct(""); setPickedProductIds(new Set()); setDiscountProductSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set Discount</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Discount Percentage (0 = remove discount)</Label>
              <div className="relative">
                <Input type="number" min="0" max="100" value={globalDiscountPct} onChange={(e) => setGlobalDiscountPct(e.target.value)} placeholder="e.g. 15" className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Apply to</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={globalDiscountScope === "all" ? "default" : "outline"} onClick={() => setGlobalDiscountScope("all")}>
                  All Products
                </Button>
                <Button size="sm" variant={globalDiscountScope === "pick" ? "default" : "outline"} onClick={() => setGlobalDiscountScope("pick")}>
                  Specific Products
                </Button>
              </div>
            </div>
            {globalDiscountScope === "pick" && products && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Select products ({pickedProductIds.size} selected)</Label>
                <Input
                  placeholder="Search products…"
                  value={discountProductSearch}
                  onChange={(e) => setDiscountProductSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
                  {products
                    .filter((p) =>
                      p.name.toLowerCase().includes(discountProductSearch.toLowerCase())
                    )
                    .map((p) => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input type="checkbox" checked={pickedProductIds.has(p.id)} onChange={() => togglePickedProduct(p.id)} className="h-4 w-4 rounded" />
                        <span className="flex-1 text-sm">{p.name}</span>
                        <span className="text-xs text-muted-foreground">₵{Number(p.price).toFixed(2)}</span>
                      </label>
                    ))}
                  {products.filter((p) =>
                    p.name.toLowerCase().includes(discountProductSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">No products match your search.</p>
                  )}
                </div>
              </div>
            )}
            {globalDiscountPct && parseInt(globalDiscountPct) > 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                A <strong>{globalDiscountPct}%</strong> discount will be applied to{" "}
                {globalDiscountScope === "all" ? "all products" : `${pickedProductIds.size} selected product(s)`}.
                Set to <strong>0%</strong> to remove discounts.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGlobalDiscountOpen(false); setGlobalDiscountPct(""); setPickedProductIds(new Set()); setDiscountProductSearch(""); }}>Cancel</Button>
            <Button
              onClick={handleGlobalDiscount}
              disabled={globalDiscountPct === "" || (globalDiscountScope === "pick" && pickedProductIds.size === 0) || bulkDiscountMutation.isPending}
            >
              {bulkDiscountMutation.isPending ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Transfer Dialog ───────────────────────────────────────────── */}
      <Dialog open={isTransferOpen} onOpenChange={(open) => { if (!open) { setIsTransferOpen(false); resetTransferForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        <span className="text-xs text-muted-foreground">({(p as Product & { warehouseStock?: number }).warehouseStock ?? 0} in warehouse)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProduct && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5" /> Warehouse</span>
                <span className="font-semibold">{(selectedProduct as Product & { warehouseStock?: number }).warehouseStock ?? 0}</span>
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> Shop</span>
                <span className="font-semibold">{selectedProduct.stock}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Quantity to transfer</Label>
              <Input type="number" min="1" max={(selectedProduct as (Product & { warehouseStock?: number }) | undefined)?.warehouseStock ?? undefined} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 10" />
              {selectedProduct && parseInt(quantity, 10) > ((selectedProduct as Product & { warehouseStock?: number }).warehouseStock ?? 0) && (
                <p className="text-xs text-destructive">Exceeds available warehouse stock ({(selectedProduct as Product & { warehouseStock?: number }).warehouseStock ?? 0})</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Restocking for weekend" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsTransferOpen(false); resetTransferForm(); }}>Cancel</Button>
            <Button onClick={() => { const qty = parseInt(quantity, 10); if (!selectedProductId || isNaN(qty) || qty < 1) return; createTransferMutation.mutate({ productId: Number(selectedProductId), quantity: qty, notes: notes.trim() || undefined }); }} disabled={!canTransfer}>
              {createTransferMutation.isPending ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the product and all its data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteProductMutation.mutate({ id: deleteTarget.id })}>
              {deleteProductMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
