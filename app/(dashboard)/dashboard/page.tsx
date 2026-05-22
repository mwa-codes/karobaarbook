"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BookIcon,
  LogoutIcon,
  RoznamchaIcon,
  UsersIcon,
} from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { usePartyBalances } from "@/hooks/useParties";
import { useKarigars } from "@/hooks/useKarigars";
import { useRoznamcha } from "@/hooks/useRoznamcha";
import { useTransactions } from "@/hooks/useTransactions";
import {
  classNames,
  formatDateShort,
  formatPKR,
  formatRs,
  todayIso,
} from "@/lib/format";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const {
    parties,
    loading: pLoading,
    error: khataError,
  } = usePartyBalances(userId);
  const { transactions, loading: tLoading } = useTransactions(userId, {
    limit: 2,
  });
  const today = todayIso();
  const {
    closingBalance: cashClosing,
    totalIncome: cashIncome,
    totalExpense: cashExpense,
    loading: cashLoading,
    error: cashError,
  } = useRoznamcha(userId, today);
  const {
    karigars,
    loading: karigarLoading,
    error: karigarError,
  } = useKarigars(userId);
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

  const partyMap = useMemo(
    () => Object.fromEntries(parties.map((p) => [p.party_id, p])),
    [parties]
  );

  const needsAttention = useMemo(() => {
    return [...parties]
      .filter((p) => Number(p.net_balance ?? 0) !== 0)
      .sort(
        (a, b) =>
          Math.abs(Number(b.net_balance ?? 0)) -
          Math.abs(Number(a.net_balance ?? 0))
      )
      .slice(0, 2);
  }, [parties]);

  const recentTransactions = transactions.slice(0, 2);

  const khataLoadingCombined = authLoading || pLoading;
  const activityLoading = khataLoadingCombined || tLoading;
  const cashLoadingCombined = authLoading || cashLoading;
  const karigarLoadingCombined = authLoading || karigarLoading;

  const karigarSummary = useMemo(() => {
    return karigars.reduce(
      (acc, k) => {
        acc.totalPending += Number(k.total_pending ?? 0);
        acc.pendingEntries += Number(k.entry_count ?? 0);
        return acc;
      },
      { totalPending: 0, pendingEntries: 0 }
    );
  }, [karigars]);

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

      <div className="px-4 pt-4">
        <section>
          <DashboardSectionHeader
            featured
            title="Overview"
            subtitle="Khata, roznamcha aur karigar — har module ki main summary"
            modules={[
              { href: "/khata", label: "Khata", icon: BookIcon },
              { href: "/roznamcha", label: "Roznamcha", icon: RoznamchaIcon },
              { href: "/karigar", label: "Karigar", icon: UsersIcon },
            ]}
          />

          <div className="mt-3 flex flex-col gap-3">
            <Card
              className={classNames(
                "border-l-4",
                net < 0 ? "border-l-dena" : "border-l-lena"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Khata — Net balance
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    Total Lena − Total Dena
                  </p>
                  <p
                    className={classNames(
                      "mt-1 font-mono text-2xl font-bold",
                      net > 0 ? "text-lena" : net < 0 ? "text-dena" : "text-ink-900"
                    )}
                  >
                    {khataLoadingCombined ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      <>
                        {net > 0 ? "+" : net < 0 ? "−" : ""}
                        {formatRs(Math.abs(net))}
                      </>
                    )}
                  </p>
                  {!khataLoadingCombined && !khataError ? (
                    <p className="mt-1 font-mono text-xs text-ink-500">
                      {parties.length} parties · +{formatPKR(totals.lena)} lena · −
                      {formatPKR(totals.dena)} dena
                    </p>
                  ) : null}
                  {khataError ? (
                    <p className="mt-1 text-xs text-dena">
                      Khata data load nahi hui.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-500">
                      Party balances ka net (lena − dena)
                    </p>
                  )}
                </div>
                <Link
                  href="/khata"
                  className="shrink-0 text-sm font-semibold text-brand hover:underline"
                >
                  Khata →
                </Link>
              </div>
            </Card>

            <Card className="border-l-4 border-l-brand">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Roznamcha — Aaj ka cash
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    Opening + Amdani − Kharcha (aaj)
                  </p>
                  <p
                    className={classNames(
                      "mt-1 font-mono text-2xl font-bold",
                      cashClosing < 0 ? "text-dena" : "text-brand"
                    )}
                  >
                    {cashLoadingCombined ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      formatRs(cashClosing)
                    )}
                  </p>
                  {!cashLoadingCombined && !cashError ? (
                    <p className="mt-1 font-mono text-xs text-ink-500">
                      +{formatPKR(cashIncome)} amdani · −{formatPKR(cashExpense)}{" "}
                      kharcha
                    </p>
                  ) : null}
                  {cashError ? (
                    <p className="mt-1 text-xs text-dena">
                      Cash balance load nahi hui.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-500">
                      Cash drawer / roznamcha me ab kitna hai
                    </p>
                  )}
                </div>
                <Link
                  href="/roznamcha"
                  className="shrink-0 text-sm font-semibold text-brand hover:underline"
                >
                  Roznamcha →
                </Link>
              </div>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Karigar — Pending wages
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    Unpaid kaam + kharcha (abhi tak)
                  </p>
                  <p
                    className={classNames(
                      "mt-1 font-mono text-2xl font-bold",
                      karigarSummary.totalPending > 0
                        ? "text-amber-600"
                        : "text-ink-900"
                    )}
                  >
                    {karigarLoadingCombined ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      formatRs(karigarSummary.totalPending)
                    )}
                  </p>
                  {!karigarLoadingCombined && !karigarError ? (
                    <p className="mt-1 font-mono text-xs text-ink-500">
                      {karigars.length} karigar
                      {karigarSummary.pendingEntries > 0
                        ? ` · ${karigarSummary.pendingEntries} kaam pending`
                        : ""}
                    </p>
                  ) : null}
                  {karigarError ? (
                    <p className="mt-1 text-xs text-dena">
                      Karigar data load nahi hui.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-500">
                      Karigaron ko ab kitni wages deni hai
                    </p>
                  )}
                </div>
                <Link
                  href="/karigar"
                  className="shrink-0 text-sm font-semibold text-brand hover:underline"
                >
                  Karigar →
                </Link>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-6 pb-8">
          <DashboardSectionHeader
            title="Khata activity"
            subtitle="Pending balances aur latest entries"
            action={{ href: "/khata", label: "Khata →" }}
          />

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Needs attention
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {activityLoading ? (
                <>
                  <ActivityRowSkeleton />
                  <ActivityRowSkeleton />
                </>
              ) : needsAttention.length === 0 ? (
                <Card className="border border-lena-100 bg-lena-50/50 py-3 text-center">
                  <p className="text-xs font-medium text-ink-700">
                    Koi pending balance nahi
                  </p>
                </Card>
              ) : (
                needsAttention.map((p) => (
                  <NeedsAttentionRow key={p.party_id} party={p} />
                ))
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Recent transactions
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {activityLoading ? (
                <>
                  <ActivityRowSkeleton />
                  <ActivityRowSkeleton />
                </>
              ) : recentTransactions.length === 0 ? (
                <Card className="border border-lena-100 bg-lena-50/50 py-3 text-center">
                  <p className="text-xs font-medium text-ink-700">
                    Abhi koi transaction nahi
                  </p>
                </Card>
              ) : (
                recentTransactions.map((t) => (
                  <RecentTransactionRow
                    key={t.id}
                    transaction={t}
                    partyName={partyMap[t.party_id]?.name ?? "Party"}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityRowSkeleton() {
  return (
    <Card className="flex items-center justify-between border-l-4 border-l-line">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-16" />
    </Card>
  );
}

function KhataActivityRow({
  href,
  title,
  subtitle,
  amount,
  isLena,
}: {
  href: string;
  title: string;
  subtitle: string;
  amount: string;
  isLena: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={classNames(
          "flex items-center justify-between border-l-4",
          isLena ? "border-l-lena" : "border-l-dena"
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p
            className={classNames(
              "font-mono text-sm font-bold",
              isLena ? "text-lena" : "text-dena"
            )}
          >
            {amount}
          </p>
          <span
            className={classNames(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isLena ? "bg-lena-50 text-lena-700" : "bg-dena-50 text-dena-700"
            )}
          >
            {isLena ? "Lena" : "Dena"}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function NeedsAttentionRow({
  party,
}: {
  party: { party_id: string; name: string; net_balance: number };
}) {
  const bal = Number(party.net_balance ?? 0);
  const isLena = bal > 0;
  return (
    <KhataActivityRow
      href={`/khata/${party.party_id}`}
      title={party.name}
      subtitle={
        isLena ? "Lena baqi — wasool karein" : "Dena baqi — ada karein"
      }
      isLena={isLena}
      amount={`${isLena ? "+" : "−"} ${formatPKR(Math.abs(bal))}`}
    />
  );
}

function RecentTransactionRow({
  transaction,
  partyName,
}: {
  transaction: {
    id: string;
    party_id: string;
    type: "lena" | "dena";
    amount: number;
    transaction_date: string;
    description: string | null;
  };
  partyName: string;
}) {
  const isLena = transaction.type === "lena";
  const dateLine = formatDateShort(transaction.transaction_date);
  const subtitle = transaction.description
    ? `${dateLine} · ${transaction.description}`
    : dateLine;

  return (
    <KhataActivityRow
      href={`/khata/${transaction.party_id}`}
      title={partyName}
      subtitle={subtitle}
      isLena={isLena}
      amount={`${isLena ? "+" : "−"} ${formatPKR(transaction.amount)}`}
    />
  );
}
