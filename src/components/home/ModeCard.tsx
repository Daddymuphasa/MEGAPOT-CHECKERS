"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  tag?: string;
  index: number;
}

export function ModeCard({
  href,
  title,
  description,
  icon,
  accent,
  tag,
  index,
}: ModeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.08, type: "spring", stiffness: 120 }}
    >
      <Link href={href} className="group block h-full">
        <motion.div
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass relative flex h-full flex-col overflow-hidden rounded-2xl p-6"
        >
          {/* accent glow */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
            style={{ background: accent }}
          />
          {tag && (
            <span className="absolute right-4 top-4 rounded-full border border-border bg-surface-2/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
              {tag}
            </span>
          )}
          <div
            className={cn(
              "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg",
            )}
            style={{ background: accent }}
          >
            {icon}
          </div>
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {description}
          </p>
          <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-brand">
            Play
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
