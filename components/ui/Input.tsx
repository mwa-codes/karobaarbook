"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";
import { classNames } from "@/lib/format";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    trailing,
    leading,
    containerClassName,
    className,
    id,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={classNames("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-ink-900"
        >
          {label}
        </label>
      ) : null}
      <div
        className={classNames(
          "flex items-center rounded-xl border bg-white px-3.5",
          "transition-colors",
          error
            ? "border-dena focus-within:border-dena"
            : "border-line focus-within:border-brand"
        )}
      >
        {leading ? (
          <span className="mr-2 text-ink-500">{leading}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={classNames(
            "flex-1 bg-transparent py-3 text-base text-ink-900 placeholder:text-ink-500",
            "outline-none",
            className
          )}
          {...rest}
        />
        {trailing ? (
          <span className="ml-2 text-ink-500">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-dena">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, hint, error, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink-900"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={classNames(
            "min-h-[80px] rounded-xl border bg-white px-3.5 py-3",
            "text-base text-ink-900 placeholder:text-ink-500 outline-none",
            error
              ? "border-dena focus:border-dena"
              : "border-line focus:border-brand",
            className
          )}
          {...rest}
        />
        {error ? (
          <p className="text-xs text-dena">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);
