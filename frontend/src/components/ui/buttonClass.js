// Shared by server and client components (no "use client").
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "bg-ink-3 text-paper border border-line-strong hover:border-paper/30",
  ghost: "text-muted hover:text-paper hover:bg-ink-3",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
};
const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
  icon: "size-10 rounded-[10px] justify-center",
};

export const buttonClass = ({ variant = "primary", size = "md", className } = {}) =>
  cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition duration-150 select-none",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant], SIZES[size], className,
  );
