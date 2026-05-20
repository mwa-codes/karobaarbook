"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/lib/format";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showHandle?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  showHandle = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-enter"
        onClick={onClose}
      />
      <div
        className={classNames(
          "relative w-full max-w-app sheet-enter",
          "rounded-t-3xl bg-white shadow-card",
          "safe-bottom"
        )}
      >
        {showHandle ? (
          <div className="flex justify-center pt-3">
            <span className="block h-1.5 w-10 rounded-full bg-line" />
          </div>
        ) : null}
        {title ? (
          <div className="px-4 pt-3 pb-2">
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-500">{description}</p>
            ) : null}
          </div>
        ) : null}
        <div className="px-4 pb-6 pt-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}
