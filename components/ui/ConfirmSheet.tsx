"use client";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

export interface ConfirmSheetProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Haan",
  cancelLabel = "Nahi",
  variant = "danger",
  loading,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p className="text-base text-ink-900">{message}</p>
      <div className="mt-5 flex gap-3">
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          size="md"
          fullWidth
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
