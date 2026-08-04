"use client";

import { useEffect } from "react";
import { useSettings } from "@/store/settings-store";

/** Applies the persisted theme to <html> and keeps it in sync. */
export function ThemeSync() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}
