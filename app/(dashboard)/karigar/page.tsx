"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PlusIcon } from "@/components/ui/Icons";
import { KarigarCard } from "@/components/karigar/KarigarCard";
import { WhatsAppShareIcon } from "@/components/karigar/KarigarShareSheet";
import { useAuth } from "@/hooks/useAuth";
import { useKarigars } from "@/hooks/useKarigars";
import { useToast } from "@/components/ui/Toast";
import { formatRs } from "@/lib/format";
import { KARIGAR_PENDING } from "@/lib/karigar";
import {
  buildKarigarPendingListMessage,
  openWhatsApp,
} from "@/lib/whatsapp";

export default function KarigarListPage() {
  const { user, loading: authLoading } = useAuth();
  const { karigars, loading, error, refresh } = useKarigars(user?.id ?? null);
  const toast = useToast();
  const [bulkShareOpen, setBulkShareOpen] = useState(false);

  const factoryName =
    (user?.user_metadata?.factory_name as string | undefined) ?? undefined;

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBulkShareOpen(true)}
              aria-label="Share karigar pending"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <WhatsAppShareIcon />
            </button>
            <Link
              href="/karigar/new"
              aria-label="Add karigar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <PlusIcon width={20} height={20} />
            </Link>
          </div>
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

      <BottomSheet
        open={bulkShareOpen}
        onClose={() => setBulkShareOpen(false)}
        title="Karigar Share Karein"
      >
        <div className="flex flex-col gap-3 pb-2">
          <button
            type="button"
            onClick={() => {
              const msg = buildKarigarPendingListMessage(karigars, factoryName);
              openWhatsApp(msg);
              setBulkShareOpen(false);
            }}
            className="flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left"
            style={{
              background: KARIGAR_PENDING.bg,
              borderColor: KARIGAR_PENDING.border,
            }}
          >
            <span className="text-2xl">👷</span>
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: KARIGAR_PENDING.color }}
              >
                Sab Karigaron ki Pending List
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Kaam, kharcha, advance — WhatsApp pe bhejein
              </p>
              <p
                className="mt-1 text-xs font-semibold"
                style={{ color: KARIGAR_PENDING.color }}
              >
                {
                  karigars.filter(
                    (k) =>
                      Number(k.total_pending ?? 0) > 0 ||
                      Number(k.total_kharcha ?? 0) > 0 ||
                      Number(k.advance_balance ?? 0) > 0
                  ).length
                }{" "}
                karigar pending
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={async () => {
              const msg = buildKarigarPendingListMessage(karigars, factoryName);
              await navigator.clipboard.writeText(msg);
              toast.success("Copy ho gaya!");
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
