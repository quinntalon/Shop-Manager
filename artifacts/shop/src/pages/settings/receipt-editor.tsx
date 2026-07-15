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
import type { ReceiptTemplate, ReceiptTemplateConfig, ReceiptElementId, ReceiptElementStyle } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Trash2, Star, GripVertical, Eye, EyeOff,
  AlignLeft, AlignCenter, AlignRight, Bold, ImagePlus, X, Receipt as ReceiptIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReceiptView, SAMPLE_SALE } from "@/components/receipt/receipt-view";

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

const DEFAULT_CONFIG: ReceiptTemplateConfig = {
  paperSize: "80mm",
  fontFamily: "sans",
  baseFontSize: 13,
  spacing: 8,
  textColor: "#0f172a",
  accentColor: "#2563eb",
  backgroundColor: "#ffffff",
  showLogo: true,
  logoUrl: null,
  storeName: "Nexus POS",
  storeAddress: "",
  storePhone: "",
  footerText: "Thank you for your purchase!",
  elements: DEFAULT_ELEMENTS,
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

function cloneConfig(config: ReceiptTemplateConfig): ReceiptTemplateConfig {
  return JSON.parse(JSON.stringify(config));
}

export default function ReceiptEditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates, isLoading } = useListReceiptTemplates({
    query: { queryKey: getListReceiptTemplatesQueryKey() },
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("New Template");
  const [config, setConfig] = useState<ReceiptTemplateConfig>(DEFAULT_CONFIG);
  const [selectedElement, setSelectedElement] = useState<ReceiptElementId | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!templates || templates.length === 0 || selectedId !== null) return;
    const first = templates.find((t) => t.isDefault) ?? templates[0];
    setSelectedId(first.id);
    setName(first.name);
    setConfig(cloneConfig(first.config));
    setDirty(false);
  }, [templates, selectedId]);

  function loadTemplate(t: ReceiptTemplate) {
    setSelectedId(t.id);
    setName(t.name);
    setConfig(cloneConfig(t.config));
    setSelectedElement(null);
    setDirty(false);
  }

  function startNewTemplate() {
    setSelectedId(null);
    setName("New Template");
    setConfig(cloneConfig(DEFAULT_CONFIG));
    setSelectedElement(null);
    setDirty(true);
  }

  function updateConfig(patch: Partial<ReceiptTemplateConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function updateElement(id: ReceiptElementId, patch: Partial<ReceiptElementStyle>) {
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
    setDirty(true);
  }

  function reorderElements(fromIndex: number, toIndex: number) {
    setConfig((prev) => {
      const sorted = [...prev.elements].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      const reordered = sorted.map((el, idx) => ({ ...el, order: idx }));
      return { ...prev, elements: reordered };
    });
    setDirty(true);
  }

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => updateConfig({ logoUrl: response.url }),
    onError: (err) => toast({ title: "Logo upload failed", description: err.message, variant: "destructive" }),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListReceiptTemplatesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDefaultReceiptTemplateQueryKey() });
  };

  const createMutation = useCreateReceiptTemplate({
    mutation: {
      onSuccess: (t) => {
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
      createMutation.mutate({ data: { name: name.trim(), config } });
    } else {
      updateMutation.mutate({ id: selectedId, data: { name: name.trim(), config } });
    }
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

  const sortedElements = [...config.elements].sort((a, b) => a.order - b.order);
  const activeElement = config.elements.find((e) => e.id === selectedElement) ?? null;
  const currentTemplate = templates?.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="flex items-center gap-2">
          {currentTemplate && !currentTemplate.isDefault && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={setDefaultMutation.isPending}
              onClick={() => setDefaultMutation.mutate({ id: currentTemplate.id })}
            >
              <Star className="h-3.5 w-3.5" />
              Set as Default
            </Button>
          )}
          {currentTemplate && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending || (templates?.length ?? 0) <= 1}
              title={(templates?.length ?? 0) <= 1 ? "You must keep at least one template" : undefined}
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
              : selectedId === null ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]">
        {/* Templates list */}
        <div className="rounded-lg border bg-card p-3 space-y-2 h-fit">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Templates</h2>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startNewTemplate}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {templates?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadTemplate(t)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selectedId === t.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="truncate">{t.name}</span>
                {t.isDefault && <Star className="h-3 w-3 fill-current shrink-0" />}
              </button>
            ))}
            {selectedId === null && (
              <div className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm bg-primary/10 text-primary font-medium">
                {name || "New Template"} <Badge variant="secondary" className="text-[10px]">unsaved</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border bg-muted/30 p-6 flex items-start justify-center overflow-auto">
          <div className="bg-white rounded-sm shadow-md" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            <ReceiptView config={config} sale={SAMPLE_SALE} />
          </div>
        </div>

        {/* Style panel */}
        <div className="rounded-lg border bg-card p-4 space-y-5 h-fit max-h-[calc(100vh-220px)] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Template Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} className="h-8 text-sm" />
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Store Info</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Name</Label>
              <Input value={config.storeName} onChange={(e) => updateConfig({ storeName: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={config.storeAddress ?? ""} onChange={(e) => updateConfig({ storeAddress: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={config.storePhone ?? ""} onChange={(e) => updateConfig({ storePhone: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Footer Text</Label>
              <Input value={config.footerText} onChange={(e) => updateConfig({ footerText: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Logo</Label>
              <Switch checked={config.showLogo} onCheckedChange={(v) => updateConfig({ showLogo: v })} />
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative h-14 w-14 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {config.logoUrl ? (
                  <>
                    <img src={config.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      onClick={(e) => { e.stopPropagation(); updateConfig({ logoUrl: null }); }}
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
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Paper & Font</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Paper Size</Label>
              <Select value={config.paperSize} onValueChange={(v) => updateConfig({ paperSize: v as ReceiptTemplateConfig["paperSize"] })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (small)</SelectItem>
                  <SelectItem value="80mm">80mm (standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font Family</Label>
              <Select value={config.fontFamily} onValueChange={(v) => updateConfig({ fontFamily: v as ReceiptTemplateConfig["fontFamily"] })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                <span className="text-xs text-muted-foreground">{config.baseFontSize}px</span>
              </div>
              <Slider min={9} max={20} step={1} value={[config.baseFontSize]} onValueChange={([v]) => updateConfig({ baseFontSize: v })} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Spacing</Label>
                <span className="text-xs text-muted-foreground">{config.spacing}px</span>
              </div>
              <Slider min={2} max={20} step={1} value={[config.spacing]} onValueChange={([v]) => updateConfig({ spacing: v })} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Colors</h3>
            {([
              { key: "textColor" as const, label: "Text" },
              { key: "accentColor" as const, label: "Accent" },
              { key: "backgroundColor" as const, label: "Background" },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{label}</Label>
                <label className="h-7 w-10 rounded-md border cursor-pointer relative overflow-hidden" style={{ backgroundColor: config[key] }}>
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={config[key]}
                    onChange={(e) => updateConfig({ [key]: e.target.value } as Partial<ReceiptTemplateConfig>)}
                  />
                </label>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Elements</h3>
            <p className="text-[11px] text-muted-foreground -mt-2">Drag to reorder. Click a row to style it.</p>
            <div className="space-y-1">
              {sortedElements.map((el, idx) => (
                <div
                  key={el.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== idx) reorderElements(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  onClick={() => setSelectedElement(el.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer transition-colors",
                    selectedElement === el.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    !el.visible && "opacity-50"
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
                  <span className="flex-1 truncate">{ELEMENT_LABELS[el.id]}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {el.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {activeElement && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3 mt-2">
                <p className="text-xs font-semibold">{ELEMENT_LABELS[activeElement.id]}</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alignment</Label>
                  <div className="flex gap-1">
                    {([
                      { value: "left" as const, Icon: AlignLeft },
                      { value: "center" as const, Icon: AlignCenter },
                      { value: "right" as const, Icon: AlignRight },
                    ]).map(({ value, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateElement(activeElement.id, { align: value })}
                        className={cn(
                          "flex-1 flex items-center justify-center rounded-md border py-1.5 transition-colors",
                          activeElement.align === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Size</Label>
                  <Select value={activeElement.fontSize} onValueChange={(v) => updateElement(activeElement.id, { fontSize: v as ReceiptElementStyle["fontSize"] })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs flex items-center gap-1.5"><Bold className="h-3 w-3" /> Bold</Label>
                  <Switch checked={activeElement.bold} onCheckedChange={(v) => updateElement(activeElement.id, { bold: v })} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
