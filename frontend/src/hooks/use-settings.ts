import { useEffect } from "react";
import { useGetSettings } from "@workspace/api-client-react";

export function applyTheme(themeMode: string | undefined, primaryColor: string | undefined) {
  const root = document.documentElement;
  root.classList.toggle("dark", themeMode === "dark");
  if (primaryColor) {
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--ring", primaryColor);
    root.style.setProperty("--sidebar-primary", primaryColor);
    root.style.setProperty("--sidebar-ring", primaryColor);
    root.style.setProperty("--chart-1", primaryColor);
  }
}

export function useSettings() {
  const { data, isLoading, ...rest } = useGetSettings();

  useEffect(() => {
    if (data) {
      applyTheme(data.themeMode, data.primaryColor);
    }
  }, [data?.themeMode, data?.primaryColor]);

  return { settings: data, isLoading, ...rest };
}
