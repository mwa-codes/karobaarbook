"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlusIcon } from "@/components/ui/Icons";
import { KarigarCard } from "@/components/karigar/KarigarCard";
import { useAuth } from "@/hooks/useAuth";
import { useKarigars } from "@/hooks/useKarigars";
import { formatRs } from "@/lib/format";
import { KARIGAR_PENDING } from "@/lib/karigar";

export default function KarigarListPage() {
  const { user, loading: authLoading } = useAuth();
  const { karigars, loading, error, refresh } = useKarigars(user?.id ?? null);

  const totalPending = useMemo(
    () => karigars.reduce((s, k) => s + Number(k.total_pending ?? 0), 0),
    [karigars]
  );

  const showLoading = authLoading || loading;

  return (
    <div>
      <Header
        title="Karigars"
        right={
          <Link
            href="/karigar/new"
            aria-label="Add karigar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <PlusIcon width={20} height={20} />
          </Link>
        }
      />

      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile label="Total Karigars" value={String(karigars.length)} />
          <SummaryTile
            label="Total Pending"
            value={formatRs(totalPending)}
            highlight
          />
        </div>

        {error ? (
          <Card className="mt-4 border border-dena-100 bg-dena-50">
            <p className="text-sm font-medium text-dena-700">
              Data load nahi ho saka.
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

        <div className="mt-4 pb-8">
          {showLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="mb-2">
                <Skeleton className="h-14 w-full" />
              </Card>
            ))
          ) : karigars.length === 0 ? (
            <Card className="text-center">
              <p className="text-sm font-semibold text-ink-900">
                Koi karigar nahi. Upar + se add karein.
              </p>
              <Link
                href="/karigar/new"
                className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                Pehla karigar add karein
              </Link>
            </Card>
          ) : (
            karigars.map((k) => <KarigarCard key={k.employee_id} karigar={k} />)
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-card"
      style={
        highlight
          ? {
              background: KARIGAR_PENDING.bg,
              border: `1px solid ${KARIGAR_PENDING.border}`,
            }
          : { background: "white" }
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-xl font-bold"
        style={highlight ? { color: KARIGAR_PENDING.color } : undefined}
      >
        {highlight && value.startsWith("Rs.") ? value : value}
      </p>
    </div>
  );
}
