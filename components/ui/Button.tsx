"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "lena" | "dena" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-700 active:bg-brand-700 disabled:bg-brand/60",
  secondary:
    "bg-white text-ink-900 border border-line hover:bg-page disabled:opacity-60",
  ghost:
    "bg-transparent text-ink-900 hover:bg-page disabled:opacity-60",
  lena:
    "bg-lena text-white hover:bg-lena-700 active:bg-lena-700 disabled:bg-lena/60",
  dena:
    "bg-dena text-white hover:bg-dena-700 active:bg-dena-700 disabled:bg-dena/60",
  danger:
    "bg-dena text-white hover:bg-dena-700 active:bg-dena-700 disabled:bg-dena/60",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-10 px-3 text-sm rounded-lg",
  md: "h-12 px-4 text-base rounded-xl",
  lg: "h-14 px-5 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={classNames(
          "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden
          />
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);
