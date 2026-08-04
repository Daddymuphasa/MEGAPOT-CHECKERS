"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-colors focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "text-white brand-gradient shadow-[0_10px_30px_-10px_rgb(124_92_246/0.7)] hover:brightness-110",
        secondary:
          "bg-surface text-text border border-border hover:bg-surface-2",
        ghost: "text-muted hover:text-text hover:bg-surface-2",
        outline:
          "border border-border text-text hover:border-brand/60 hover:text-brand bg-transparent",
        danger:
          "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
        gold: "text-black bg-gradient-to-br from-gold to-amber-400 shadow-[0_10px_30px_-12px_rgb(245_194_66/0.8)] hover:brightness-105",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(button({ variant, size }), className)}
      {...props}
    >
      {children}
    </motion.button>
  ),
);
Button.displayName = "Button";
