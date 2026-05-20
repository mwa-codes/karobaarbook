"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/lib/format";

type ToastVariant = "default" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      idRef.current += 1;
      const id = idRef.current;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => remove(id), 3200);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 safe-bottom">
              {items.map((t) => (
                <div
                  key={t.id}
                  className={classNames(
                    "toast-enter pointer-events-auto rounded-2xl px-4 py-3 shadow-card",
                    "text-sm font-medium",
                    "max-w-app w-full text-center",
                    t.variant === "success" && "bg-lena text-white",
                    t.variant === "error" && "bg-dena text-white",
                    t.variant === "default" && "bg-ink-900 text-white"
                  )}
                  role="status"
                >
                  {t.message}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
