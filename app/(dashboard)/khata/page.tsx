"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlusIcon, SearchIcon, XIcon } from "@/components/ui/Icons";
import { PartyCard } from "@/components/khata/PartyCard";
import { useAuth } from "@/hooks/useAuth";
import { usePartyBalances, type PartyFilter } from "@/hooks/useParties";
import { classNames } from "@/lib/format";

export default function KhataListPage() {
  const { user, loading: authLoading } = useAuth();
  const { parties, loading, error, refresh } = usePartyBalances(user?.id ?? null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PartyFilter>("all");

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
          <Link
            href="/khata/new"
            aria-label="Add party"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <PlusIcon width={20} height={20} />
          </Link>
        }
      />

      <div className="px-4 pt-3">
        <div className="flex items-center rounded-2xl border border-line bg-white px-3.5">
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
