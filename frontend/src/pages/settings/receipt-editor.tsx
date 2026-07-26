import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReceiptTemplates,
  useCreateReceiptTemplate,
  useUpdateReceiptTemplate,
  useDeleteReceiptTemplate,
  useSetDefaultReceiptTemplate,
  getListReceiptTemplatesQueryKey,
  getGetDefaultReceiptTemplateQueryKey,
} from "@workspace/api-client-react";
import type {
  ReceiptTemplate,
  ReceiptTemplateConfig,
  ReceiptElementId,
  ReceiptElementStyle,
} from "@workspace/api-client-react";
import { useUpload, type UploadResponse } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  GripVertical,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  ImagePlus,
  X,
  Receipt as ReceiptIcon,
  Minus,
  Type,
  Image as ImageIcon,
  MoveVertical,
  QrCode,
  Barcode,
  Copy,
  Download,
  Upload,
  RotateCcw,
  ChevronDown,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { SAMPLE_SALE } from "@/components/receipt/sample-sale";

// ─── Custom block types ────────────────────────────────────────────────────────

export type CustomBlockType =
  | "divider"
  | "textBlock"
  | "image"
  | "spacer"
  | "qrCode"
  | "barcode";

export interface CustomBlock {
  id: string;
  type: CustomBlockType;
  order: number;
  visible: boolean;
  align: "left" | "center" | "right";
  bold: boolean;
  fontSize: "xs" | "sm" | "base" | "lg" | "xl";
  color: string | null;
  // textBlock
  text?: string;
  // spacer
  height?: number;
  // image
  imageUrl?: string;
  imageHeight?: number;
  // qrCode / barcode
  dataField?: "saleId" | "custom";
  customValue?: string;
}

// ─── Footer rows ──────────────────────────────────────────────────────────────

export type FooterRowType = "text" | "image" | "divider" | "spacer";

export interface FooterRow {
  id: string;
  type: FooterRowType;
  content?: string; // text / template vars
  imageUrl?: string;
  imageHeight?: number;
  align: "left" | "center" | "right";
  bold: boolean;
  fontSize: "xs" | "sm" | "base" | "lg" | "xl";
  color: string | null;
}

// ─── Item columns ─────────────────────────────────────────────────────────────

export type ItemColumnKey =
  | "name"
  | "sku"
  | "qty"
  | "unitPrice"
  | "discount"
  | "lineTotal";

export interface ItemColumn {
  id: string;
  key: ItemColumnKey;
  label: string;
  visible: boolean;
  align: "left" | "center" | "right";
  order: number;
}

// ─── Extended config ──────────────────────────────────────────────────────────

export type ExtendedConfig = Omit<ReceiptTemplateConfig, "paperSize"> & {
  paperSize: "58mm" | "80mm" | "A4";
  customBlocks: CustomBlock[];
  footerRows: FooterRow[];
  itemColumns: ItemColumn[];
  logoSize?: number;
  borderStyle?: "none" | "solid" | "dashed";
  borderColor?: string;
  borderRadius?: number;
};

type DragSource =
  | { kind: "reorder"; index: number }
  | { kind: "palette"; blockType: CustomBlockType };

type SelectedItemRef =
  | { kind: "fixed"; id: ReceiptElementId }
  | { kind: "custom"; id: string }
  | null;

