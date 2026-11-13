"use client";
import Link from "next/link";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass } from "./buttonClass";

export { buttonClass };

export const Button = forwardRef(function Button(
  { variant, size, loading = false, className, children, href, type = "button", disabled, ...props },
  ref,
) {
  const cls = buttonClass({ variant, size, className });
  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </>
  );
  if (href) return <Link ref={ref} href={href} className={cls} {...props}>{content}</Link>;
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});
