"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "relative inline-flex rounded-full border border-border bg-surface-2/60 p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors focus-visible:ring-focus",
              size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
              active ? "text-white" : "text-muted hover:text-text",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full brand-gradient shadow-[0_6px_18px_-8px_rgb(124_92_246/0.8)]"
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
