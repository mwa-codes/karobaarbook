"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PlusIcon, SearchIcon, XIcon } from "@/components/ui/Icons";
import { PartyCard } from "@/components/khata/PartyCard";
import { useAuth } from "@/hooks/useAuth";
import { usePartyBalances, type PartyFilter } from "@/hooks/useParties";
import { useToast } from "@/components/ui/Toast";
import {
  classNames,
  formatAmountWithRs,
  formatRs,
} from "@/lib/format";
import {
  openWhatsApp,
  buildKhataSummaryMessage,
  buildPendingRemindersMessage,
} from "@/lib/whatsapp";

export default function KhataListPage() {
  const { user, loading: authLoading } = useAuth();
  const { parties, loading, error, refresh } = usePartyBalances(user?.id ?? null);
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PartyFilter>("all");
  const [bulkShareOpen, setBulkShareOpen] = useState(false);

  const totals = useMemo(() => {
    return parties.reduce(
      (acc, p) => {
        acc.lena += Number(p.total_lena ?? 0);
        acc.dena += Number(p.total_dena ?? 0);
        return acc;
      },
      { lena: 0, dena: 0 }
    );
  }, [parties]);

  const net = totals.lena - totals.dena;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parties.filter((p) => {
      if (filter === "customer" && p.type !== "customer" && p.type !== "both")
        return false;
      if (filter === "vendor" && p.type !== "vendor" && p.type !== "both")
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [parties, query, filter]);

  const showLoading = authLoading || loading;

  return (
    <div>
      <Header
        title="Khata"
        subtitle={`${parties.length} parties`}
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBulkShareOpen(true)}
              aria-label="Share khata"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
            <Link
              href="/khata/new"
              aria-label="Add party"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <PlusIcon width={20} height={20} />
            </Link>
          </div>
        }
      />

      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <KhataSummaryCard
            label="Total Lena"
            sublabel="Customers se aana hai"
            amount={totals.lena}
            tone="lena"
            loading={showLoading}
          />
          <KhataSummaryCard
            label="Total Dena"
            sublabel="Vendors ko dena hai"
            amount={totals.dena}
            tone="dena"
            loading={showLoading}
          />
        </div>

        <Card className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Net Balance
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Total Lena − Total Dena</p>
          <p
            className={classNames(
              "mt-1 font-mono text-2xl font-bold",
              net > 0 ? "text-lena" : net < 0 ? "text-dena" : "text-ink-900"
            )}
          >
            {showLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                {net > 0 ? "+" : net < 0 ? "−" : ""}
                {formatRs(Math.abs(net))}
              </>
            )}
          </p>
          {!showLoading ? (
            <p className="mt-1 font-mono text-xs text-ink-500">
              {formatRs(totals.lena)} − {formatRs(totals.dena)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-ink-500">
            {net > 0
              ? "Party se zyada lena (receivable)"
              : net < 0
                ? "Party ko zyada dena (payable)"
                : "Khata barabar hai"}
          </p>
        </Card>

        <div className="mt-3 flex items-center rounded-2xl border border-line bg-white px-3.5">
          <SearchIcon className="h-5 w-5 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Naam ya phone se search karein"
            className="flex-1 bg-transparent px-2 py-3 text-base text-ink-900 placeholder:text-ink-500 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-ink-500"
            >
              <XIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          {(["all", "customer", "vendor"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={classNames(
                "h-9 rounded-full px-4 text-xs font-semibold capitalize",
                filter === t
                  ? "bg-brand text-white"
                  : "bg-white text-ink-500 border border-line"
              )}
            >
              {t === "all" ? "Sab" : t === "customer" ? "Customers" : "Vendors"}
            </button>
          ))}
        </div>

        {error ? (
          <Card className="mt-4 border border-dena-100 bg-dena-50">
            <p className="text-sm font-medium text-dena-700">
              Data load nahi ho saka. Internet check karein.
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-2 text-sm font-semibold text-dena-700 underline"
            >
              Try again
            </button>
          </Card>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 pb-8">
          {showLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState
              isFiltered={!!query || filter !== "all"}
              total={parties.length}
            />
          ) : (
            filtered.map((p) => <PartyCard key={p.party_id} party={p} />)
          )}
        </div>
      </div>

      <BottomSheet
        open={bulkShareOpen}
        onClose={() => setBulkShareOpen(false)}
        title="Khata Share Karein"
      >
        <div className="flex flex-col gap-3 pb-2">
          <button
            type="button"
            onClick={() => {
              const msg = buildPendingRemindersMessage(parties);
              openWhatsApp(msg);
              setBulkShareOpen(false);
            }}
            className="flex w-full items-center gap-4 rounded-2xl bg-lena-50 border border-lena-100 px-4 py-4 text-left"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-bold text-lena-700">Pending Reminders</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Sab pending customers ki list WhatsApp pe bhejein
              </p>
              <p className="mt-1 text-xs font-semibold text-lena-600">
                {parties.filter((p) => Number(p.net_balance) > 0).length} parties pending
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const msg = buildKhataSummaryMessage(parties);
              openWhatsApp(msg);
              setBulkShareOpen(false);
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 text-left hover:bg-page"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Full Khata Summary</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Poori lena/dena ki summary share karein
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={async () => {
              const msg = buildPendingRemindersMessage(parties);
              await navigator.clipboard.writeText(msg);
              toast.show("Copy ho gaya!");
              setBulkShareOpen(false);
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 text-left hover:bg-page"
          >
            <span className="text-2xl">📝</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Copy Karein</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Clipboard pe copy karein
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function KhataSummaryCard({
  label,
  sublabel,
  amount,
  tone,
  loading,
}: {
  label: string;
  sublabel: string;
  amount: number;
  tone: "lena" | "dena";
  loading?: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded-2xl p-4 shadow-card",
        tone === "lena" ? "bg-lena text-white" : "bg-dena text-white"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-white/80">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold">
        {loading ? (
          <span className="inline-block h-6 w-24 rounded bg-white/30" />
        ) : (
          formatAmountWithRs(amount)
        )}
      </p>
      <p className="mt-1 text-[11px] text-white/80">{sublabel}</p>
    </div>
  );
}

function EmptyState({
  isFiltered,
  total,
}: {
  isFiltered: boolean;
  total: number;
}) {
  if (isFiltered) {
    return (
      <Card className="mt-2 text-center">
        <p className="text-sm font-semibold text-ink-900">Koi match nahi mila.</p>
        <p className="mt-1 text-xs text-ink-500">
          Search ya filter badal kar dobara try karein.
        </p>
      </Card>
    );
  }
  return (
    <Card className="mt-2 text-center">
      <p className="text-sm font-semibold text-ink-900">
        {total === 0
          ? "Koi party nahi hai."
          : "Sab parties hide ho gayi hain."}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        Header me <span className="font-semibold text-brand">+</span> button se
        nayi party add karein.
      </p>
      <Link
        href="/khata/new"
        className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        Pehli party add karein
      </Link>
    </Card>
  );
}
