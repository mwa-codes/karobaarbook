// Pakistani / South-Asian "lakh" digit grouping: 1,23,456 instead of 123,456.
export function formatPKR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(num)) return "0";
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const [whole, fraction] = abs.toString().split(".");
  const lastThree = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  return sign + grouped + (fraction ? "." + fraction.slice(0, 2) : "");
}

export function formatAmountWithRs(amount: number | string | null | undefined) {
  return `Rs ${formatPKR(amount)}`;
}

/** Alias for formatPKR — matches the Phase 1.5 prompt naming. */
export const formatAmount = formatPKR;

/** Rs. 1,00,000 — note the dot after Rs, used in Roznamcha screens. */
export function formatRs(amount: number | string | null | undefined): string {
  return `Rs. ${formatPKR(amount)}`;
}

export function formatDateLong(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
