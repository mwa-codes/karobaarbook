"use client";

import { useRef } from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
import { classNames, todayIso } from "@/lib/format";

export interface DateNavigatorProps {
  /** YYYY-MM-DD */
  date: string;
  onChange: (date: string) => void;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLong(date: string): string {
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const today = todayIso();
  const isToday = date === today;
  const canGoNext = date < today;
  const inputRef = useRef<HTMLInputElement>(null);

  function goPrev() {
    onChange(shiftDate(date, -1));
  }
  function goNext() {
    if (canGoNext) onChange(shiftDate(date, 1));
  }

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    // Prefer showPicker() where supported; fall back to focus + click.
    type DateInput = HTMLInputElement & { showPicker?: () => void };
    const ext = el as DateInput;
    if (typeof ext.showPicker === "function") {
      ext.showPicker();
    } else {
      el.focus();
      el.click();
    }
  }

  return (
    <div className="relative flex items-center justify-between gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous day"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-900 hover:bg-page"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 text-sm font-semibold text-ink-900"
        >
          <CalendarIcon className="h-4 w-4 text-brand" />
          <span>{formatLong(date)}</span>
        </button>
        {!isToday ? (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
          >
            Aaj
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={goNext}
        disabled={!canGoNext}
        aria-label="Next day"
        className={classNames(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          canGoNext
            ? "text-ink-900 hover:bg-page"
            : "text-ink-500/40 cursor-not-allowed"
        )}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>

      {/* Invisible native date input — clicking the label triggers it via showPicker(). */}
      <input
        ref={inputRef}
        type="date"
        value={date}
        max={today}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="pointer-events-none absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
