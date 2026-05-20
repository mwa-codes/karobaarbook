import { classNames } from "@/lib/format";

export function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "inline-flex items-center justify-center rounded-2xl bg-brand text-white",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
        <path d="M5 17a3 3 0 0 1 3-3h10" />
        <path d="M9 8h6M9 12h4" />
      </svg>
    </div>
  );
}