type UnifiedItem =
  | { kind: "fixed"; el: ReceiptElementStyle }
  | { kind: "custom"; block: CustomBlock };

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE_ITEMS: {
  type: CustomBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal rule" },
  { type: "textBlock", label: "Text Block", icon: Type, description: "Custom text / template vars" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Image by URL" },
  { type: "spacer", label: "Spacer", icon: MoveVertical, description: "Empty space" },
  { type: "qrCode", label: "QR Code", icon: QrCode, description: "QR from sale ID" },
  { type: "barcode", label: "Barcode", icon: Barcode, description: "Barcode from sale ID" },
];

const DEFAULT_ELEMENTS: ReceiptElementStyle[] = [
  { id: "logo", visible: true, order: 0, align: "center", bold: false, fontSize: "base", color: null },
  { id: "storeInfo", visible: true, order: 1, align: "center", bold: true, fontSize: "lg", color: null },
  { id: "receiptMeta", visible: true, order: 2, align: "center", bold: false, fontSize: "sm", color: null },
  { id: "customerInfo", visible: true, order: 3, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "itemsTable", visible: true, order: 4, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "totals", visible: true, order: 5, align: "right", bold: true, fontSize: "base", color: null },
  { id: "paymentDetails", visible: true, order: 6, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "footer", visible: true, order: 7, align: "center", bold: false, fontSize: "sm", color: null },
];

export const DEFAULT_ITEM_COLUMNS: ItemColumn[] = [
  { id: "name",      key: "name",      label: "Item",    visible: true,  align: "left",  order: 0 },
  { id: "qty",       key: "qty",       label: "Qty",     visible: true,  align: "right", order: 1 },
  { id: "lineTotal", key: "lineTotal", label: "Total",   visible: true,  align: "right", order: 2 },
  { id: "sku",       key: "sku",       label: "SKU",     visible: false, align: "left",  order: 3 },
  { id: "unitPrice", key: "unitPrice", label: "Price",   visible: false, align: "right", order: 4 },
  { id: "discount",  key: "discount",  label: "Disc",    visible: false, align: "right", order: 5 },
];

const DEFAULT_CONFIG: ExtendedConfig = {
  paperSize: "80mm",
  fontFamily: "sans",
  baseFontSize: 13,
  spacing: 8,
  textColor: "#0f172a",
  accentColor: "#2563eb",
  backgroundColor: "#ffffff",
  showLogo: true,
  logoUrl: null,
  logoSize: 48,
  storeName: "Nexus POS",
  storeAddress: "",
  storePhone: "",
  footerText: "Thank you for your purchase!",
  elements: DEFAULT_ELEMENTS,
  customBlocks: [],
  footerRows: [],
  itemColumns: DEFAULT_ITEM_COLUMNS,
  borderStyle: "none",
  borderColor: "#e2e8f0",
  borderRadius: 0,
};

const ELEMENT_LABELS: Record<ReceiptElementId, string> = {
  logo: "Logo",
  storeInfo: "Store Info",
  receiptMeta: "Receipt Meta (# & Date)",
  customerInfo: "Customer Details",
  itemsTable: "Items Table",
  totals: "Totals",
  paymentDetails: "Payment Details",
  footer: "Footer",
};

const CUSTOM_BLOCK_LABELS: Record<CustomBlockType, string> = {
  divider: "Divider",
  textBlock: "Text Block",
  image: "Image",
  spacer: "Spacer",
  qrCode: "QR Code",
  barcode: "Barcode",
};

export const TEMPLATE_VARIABLES = [
  { key: "{{store_name}}",    label: "Store Name" },
  { key: "{{store_address}}", label: "Store Address" },
  { key: "{{store_phone}}",   label: "Store Phone" },
  { key: "{{receipt_number}}",label: "Receipt #" },
  { key: "{{date}}",          label: "Date" },
  { key: "{{time}}",          label: "Time" },
  { key: "{{customer_name}}", label: "Customer Name" },
  { key: "{{customer_phone}}",label: "Customer Phone" },
  { key: "{{payment_method}}",label: "Payment Method" },
  { key: "{{transaction_id}}",label: "Transaction ID" },
  { key: "{{subtotal}}",      label: "Subtotal" },
  { key: "{{discount}}",      label: "Discount" },
  { key: "{{total}}",         label: "Grand Total" },
];

// ─── Extended element style (adds fields beyond the generated TS type) ─────────

export type ExtendedElementStyle = ReceiptElementStyle & {
  backgroundColor?: string | null;
  paddingTop?: number;
  paddingBottom?: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Accepts both the generated ReceiptTemplateConfig and our ExtendedConfig
function cloneConfig(config: ReceiptTemplateConfig | Partial<ExtendedConfig>): ExtendedConfig {
  const c = JSON.parse(JSON.stringify(config)) as ExtendedConfig;
  if (!c.customBlocks) c.customBlocks = [];
  if (!c.footerRows) c.footerRows = [];
  if (!c.itemColumns || c.itemColumns.length === 0) c.itemColumns = DEFAULT_ITEM_COLUMNS;
  if (!c.logoSize) c.logoSize = 48;
  if (!c.borderStyle) c.borderStyle = "none";
  if (!c.borderColor) c.borderColor = "#e2e8f0";
  if (c.borderRadius === undefined) c.borderRadius = 0;
  return c;
}

function getUnifiedItems(cfg: ExtendedConfig): UnifiedItem[] {
  const items: UnifiedItem[] = [
    ...cfg.elements.map((el: ReceiptElementStyle) => ({ kind: "fixed" as const, el })),
    ...(cfg.customBlocks ?? []).map((block: CustomBlock) => ({ kind: "custom" as const, block })),
  ];
  return items.sort((a, b) => {
    const oa = a.kind === "fixed" ? a.el.order : a.block.order;
    const ob = b.kind === "fixed" ? b.el.order : b.block.order;
    return oa - ob;
  });
}

function normaliseOrders(cfg: ExtendedConfig): ExtendedConfig {
  const unified = getUnifiedItems(cfg);
  const newElements = cfg.elements.map((el: ReceiptElementStyle) => ({ ...el }));
  const newBlocks = (cfg.customBlocks ?? []).map((b: CustomBlock) => ({ ...b }));
  unified.forEach((item, idx) => {
    if (item.kind === "fixed") {
      const el = newElements.find((e: ReceiptElementStyle) => e.id === item.el.id);
      if (el) el.order = idx;
    } else {
      const block = newBlocks.find((b: CustomBlock) => b.id === item.block.id);
      if (block) block.order = idx;
    }
  });
  return { ...cfg, elements: newElements, customBlocks: newBlocks };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiptEditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);

  const { data: templates, isLoading } = useListReceiptTemplates({
    query: { queryKey: getListReceiptTemplatesQueryKey() },
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("New Template");
  const [config, setConfig] = useState<ExtendedConfig>(DEFAULT_CONFIG);
  const [selectedItem, setSelectedItem] = useState<SelectedItemRef>(null);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [footerVarPickerId, setFooterVarPickerId] = useState<string | null>(null);

  useEffect(() => {
    if (!templates || templates.length === 0 || selectedId !== null) return;
    const first = templates.find((t: ReceiptTemplate) => t.isDefault) ?? templates[0];
    setSelectedId(first.id);
    setName(first.name);
    setConfig(cloneConfig(first.config));
    setDirty(false);
  }, [templates, selectedId]);

  function loadTemplate(t: ReceiptTemplate) {
    setSelectedId(t.id);
    setName(t.name);
    setConfig(cloneConfig(t.config));
    setSelectedItem(null);
    setDirty(false);
  }

  function startNewTemplate() {
    setSelectedId(null);
    setName("New Template");
    setConfig(cloneConfig(DEFAULT_CONFIG));
    setSelectedItem(null);
    setDirty(true);
  }

  function updateConfig(patch: Partial<ExtendedConfig>) {
    setConfig((prev: ExtendedConfig) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  // ── Fixed element helpers ──────────────────────────────────────────────────

  function updateElement(id: ReceiptElementId, patch: Partial<ReceiptElementStyle>) {
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      elements: prev.elements.map((el: ReceiptElementStyle) => (el.id === id ? { ...el, ...patch } : el)),
    }));
    setDirty(true);
  }

  // ── Custom block helpers ───────────────────────────────────────────────────

  function updateCustomBlock(id: string, patch: Partial<CustomBlock>) {
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      customBlocks: (prev.customBlocks ?? []).map((b: CustomBlock) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
    setDirty(true);
  }

  function removeCustomBlock(id: string) {
    setConfig((prev: ExtendedConfig) =>
      normaliseOrders({
        ...prev,
        customBlocks: (prev.customBlocks ?? []).filter((b: CustomBlock) => b.id !== id),
      })
    );
    if (selectedItem?.kind === "custom" && selectedItem.id === id) {
      setSelectedItem(null);
    }
    setDirty(true);
  }

  function addCustomBlock(type: CustomBlockType, atIndex?: number) {
    const unified = getUnifiedItems(config);
    const insertAt = atIndex ?? unified.length;

    const newBlock: CustomBlock = {
      id: crypto.randomUUID(),
      type,
      order: insertAt,
      visible: true,
      align: type === "divider" || type === "spacer" ? "left" : "center",
      bold: false,
      fontSize: "sm",
      color: null,
      ...(type === "textBlock" ? { text: "Custom text" } : {}),
      ...(type === "spacer" ? { height: 16 } : {}),
      ...(type === "image" ? { imageUrl: "", imageHeight: 48 } : {}),
      ...(type === "qrCode" || type === "barcode"
        ? { dataField: "saleId" as const }
        : {}),
    };

    setConfig((prev: ExtendedConfig) =>
      normaliseOrders({
        ...prev,
        elements: prev.elements.map((el: ReceiptElementStyle) => ({
          ...el,
          order: el.order >= insertAt ? el.order + 1 : el.order,
        })),
        customBlocks: [
          ...(prev.customBlocks ?? []).map((b: CustomBlock) => ({
            ...b,
            order: b.order >= insertAt ? b.order + 1 : b.order,
          })),
          newBlock,
        ],
      })
    );
    setSelectedItem({ kind: "custom", id: newBlock.id });
    setDirty(true);
  }

  // ── Reorder (drag within list) ─────────────────────────────────────────────

  function reorderItems(fromIndex: number, toIndex: number) {
    setConfig((prev: ExtendedConfig) => {
      const unified = getUnifiedItems(prev);
      const [moved] = unified.splice(fromIndex, 1);
      unified.splice(toIndex, 0, moved);

      const newElements = prev.elements.map((el: ReceiptElementStyle) => ({ ...el }));
      const newBlocks = (prev.customBlocks ?? []).map((b: CustomBlock) => ({ ...b }));

      unified.forEach((item, idx) => {
        if (item.kind === "fixed") {
          const el = newElements.find((e: ReceiptElementStyle) => e.id === item.el.id);
          if (el) el.order = idx;
        } else {
          const block = newBlocks.find((b: CustomBlock) => b.id === item.block.id);
          if (block) block.order = idx;
        }
      });

      return { ...prev, elements: newElements, customBlocks: newBlocks };
    });
    setDirty(true);
  }

  // ── Footer row helpers ─────────────────────────────────────────────────────

  function addFooterRow(type: FooterRowType) {
    const newRow: FooterRow = {
      id: crypto.randomUUID(),
      type,
      content: type === "text" ? "Thank you for your purchase!" : undefined,
      imageUrl: type === "image" ? "" : undefined,
      imageHeight: type === "image" ? 40 : undefined,
      align: "center",
      bold: false,
      fontSize: "sm",
      color: null,
    };
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      footerRows: [...(prev.footerRows ?? []), newRow],
    }));
    setDirty(true);
  }

  function updateFooterRow(id: string, patch: Partial<FooterRow>) {
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      footerRows: (prev.footerRows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    setDirty(true);
  }

  function removeFooterRow(id: string) {
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      footerRows: (prev.footerRows ?? []).filter((r) => r.id !== id),
    }));
    setDirty(true);
  }

  function reorderFooterRows(fromIndex: number, toIndex: number) {
    setConfig((prev: ExtendedConfig) => {
      const rows = [...(prev.footerRows ?? [])];
      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      return { ...prev, footerRows: rows };
    });
    setDirty(true);
  }

  // ── Item column helpers ────────────────────────────────────────────────────

  function updateItemColumn(id: string, patch: Partial<ItemColumn>) {
    setConfig((prev: ExtendedConfig) => ({
      ...prev,
      itemColumns: (prev.itemColumns ?? DEFAULT_ITEM_COLUMNS).map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
    setDirty(true);
  }

  function reorderItemColumns(fromIndex: number, toIndex: number) {
    setConfig((prev: ExtendedConfig) => {
      const cols = [...(prev.itemColumns ?? DEFAULT_ITEM_COLUMNS)].sort(
        (a, b) => a.order - b.order
      );
      const [moved] = cols.splice(fromIndex, 1);
      cols.splice(toIndex, 0, moved);
      return {
        ...prev,
        itemColumns: cols.map((c, i) => ({ ...c, order: i })),
      };
    });
    setDirty(true);
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response: UploadResponse) => updateConfig({ logoUrl: response.url }),
    onError: (err: Error) =>
      toast({ title: "Logo upload failed", description: err.message, variant: "destructive" }),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListReceiptTemplatesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDefaultReceiptTemplateQueryKey() });
  };

  const createMutation = useCreateReceiptTemplate({
    mutation: {
      onSuccess: (t: ReceiptTemplate) => {
        invalidateAll();
        setSelectedId(t.id);
        setDirty(false);
        toast({ title: "Template created" });
      },
      onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateReceiptTemplate({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setDirty(false);
        toast({ title: "Template saved" });
      },
      onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteReceiptTemplate({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setSelectedId(null);
        toast({ title: "Template deleted" });
      },
      onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
    },
  });

  const setDefaultMutation = useSetDefaultReceiptTemplate({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        toast({ title: "Default template updated" });
      },
      onError: () => toast({ title: "Failed to set default", variant: "destructive" }),
    },
  });

  function handleSave() {
    if (!name.trim()) {
      toast({ title: "Please give this template a name", variant: "destructive" });
      return;
    }
    if (selectedId === null) {
      createMutation.mutate({ data: { name: name.trim(), config: config as unknown as ReceiptTemplateConfig } });
    } else {
      updateMutation.mutate({ id: selectedId, data: { name: name.trim(), config: config as unknown as ReceiptTemplateConfig } });
    }
  }

  function handleDuplicate() {
    const newName = `${name} (copy)`;
    createMutation.mutate({
      data: { name: newName, config: config as unknown as ReceiptTemplateConfig },
    });
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify({ name, config }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-template-${name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as {
          name?: string;
          config?: ReceiptTemplateConfig;
        };
        if (data.config) {
          if (data.name) setName(data.name);
          setConfig(cloneConfig(data.config));
          setSelectedId(null);
          setDirty(true);
          toast({ title: "Layout imported" });
        } else {
          toast({ title: "Invalid layout file", variant: "destructive" });
        }
      } catch {
        toast({ title: "Could not parse file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleResetToDefault() {
    setConfig(cloneConfig(DEFAULT_CONFIG));
    setSelectedItem(null);
    setDirty(true);
    toast({ title: "Reset to default layout" });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const unified = getUnifiedItems(config);
  const activeFixedEl =
    selectedItem?.kind === "fixed"
      ? config.elements.find((e: ReceiptElementStyle) => e.id === selectedItem.id) ?? null
      : null;
  const activeCustomBlock =
    selectedItem?.kind === "custom"
      ? (config.customBlocks ?? []).find((b: CustomBlock) => b.id === selectedItem.id) ?? null
      : null;
  const currentTemplate = templates?.find((t: ReceiptTemplate) => t.id === selectedId) ?? null;
  const sortedItemColumns = [...(config.itemColumns ?? DEFAULT_ITEM_COLUMNS)].sort(
    (a, b) => a.order - b.order
  );
  const sortedFooterRows = [...(config.footerRows ?? [])];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ReceiptIcon className="h-5 w-5 text-primary" />
              Receipt Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              Design how your printed receipts look, then set a default template.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleResetToDefault}
            title="Reset layout to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => importJsonRef.current?.click()}
            title="Import layout from JSON"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <input
            ref={importJsonRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportJSON}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportJSON}
            title="Export layout as JSON"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {selectedId !== null && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={createMutation.isPending}
              onClick={handleDuplicate}
              title="Duplicate this template"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
          )}
          {currentTemplate && !currentTemplate.isDefault && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={setDefaultMutation.isPending}
              onClick={() => setDefaultMutation.mutate({ id: currentTemplate.id })}
            >
              <Star className="h-3.5 w-3.5" />
              Set Default
            </Button>
          )}
          {currentTemplate && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending || (templates?.length ?? 0) <= 1}
              title={
                (templates?.length ?? 0) <= 1
                  ? "You must keep at least one template"
                  : undefined
              }
              onClick={() => deleteMutation.mutate({ id: currentTemplate.id })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!dirty || createMutation.isPending || updateMutation.isPending}
            onClick={handleSave}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving…"
              : selectedId === null
              ? "Create Template"
              : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]">
        {/* Templates list */}
        <div className="rounded-lg border bg-card p-3 space-y-2 h-fit">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">
              Templates
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={startNewTemplate}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {templates?.map((t: ReceiptTemplate) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadTemplate(t)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selectedId === t.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span className="truncate">{t.name}</span>
                {t.isDefault && <Star className="h-3 w-3 fill-current shrink-0" />}
              </button>
            ))}
            {selectedId === null && (
              <div className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm bg-primary/10 text-primary font-medium">
                {name || "New Template"}{" "}
                <Badge variant="secondary" className="text-[10px]">
                  unsaved
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border bg-muted/30 p-6 flex items-start justify-center overflow-auto">
          <div
            className="bg-white rounded-sm shadow-md"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
          >
            <ReceiptView config={config as unknown as ReceiptTemplateConfig} sale={SAMPLE_SALE} />
          </div>
        </div>

        {/* Style panel */}
        <div className="rounded-lg border bg-card p-4 space-y-5 h-fit max-h-[calc(100vh-220px)] overflow-y-auto">
          {/* Template name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              className="h-8 text-sm"
            />
          </div>

          <Separator />

          {/* Store info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Store Info
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Name</Label>
              <Input
                value={config.storeName}
                onChange={(e) => updateConfig({ storeName: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input
                value={config.storeAddress ?? ""}
                onChange={(e) => updateConfig({ storeAddress: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={config.storePhone ?? ""}
                onChange={(e) => updateConfig({ storePhone: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Logo</Label>
              <Switch
                checked={config.showLogo}
                onCheckedChange={(v) => updateConfig({ showLogo: v })}
              />
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative h-14 w-14 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {config.logoUrl ? (
                  <>
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ logoUrl: null });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                className="text-xs font-medium text-foreground hover:underline"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                Upload logo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {/* Logo size */}
            {config.showLogo && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Logo Size</Label>
                  <span className="text-xs text-muted-foreground">{config.logoSize ?? 48}px</span>
                </div>
                <Slider
                  min={24}
                  max={150}
                  step={4}
                  value={[config.logoSize ?? 48]}
                  onValueChange={([v]) => updateConfig({ logoSize: v })}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Paper & Font */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Paper & Font
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Paper Size</Label>
              <Select
                value={config.paperSize}
                onValueChange={(v) =>
                  updateConfig({ paperSize: v as ExtendedConfig["paperSize"] })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (small)</SelectItem>
                  <SelectItem value="80mm">80mm (standard)</SelectItem>
                  <SelectItem value="A4">A4 (full page)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(v) =>
                  updateConfig({ fontFamily: v as ReceiptTemplateConfig["fontFamily"] })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Sans-serif</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Base Font Size</Label>
                <span className="text-xs text-muted-foreground">
                  {config.baseFontSize}px
                </span>
              </div>
              <Slider
                min={9}
                max={20}
                step={1}
                value={[config.baseFontSize]}
                onValueChange={([v]) => updateConfig({ baseFontSize: v })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Spacing</Label>
                <span className="text-xs text-muted-foreground">
                  {config.spacing}px
                </span>
              </div>
              <Slider
                min={2}
                max={20}
                step={1}
                value={[config.spacing]}
                onValueChange={([v]) => updateConfig({ spacing: v })}
              />
            </div>
          </div>

          <Separator />

          {/* Colors */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Colors
            </h3>
            {(
              [
                { key: "textColor" as const, label: "Text" },
                { key: "accentColor" as const, label: "Accent" },
                { key: "backgroundColor" as const, label: "Background" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{label}</Label>
                <label
                  className="h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: config[key] as string }}
                >
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={config[key] as string}
                    onChange={(e) =>
                      updateConfig({ [key]: e.target.value } as Partial<ExtendedConfig>)
                    }
                  />
                </label>
              </div>
            ))}
          </div>

          <Separator />

          {/* Border & Shape */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Border &amp; Shape
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Border Style</Label>
              <Select
                value={config.borderStyle ?? "none"}
                onValueChange={(v) =>
                  updateConfig({ borderStyle: v as ExtendedConfig["borderStyle"] })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(config.borderStyle ?? "none") !== "none" && (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Border Color</Label>
                <label
                  className="h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: config.borderColor ?? "#e2e8f0" }}
                >
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={config.borderColor ?? "#e2e8f0"}
                    onChange={(e) => updateConfig({ borderColor: e.target.value })}
                  />
                </label>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rounded Corners</Label>
                <span className="text-xs text-muted-foreground">{config.borderRadius ?? 0}px</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[config.borderRadius ?? 0]}
                onValueChange={([v]) => updateConfig({ borderRadius: v })}
              />
            </div>
          </div>

          <Separator />

          {/* ── Elements list ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Elements
            </h3>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Drag to reorder. Click a row to style it.
            </p>

            <div
              className="space-y-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragSource?.kind === "palette") {
                  addCustomBlock(dragSource.blockType, unified.length);
                }
                setDragSource(null);
                setDropTargetIndex(null);
              }}
            >
              {unified.map((item, idx) => {
                const isFixed = item.kind === "fixed";
                const itemId = isFixed ? item.el.id : item.block.id;
                const label = isFixed
                  ? ELEMENT_LABELS[item.el.id]
                  : CUSTOM_BLOCK_LABELS[item.block.type];
                const visible = isFixed ? item.el.visible : item.block.visible;
                const isSelected =
                  selectedItem?.kind === item.kind &&
                  selectedItem.id === itemId;

                return (
                  <div
                    key={itemId}
                    draggable
                    onDragStart={() =>
                      setDragSource({ kind: "reorder", index: idx })
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropTargetIndex(idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragSource?.kind === "reorder") {
                        if (dragSource.index !== idx)
                          reorderItems(dragSource.index, idx);
                      } else if (dragSource?.kind === "palette") {
                        addCustomBlock(dragSource.blockType, idx);
                      }
                      setDragSource(null);
                      setDropTargetIndex(null);
                    }}
                    onDragEnd={() => {
                      setDragSource(null);
                      setDropTargetIndex(null);
                    }}
                    onClick={() =>
                      setSelectedItem(
                        isFixed
                          ? { kind: "fixed", id: item.el.id }
                          : { kind: "custom", id: item.block.id }
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                      !visible && "opacity-50",
                      dropTargetIndex === idx &&
                        dragSource?.kind === "palette" &&
                        "border-primary border-dashed"
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
                    <span className="flex-1 truncate">{label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFixed) {
                          updateElement(item.el.id, { visible: !visible });
                        } else {
                          updateCustomBlock(item.block.id, { visible: !visible });
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {!isFixed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomBlock(item.block.id);
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {dragSource?.kind === "palette" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTargetIndex(unified.length);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addCustomBlock(dragSource.blockType, unified.length);
                    setDragSource(null);
                    setDropTargetIndex(null);
                  }}
                  className={cn(
                    "rounded-md border border-dashed border-primary/40 px-2 py-2 text-center text-[11px] text-primary/60 transition-colors",
                    dropTargetIndex === unified.length && "border-primary bg-primary/5"
                  )}
                >
                  Drop here to add at end
                </div>
              )}
            </div>

            {/* Properties panel for selected fixed element */}
            {activeFixedEl && (() => {
              const extEl = activeFixedEl as ExtendedElementStyle;
              return (
                <div className="rounded-md border bg-muted/30 p-3 space-y-3 mt-2">
                  <p className="text-xs font-semibold">
                    {ELEMENT_LABELS[activeFixedEl.id]}
                  </p>
                  <ElementStyleControls
                    align={activeFixedEl.align}
                    fontSize={activeFixedEl.fontSize}
                    bold={activeFixedEl.bold}
                    color={activeFixedEl.color ?? null}
                    backgroundColor={extEl.backgroundColor ?? null}
                    paddingTop={extEl.paddingTop ?? 0}
                    paddingBottom={extEl.paddingBottom ?? 0}
                    onAlignChange={(v) => updateElement(activeFixedEl.id, { align: v })}
                    onFontSizeChange={(v) => updateElement(activeFixedEl.id, { fontSize: v })}
                    onBoldChange={(v) => updateElement(activeFixedEl.id, { bold: v })}
                    onColorChange={(v) => updateElement(activeFixedEl.id, { color: v })}
                    onBackgroundColorChange={(v) => updateElement(activeFixedEl.id, { backgroundColor: v } as Partial<ReceiptElementStyle>)}
                    onPaddingTopChange={(v) => updateElement(activeFixedEl.id, { paddingTop: v } as Partial<ReceiptElementStyle>)}
                    onPaddingBottomChange={(v) => updateElement(activeFixedEl.id, { paddingBottom: v } as Partial<ReceiptElementStyle>)}
                  />
                </div>
              );
            })()}

            {/* Properties panel for selected custom block */}
            {activeCustomBlock && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    {CUSTOM_BLOCK_LABELS[activeCustomBlock.type as CustomBlockType]}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCustomBlock(activeCustomBlock.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remove element"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {activeCustomBlock.type !== "divider" &&
                  activeCustomBlock.type !== "spacer" && (
                    <ElementStyleControls
                      align={activeCustomBlock.align}
                      fontSize={activeCustomBlock.fontSize}
                      bold={activeCustomBlock.bold}
                      color={activeCustomBlock.color ?? null}
                      backgroundColor={null}
                      paddingTop={0}
                      paddingBottom={0}
                      onAlignChange={(v) => updateCustomBlock(activeCustomBlock.id, { align: v })}
                      onFontSizeChange={(v) => updateCustomBlock(activeCustomBlock.id, { fontSize: v })}
                      onBoldChange={(v) => updateCustomBlock(activeCustomBlock.id, { bold: v })}
                      onColorChange={(v) => updateCustomBlock(activeCustomBlock.id, { color: v })}
                      onBackgroundColorChange={() => {}}
                      onPaddingTopChange={() => {}}
                      onPaddingBottomChange={() => {}}
                      hideBackground
                      hidePadding
                    />
                  )}

                {activeCustomBlock.type === "divider" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <label
                      className="block h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden"
                      style={{ backgroundColor: activeCustomBlock.color ?? "#0f172a" }}
                    >
                      <input
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={activeCustomBlock.color ?? "#0f172a"}
                        onChange={(e) =>
                          updateCustomBlock(activeCustomBlock.id, { color: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Text block: content + template variable picker */}
                {activeCustomBlock.type === "textBlock" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Text Content</Label>
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                          onClick={() => setShowVarPicker((v) => !v)}
                        >
                          <Hash className="h-3 w-3" />
                          Insert variable
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {showVarPicker && (
                          <div className="absolute right-0 top-5 z-10 rounded-md border bg-popover shadow-md p-1 w-44 max-h-44 overflow-y-auto">
                            {TEMPLATE_VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                type="button"
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted truncate"
                                onClick={() => {
                                  updateCustomBlock(activeCustomBlock.id, {
                                    text: (activeCustomBlock.text ?? "") + v.key,
                                  });
                                  setShowVarPicker(false);
                                }}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={activeCustomBlock.text ?? ""}
                      onChange={(e) =>
                        updateCustomBlock(activeCustomBlock.id, { text: e.target.value })
                      }
                      rows={3}
                      className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Enter text… or insert {{variable}}"
                    />
                  </div>
                )}

                {activeCustomBlock.type === "image" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Image URL</Label>
                      <Input
                        value={activeCustomBlock.imageUrl ?? ""}
                        onChange={(e) =>
                          updateCustomBlock(activeCustomBlock.id, { imageUrl: e.target.value })
                        }
                        className="h-8 text-sm"
                        placeholder="https://…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Height</Label>
                        <span className="text-xs text-muted-foreground">
                          {activeCustomBlock.imageHeight ?? 48}px
                        </span>
                      </div>
                      <Slider
                        min={16}
                        max={120}
                        step={4}
                        value={[activeCustomBlock.imageHeight ?? 48]}
                        onValueChange={([v]) =>
                          updateCustomBlock(activeCustomBlock.id, { imageHeight: v })
                        }
                      />
                    </div>
                  </>
                )}

                {activeCustomBlock.type === "spacer" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Height</Label>
                      <span className="text-xs text-muted-foreground">
                        {activeCustomBlock.height ?? 16}px
                      </span>
                    </div>
                    <Slider
                      min={4}
                      max={80}
                      step={4}
                      value={[activeCustomBlock.height ?? 16]}
                      onValueChange={([v]) =>
                        updateCustomBlock(activeCustomBlock.id, { height: v })
                      }
                    />
                  </div>
                )}

                {(activeCustomBlock.type === "qrCode" ||
                  activeCustomBlock.type === "barcode") && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Encode</Label>
                      <Select
                        value={activeCustomBlock.dataField ?? "saleId"}
                        onValueChange={(v) =>
                          updateCustomBlock(activeCustomBlock.id, {
                            dataField: v as CustomBlock["dataField"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saleId">Sale ID</SelectItem>
                          <SelectItem value="custom">Custom value</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {activeCustomBlock.dataField === "custom" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Custom Value</Label>
                        <Input
                          value={activeCustomBlock.customValue ?? ""}
                          onChange={(e) =>
                            updateCustomBlock(activeCustomBlock.id, {
                              customValue: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                          placeholder="Text to encode…"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Add Elements palette ────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Add Elements
            </h3>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Drag into the list above, or click to append.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE_ITEMS.map(({ type, label, icon: Icon, description }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    setDragSource({ kind: "palette", blockType: type });
                  }}
                  onDragEnd={() => {
                    setDragSource(null);
                    setDropTargetIndex(null);
                  }}
                  onClick={() => addCustomBlock(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-sm cursor-grab active:cursor-grabbing select-none",
                    "hover:border-primary/50 hover:bg-primary/5 transition-colors",
                    dragSource?.kind === "palette" &&
                      dragSource.blockType === type &&
                      "border-primary bg-primary/10 opacity-60"
                  )}
                  title={description}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-xs leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Items Table Columns ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Items Table Columns
            </h3>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Drag to reorder. Toggle visibility.
            </p>
            <div className="space-y-1">
              {sortedItemColumns.map((col, idx) => (
                <ItemColumnRow
                  key={col.id}
                  col={col}
                  index={idx}
                  onToggleVisible={() => updateItemColumn(col.id, { visible: !col.visible })}
                  onLabelChange={(v) => updateItemColumn(col.id, { label: v })}
                  onAlignChange={(v) => updateItemColumn(col.id, { align: v })}
                  onDrop={(toIdx) => reorderItemColumns(idx, toIdx)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Footer Rows ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Footer Rows
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Rows shown below the receipt. Drag to reorder.{" "}
              {sortedFooterRows.length === 0 && 'Falls back to "Footer Text" when empty.'}
            </p>

            {sortedFooterRows.length === 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Footer Text (fallback)</Label>
                <Input
                  value={config.footerText}
                  onChange={(e) => updateConfig({ footerText: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              {sortedFooterRows.map((row, idx) => (
                <FooterRowEditor
                  key={row.id}
                  row={row}
                  index={idx}
                  showVarPicker={footerVarPickerId === row.id}
                  onToggleVarPicker={() =>
                    setFooterVarPickerId((prev) => (prev === row.id ? null : row.id))
                  }
                  onUpdate={(patch) => updateFooterRow(row.id, patch)}
                  onRemove={() => removeFooterRow(row.id)}
                  onDrop={(toIdx) => reorderFooterRows(idx, toIdx)}
                />
              ))}
            </div>

            {/* Add footer row buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {(["text", "image", "divider", "spacer"] as FooterRowType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addFooterRow(type)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Element style controls ────────────────────────────────────────────────────

function ElementStyleControls({
  align,
  fontSize,
  bold,
  color,
  backgroundColor,
  paddingTop,
  paddingBottom,
  onAlignChange,
  onFontSizeChange,
  onBoldChange,
  onColorChange,
  onBackgroundColorChange,
  onPaddingTopChange,
  onPaddingBottomChange,
  hideBackground = false,
  hidePadding = false,
}: {
  align: "left" | "center" | "right";
  fontSize: ReceiptElementStyle["fontSize"];
  bold: boolean;
  color: string | null;
  backgroundColor: string | null;
  paddingTop: number;
  paddingBottom: number;
  onAlignChange: (v: "left" | "center" | "right") => void;
  onFontSizeChange: (v: ReceiptElementStyle["fontSize"]) => void;
  onBoldChange: (v: boolean) => void;
  onColorChange: (v: string | null) => void;
  onBackgroundColorChange: (v: string | null) => void;
  onPaddingTopChange: (v: number) => void;
  onPaddingBottomChange: (v: number) => void;
  hideBackground?: boolean;
  hidePadding?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Alignment</Label>
        <div className="flex gap-1">
          {(
            [
              { value: "left" as const, Icon: AlignLeft },
              { value: "center" as const, Icon: AlignCenter },
              { value: "right" as const, Icon: AlignRight },
            ] as const
          ).map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onAlignChange(value)}
              className={cn(
                "flex-1 flex items-center justify-center rounded-md border py-1.5 transition-colors",
                align === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Font Size</Label>
        <Select
          value={fontSize}
          onValueChange={(v) => onFontSizeChange(v as ReceiptElementStyle["fontSize"])}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="xs">Extra Small</SelectItem>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="base">Base</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="xl">Extra Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
          <Bold className="h-3 w-3" /> Bold
        </Label>
        <Switch checked={bold} onCheckedChange={onBoldChange} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Text Color</Label>
        <div className="flex items-center gap-2">
          {color && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onColorChange(null)}
            >
              reset
            </button>
          )}
          <label
            className="h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: color ?? "#0f172a" }}
          >
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={color ?? "#0f172a"}
              onChange={(e) => onColorChange(e.target.value)}
            />
          </label>
        </div>
      </div>
      {!hideBackground && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">Background</Label>
          <div className="flex items-center gap-2">
            {backgroundColor && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => onBackgroundColorChange(null)}
              >
                reset
              </button>
            )}
            <label
              className="h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden"
              style={{ backgroundColor: backgroundColor ?? "#ffffff" }}
            >
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={backgroundColor ?? "#ffffff"}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
      {!hidePadding && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Padding Top</Label>
              <span className="text-xs text-muted-foreground">{paddingTop}px</span>
            </div>
            <Slider
              min={0}
              max={32}
              step={2}
              value={[paddingTop]}
              onValueChange={([v]) => onPaddingTopChange(v)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Padding Bottom</Label>
              <span className="text-xs text-muted-foreground">{paddingBottom}px</span>
            </div>
            <Slider
              min={0}
              max={32}
              step={2}
              value={[paddingBottom]}
              onValueChange={([v]) => onPaddingBottomChange(v)}
            />
          </div>
        </>
      )}
    </>
  );
}

// ─── Item column row ───────────────────────────────────────────────────────────

function ItemColumnRow({
  col,
  index,
  onToggleVisible,
  onLabelChange,
  onAlignChange,
  onDrop,
}: {
  col: ItemColumn;
  index: number;
  onToggleVisible: () => void;
  onLabelChange: (v: string) => void;
  onAlignChange: (v: "left" | "center" | "right") => void;
  onDrop: (toIndex: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => setDragging(true)}
      onDragEnd={() => { setDragging(false); setDragOver(false); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop(index);
      }}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border px-2 py-1.5 transition-colors",
        dragOver && "border-primary bg-primary/5",
        dragging && "opacity-50",
        !col.visible && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
        {editing ? (
          <input
            autoFocus
            className="flex-1 text-xs border rounded px-1.5 py-0.5 bg-background"
            value={col.label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium cursor-text truncate"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
          >
            {col.label}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          {(["left", "center", "right"] as const).map((a) => {
            const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onAlignChange(a)}
                className={cn(
                  "p-0.5 rounded",
                  col.align === a ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onToggleVisible} className="text-muted-foreground hover:text-foreground">
          {col.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Footer row editor ────────────────────────────────────────────────────────

function FooterRowEditor({
  row,
  index,
  showVarPicker,
  onToggleVarPicker,
  onUpdate,
  onRemove,
  onDrop,
}: {
  row: FooterRow;
  index: number;
  showVarPicker: boolean;
  onToggleVarPicker: () => void;
  onUpdate: (patch: Partial<FooterRow>) => void;
  onRemove: () => void;
  onDrop: (toIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const rowLabel =
    row.type === "text"
      ? row.content?.slice(0, 24) || "Text row"
      : row.type === "image"
      ? "Image row"
      : row.type === "divider"
      ? "Divider"
      : "Spacer";

  return (
    <div
      draggable
      onDragStart={() => {}}
      onDragEnd={() => setDragOver(false)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop(index);
      }}
      className={cn(
        "rounded-md border transition-colors",
        dragOver && "border-primary bg-primary/5"
      )}
    >
      {/* Row header */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
        <span className="flex-1 text-xs truncate">
          <span className="text-muted-foreground mr-1">[{row.type}]</span>
          {rowLabel}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-3 py-2.5 space-y-2.5">
          {(row.type === "text") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Content</Label>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    onClick={onToggleVarPicker}
                  >
                    <Hash className="h-3 w-3" /> Insert var
                  </button>
                  {showVarPicker && (
                    <div className="absolute right-0 top-5 z-10 rounded-md border bg-popover shadow-md p-1 w-44 max-h-44 overflow-y-auto">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted truncate"
                          onClick={() => {
                            onUpdate({ content: (row.content ?? "") + v.key });
                            onToggleVarPicker();
                          }}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                value={row.content ?? ""}
                onChange={(e) => onUpdate({ content: e.target.value })}
                rows={2}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Text or {{variable}}"
              />
            </div>
          )}

          {row.type === "image" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Image URL</Label>
                <Input
                  value={row.imageUrl ?? ""}
                  onChange={(e) => onUpdate({ imageUrl: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">Height</Label>
                  <span className="text-[10px] text-muted-foreground">{row.imageHeight ?? 40}px</span>
                </div>
                <Slider
                  min={16}
                  max={100}
                  step={4}
                  value={[row.imageHeight ?? 40]}
                  onValueChange={([v]) => onUpdate({ imageHeight: v })}
                />
              </div>
            </>
          )}

          {row.type !== "divider" && row.type !== "spacer" && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => {
                  const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onUpdate({ align: a })}
                      className={cn(
                        "flex items-center justify-center rounded border p-1.5 transition-colors",
                        row.align === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={row.bold}
                  onCheckedChange={(v) => onUpdate({ bold: v })}
                />
                <span className="text-xs">Bold</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
