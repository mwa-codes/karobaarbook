import Link from "next/link";
import { classNames, formatPKR } from "@/lib/format";
import { ChevronRightIcon, PhoneIcon } from "@/components/ui/Icons";
import type { PartyBalance } from "@/types/database";

export function PartyCard({ party }: { party: PartyBalance }) {
  const net = Number(party.net_balance ?? 0);
  const isLena = net >= 0;
  const showZero = net === 0;
  return (
    <Link
      href={`/khata/${party.party_id}`}
      className="block rounded-2xl bg-white p-4 shadow-card transition-colors hover:bg-white/95"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={party.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">
              {party.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
              {party.phone ? (
                <>
                  <PhoneIcon className="h-3 w-3" />
                  <span className="truncate">{party.phone}</span>
                </>
              ) : (
                <span className="capitalize">{party.type}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-right">
            <p
              className={classNames(
                "font-mono text-sm font-bold",
                showZero
                  ? "text-ink-500"
                  : isLena
                    ? "text-lena"
                    : "text-dena"
              )}
            >
              {showZero ? "Rs 0" : `Rs ${formatPKR(Math.abs(net))}`}
            </p>
            {!showZero ? (
              <span
                className={classNames(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  isLena
                    ? "bg-lena-50 text-lena-700"
                    : "bg-dena-50 text-dena-700"
                )}
              >
                {isLena ? "Lena" : "Dena"}
              </span>
            ) : (
              <span className="mt-1 inline-block rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                Settled
              </span>
            )}
          </div>
          <ChevronRightIcon className="h-4 w-4 text-ink-500" />
        </div>
      </div>
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
      {initials || "?"}
    </div>
  );
}
