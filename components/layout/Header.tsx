"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/components/ui/Icons";
import { classNames } from "@/lib/format";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
  variant?: "default" | "brand";
  className?: string;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  right,
  onBack,
  variant = "default",
  className,
}: HeaderProps) {
  const router = useRouter();
  return (
    <header
      className={classNames(
        "sticky top-0 z-30 flex items-center gap-3 px-4 pb-3 pt-4 safe-top",
        variant === "brand"
          ? "bg-brand text-white"
          : "bg-page/95 backdrop-blur text-ink-900 border-b border-line",
        className
      )}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.back())}
          className={classNames(
            "-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full",
            variant === "brand"
              ? "text-white hover:bg-white/10"
              : "text-ink-900 hover:bg-line/60"
          )}
          aria-label="Back"
        >
          <BackIcon />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1
          className={classNames(
            "truncate text-lg font-bold leading-tight",
            variant === "brand" ? "text-white" : "text-ink-900"
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={classNames(
              "truncate text-xs",
              variant === "brand" ? "text-white/80" : "text-ink-500"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-1">{right}</div> : null}
    </header>
  );
}
