import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings, applyTheme } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Moon, Receipt, SlidersHorizontal, Store, Sun, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function logoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: "Blue", value: "221 83% 53%" },
  { name: "Violet", value: "262 80% 60%" },
  { name: "Teal", value: "190 90% 40%" },
  { name: "Green", value: "142 71% 40%" },
  { name: "Orange", value: "25 95% 53%" },
  { name: "Rose", value: "347 77% 50%" },
  { name: "Slate", value: "215 25% 35%" },
];

function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#3b82f6";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

function hexToHslString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function SettingsPage() {
  const { settings, isLoading } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const [businessName, setBusinessName] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [primaryColor, setPrimaryColor] = useState("221 83% 53%");
  const [logoPath, setLogoPath] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName);
      setThemeMode(settings.themeMode as "light" | "dark");
      setPrimaryColor(settings.primaryColor);
      setLogoPath(settings.logoUrl ?? null);
    }
  }, [settings]);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setLogoPath(response.url);
    },
    onError: (err) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetSettingsQueryKey(), data);
        applyTheme(data.themeMode, data.primaryColor);
        toast({ title: "Settings saved" });
      },
      onError: (err) => {
        toast({
          title: "Failed to save settings",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handlePreviewMode = (mode: "light" | "dark") => {
    setThemeMode(mode);
    applyTheme(mode, primaryColor);
  };

  const handlePreviewColor = (value: string) => {
    setPrimaryColor(value);
    applyTheme(themeMode, value);
  };

  const handleSave = () => {
    updateMutation.mutate({
      data: {
        businessName: businessName.trim() || "Nexus POS",
        logoUrl: logoPath,
        themeMode,
        primaryColor,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const preview = logoUrl(logoPath);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Customize your business branding and appearance.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Jump to section</Label>
          <Select value="general" onValueChange={(v) => { if (v === "receipt-editor") navigate("/settings/receipt-editor"); }}>
            <SelectTrigger className="h-9 w-56 text-sm" data-testid="select-settings-section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <span className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> General Settings</span>
              </SelectItem>
              <SelectItem value="receipt-editor">
                <span className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5" /> Receipt Editor</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Branding</CardTitle>
          <CardDescription>Shown across the app and on the sign-in screen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nexus POS"
              data-testid="input-business-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div
                className="relative h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Logo preview" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoPath(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : isUploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Store className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Click to upload
                </button>
                <p>JPG, PNG, WebP or SVG up to 5 MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-logo-upload"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose a color mode and accent color for the whole app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {themeMode === "dark" ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <Label className="cursor-pointer" onClick={() => handlePreviewMode(themeMode === "dark" ? "light" : "dark")}>
                Dark mode
              </Label>
            </div>
            <Switch
              checked={themeMode === "dark"}
              onCheckedChange={(checked) => handlePreviewMode(checked ? "dark" : "light")}
              data-testid="switch-dark-mode"
            />
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.name}
                  onClick={() => handlePreviewColor(preset.value)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform hover:scale-105",
                    primaryColor === preset.value ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: `hsl(${preset.value})` }}
                  data-testid={`swatch-${preset.name.toLowerCase()}`}
                />
              ))}
              <label
                className="h-9 w-9 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer relative overflow-hidden"
                title="Custom color"
              >
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={hslStringToHex(primaryColor)}
                  onChange={(e) => handlePreviewColor(hexToHslString(e.target.value))}
                  data-testid="input-custom-color"
                />
                <span className="text-xs text-muted-foreground">+</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending || isUploading} data-testid="button-save-settings">
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
