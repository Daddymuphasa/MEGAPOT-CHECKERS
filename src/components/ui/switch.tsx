"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, id, disabled }: SwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:ring-focus disabled:opacity-50",
        checked
          ? "border-transparent brand-gradient"
          : "border-border bg-surface-2",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute h-5 w-5 rounded-full bg-white shadow-md",
          checked ? "right-1" : "left-1",
        )}
      />
    </button>
  );
}
