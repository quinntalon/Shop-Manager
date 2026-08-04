import { useState, useEffect } from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { applyTheme, useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: "Blue",   value: "221 83% 53%" },
  { name: "Indigo", value: "243 75% 59%" },
  { name: "Violet", value: "262 80% 60%" },
  { name: "Pink",   value: "330 81% 60%" },
  { name: "Rose",   value: "347 77% 50%" },
  { name: "Red",    value: "0 72% 51%"   },
  { name: "Orange", value: "25 95% 53%"  },
  { name: "Amber",  value: "43 96% 56%"  },
  { name: "Green",  value: "142 71% 40%" },
  { name: "Teal",   value: "190 90% 40%" },
  { name: "Cyan",   value: "186 100% 42%"},
  { name: "Slate",  value: "215 25% 35%" },
];

export function ThemeToggle() {
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState<"light" | "dark">(
    (settings?.themeMode as "light" | "dark") ?? "light"
  );
  const [color, setColor] = useState(settings?.primaryColor ?? "221 83% 53%");

  useEffect(() => {
    if (settings) {
      setMode(settings.themeMode as "light" | "dark");
      setColor(settings.primaryColor);
    }
  }, [settings?.themeMode, settings?.primaryColor]);

  const mutation = useUpdateSettings({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetSettingsQueryKey(), data);
        applyTheme(data.themeMode, data.primaryColor);
      },
    },
  });

  function save(newMode: "light" | "dark", newColor: string) {
    applyTheme(newMode, newColor);
    mutation.mutate({
      data: {
        businessName: settings?.businessName ?? "Nexus POS",
        logoUrl: settings?.logoUrl ?? null,
        themeMode: newMode,
        primaryColor: newColor,
      },
    });
  }

  function toggleMode(newMode: "light" | "dark") {
    setMode(newMode);
    save(newMode, color);
  }

  function pickColor(value: string) {
    setColor(value);
    save(mode, value);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Theme settings"
        >
          {mode === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Palette className="h-4 w-4" />
          )}
          Theme
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-60 p-3 space-y-3">
        {/* Mode */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Mode
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => toggleMode("light")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors",
                mode === "light"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => toggleMode("dark")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors",
                mode === "dark"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        </div>

        {/* Color */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Accent color
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                onClick={() => pickColor(preset.value)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  color === preset.value
                    ? "border-foreground scale-110 ring-2 ring-ring ring-offset-1"
                    : "border-transparent"
                )}
                style={{ backgroundColor: `hsl(${preset.value})` }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
