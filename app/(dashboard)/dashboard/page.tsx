"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { LogoutIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { usePartyBalances } from "@/hooks/useParties";
import { useTransactions } from "@/hooks/useTransactions";
import {
  classNames,
  formatAmountWithRs,
  formatDateShort,
  formatPKR,
} from "@/lib/format";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { parties, loading: pLoading } = usePartyBalances(userId);
  const { transactions, loading: tLoading } = useTransactions(userId, {
    limit: 5,
  });
  const toast = useToast();
  const router = useRouter();

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
  const loading = authLoading || pLoading;

  async function handleLogout() {
    await signOut();
    toast.show("Logout ho gaye.");
    router.replace("/login");
    router.refresh();
  }

  const greetingName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Sahab";

  return (
    <div>
      <Header
        title={`Salaam, ${greetingName}`}
        subtitle="Aaj ka khulasa"
        variant="brand"
        right={
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
            aria-label="Logout"
          >
            <LogoutIcon />
          </button>
        }
      />

      <div className="-mt-2 px-4">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Total Lena"
            sublabel="Customers se aana hai"
            amount={totals.lena}
            tone="lena"
            loading={loading}
          />
          <SummaryCard
            label="Total Dena"
            sublabel="Vendors ko dena hai"
            amount={totals.dena}
            tone="dena"
            loading={loading}
          />
        </div>

        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Net Balance
              </p>
              <p
                className={classNames(
                  "mt-1 font-mono text-2xl font-bold",
                  net >= 0 ? "text-lena" : "text-dena"
                )}
              >
                {loading ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  formatAmountWithRs(Math.abs(net))
                )}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {net >= 0
                  ? "Aap ke paas zyada lena hai"
                  : "Aap ko zyada dena hai"}
              </p>
            </div>
            <Link
              href="/khata"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Khata dekhein →
            </Link>
          </div>
        </Card>

        <section className="mt-6">
          <div className="flex items-end justify-between">
            <h2 className="text-base font-bold text-ink-900">Recent transactions</h2>
            <Link
              href="/khata"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Sab dekhein
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {tLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </Card>
              ))
            ) : transactions.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-ink-500">
                  Abhi koi transaction nahi hai.
                </p>
                <Link
                  href="/khata"
                  className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
                >
                  Khata mein add karein →
                </Link>
              </Card>
            ) : (
              transactions.map((t) => {
                const party = parties.find((p) => p.party_id === t.party_id);
                return (
                  <Link
                    key={t.id}
                    href={`/khata/${t.party_id}`}
                    className="block"
                  >
                    <Card className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {party?.name ?? "Party"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatDateShort(t.transaction_date)}
                          {t.description ? ` · ${t.description}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={classNames(
                            "font-mono text-sm font-semibold",
                            t.type === "lena" ? "text-lena" : "text-dena"
                          )}
                        >
                          {t.type === "lena" ? "+" : "−"} {formatPKR(t.amount)}
                        </p>
                        <span
                          className={classNames(
                            "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            t.type === "lena"
                              ? "bg-lena-50 text-lena-700"
                              : "bg-dena-50 text-dena-700"
                          )}
                        >
                          {t.type === "lena" ? "Lena" : "Dena"}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
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
