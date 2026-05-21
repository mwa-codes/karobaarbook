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
  /** "brand" = gradient blue header. "plain" = white sticky header with border. */
  variant?: "brand" | "plain";
  className?: string;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  right,
  onBack,
  variant = "brand",
  className,
}: HeaderProps) {
  const router = useRouter();
  const isBrand = variant === "brand";

  return (
    <header
      className={classNames(
        "sticky top-0 z-30 flex items-center gap-3 px-4 pb-4 pt-4 safe-top",
        isBrand
          ? "bg-brand-gradient text-white shadow-[0_2px_8px_rgba(26,86,219,0.3)]"
          : "bg-white text-ink-900 border-b border-line",
        className
      )}
    >
      {showBack ? (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.back())}
          className={classNames(
            "-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full",
            isBrand
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
            "truncate text-xl font-bold leading-tight",
            isBrand ? "text-white" : "text-ink-900"
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={classNames(
              "truncate text-[13px] leading-snug",
              isBrand ? "text-white/75" : "text-ink-500"
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
