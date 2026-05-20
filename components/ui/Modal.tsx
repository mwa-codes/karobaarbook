"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/lib/format";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "sm",
}: ModalProps) {
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          "relative w-full rounded-2xl bg-white p-5 shadow-card",
          size === "sm" ? "max-w-sm" : "max-w-md"
        )}
      >
        {title ? (
          <h2 className="mb-3 text-lg font-bold text-ink-900">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
