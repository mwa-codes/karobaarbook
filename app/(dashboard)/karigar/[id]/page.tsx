"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EditIcon, PhoneIcon, TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { WorkEntryCard } from "@/components/karigar/WorkEntryCard";
import { KharchaRow } from "@/components/karigar/KharchaRow";
import { AdvanceRow } from "@/components/karigar/AdvanceRow";
import { AddWorkEntryForm } from "@/components/karigar/AddWorkEntryForm";
import { AddKharchaForm } from "@/components/karigar/AddKharchaForm";
import { AddAdvanceForm } from "@/components/karigar/AddAdvanceForm";
import { CalculateWagesSheet } from "@/components/karigar/CalculateWagesSheet";
import { EditKarigarForm } from "@/components/karigar/EditKarigarForm";
import {
  KarigarShareSheet,
  WhatsAppShareIcon,
} from "@/components/karigar/KarigarShareSheet";
import { useAuth } from "@/hooks/useAuth";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { useKarigarKharcha } from "@/hooks/useKarigarKharcha";
import { useKarigarAdvances, advanceBalance } from "@/hooks/useKarigarAdvances";
import { useOffline } from "@/context/OfflineContext";
import { deleteKarigar } from "@/lib/delete-karigar";
import { offlineDelete } from "@/lib/offline-write";
import { localDB, withSync } from "@/lib/local-db";
import { supabase } from "@/lib/supabase";
import { classNames, formatPKR, formatRs } from "@/lib/format";
import {
  computeNetPayable,
  formatEntryDateHeader,
  formatPeriodRange,
  groupEntriesByDate,
  parsePaymentMode,
  KARIGAR_PENDING,
} from "@/lib/karigar";
import type {
  Employee,
  KarigarAdvance,
  KarigarKharcha,
  KarigarWorkEntry,
  WagePayment,
} from "@/types/database";

type Tab = "kaam" | "kharcha" | "advance" | "payments";
type KaamSub = "unpaid" | "history";

export default function KarigarDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshPending } = useOffline();
  const toast = useToast();
  const userId = user?.id ?? null;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [empLoading, setEmpLoading] = useState(true);
  const [payments, setPayments] = useState<WagePayment[]>([]);
  const [tab, setTab] = useState<Tab>("kaam");
  const [kaamSub, setKaamSub] = useState<KaamSub>("unpaid");

  const {
    entries: allEntries,
    loading: workEntriesLoading,
    refresh: refreshEntries,
  } = useWorkEntries(userId, { employeeId });

  const unpaidEntries = useMemo(
    () => allEntries.filter((e) => e.wage_payment_id == null),
    [allEntries]
  );

  const {
    items: allKharcha,
    loading: kharchaLoading,
    refresh: refreshKharcha,
  } = useKarigarKharcha(userId, { employeeId });

  const {
    advances: allAdvances,
    loading: advanceLoading,
    refresh: refreshAdvances,
  } = useKarigarAdvances(userId, { employeeId });

  const openAdvances = useMemo(
    () =>
      allAdvances.filter(
        (a) => Number(a.amount) > Number(a.amount_settled)
      ),
    [allAdvances]
  );

  const unpaidKharcha = useMemo(
    () => allKharcha.filter((k) => !k.wage_payment_id),
    [allKharcha]
  );

  const [workFormOpen, setWorkFormOpen] = useState(false);
  const [kharchaFormOpen, setKharchaFormOpen] = useState(false);
  const [advanceFormOpen, setAdvanceFormOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KarigarWorkEntry | null>(null);
  const [deleteKharcha, setDeleteKharcha] = useState<KarigarKharcha | null>(null);
  const [deleteAdvance, setDeleteAdvance] = useState<KarigarAdvance | null>(null);
  const [deleteKarigarOpen, setDeleteKarigarOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadEmployee = useCallback(async () => {
    if (!userId || !employeeId) return;
    const local = await localDB.employees.get(employeeId);
    if (local && local._deleted === 0 && local.owner_id === userId) {
      const { _synced, _deleted, _local_id, ...emp } = local;
      setEmployee(emp);
      setEmpLoading(false);
    }
    if (!navigator.onLine) {
      if (!local) setEmployee(null);
      setEmpLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("owner_id", userId)
      .single();
    if (error) {
      if (!local) setEmployee(null);
    } else {
      setEmployee(data as Employee);
      await localDB.employees.put(withSync(data as Employee));
    }
    setEmpLoading(false);
  }, [userId, employeeId]);

  const loadPayments = useCallback(async () => {
    if (!userId || !employeeId) return;
    const { data } = await supabase
      .from("wage_payments")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("owner_id", userId)
      .order("period_end", { ascending: false })
      .limit(10);
    setPayments((data ?? []) as WagePayment[]);
  }, [userId, employeeId]);

  useEffect(() => {
    if (userId) {
      setEmpLoading(true);
      loadEmployee();
      loadPayments();
    }
  }, [userId, loadEmployee, loadPayments]);

  const pendingTotal = useMemo(
    () => unpaidEntries.reduce((s, e) => s + Number(e.amount), 0),
    [unpaidEntries]
  );

  const kharchaTotal = useMemo(
    () => unpaidKharcha.reduce((s, k) => s + Number(k.amount), 0),
    [unpaidKharcha]
  );

  const advanceBalanceTotal = useMemo(
    () => openAdvances.reduce((s, a) => s + advanceBalance(a), 0),
    [openAdvances]
  );

  const estimatedNet = useMemo(
    () => computeNetPayable(pendingTotal, kharchaTotal, 0, 0),
    [pendingTotal, kharchaTotal]
  );

  const earliest = unpaidEntries.reduce<string | null>((min, e) => {
    if (!min || e.entry_date < min) return e.entry_date;
    return min;
  }, null);
  const latest = unpaidEntries.reduce<string | null>((max, e) => {
    if (!max || e.entry_date > max) return e.entry_date;
    return max;
  }, null);

  const displayEntries =
    tab === "kaam" && kaamSub === "unpaid" ? unpaidEntries : allEntries;
  const grouped = useMemo(
    () => groupEntriesByDate(tab === "kaam" ? displayEntries : []),
    [displayEntries, tab]
  );

  const kaamLoading =
    authLoading || empLoading || (tab === "kaam" && workEntriesLoading);

  function refreshAllData() {
    refreshEntries();
    refreshKharcha();
    refreshAdvances();
    loadPayments();
    loadEmployee();
  }

  async function handleDeleteEntry() {
    if (!deleteTarget || !userId) return;
    setDeleting(true);
    try {
      const result = await offlineDelete(
        "karigar_work_entries",
        "karigar_work_entries",
        deleteTarget.id
      );
      if (!result.ok) throw new Error("Delete failed");
      toast.success(
        result.offline
          ? "Offline — delete local save ho gaya."
          : "Entry delete ho gayi."
      );
      await refreshPending();
      refreshAllData();
      setDeleteTarget(null);
    } catch {
      toast.error("Delete nahi ho saka.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteKharcha() {
    if (!deleteKharcha || !userId) return;
    setDeleting(true);
    try {
      const result = await offlineDelete(
        "karigar_kharcha",
        "karigar_kharcha",
        deleteKharcha.id
      );
      if (!result.ok) throw new Error("Delete failed");
      toast.success(
        result.offline
          ? "Offline — delete local save ho gaya."
          : "Kharcha delete ho gaya."
      );
      await refreshPending();
      refreshAllData();
      setDeleteKharcha(null);
    } catch {
      toast.error("Delete nahi ho saka.");
    } finally {
      setDeleting(false);
    }
  }

  const hasKarigarRecords =
    allEntries.length > 0 ||
    allKharcha.length > 0 ||
    allAdvances.length > 0 ||
    payments.length > 0;

  async function handleDeleteKarigar() {
    if (!employee || !userId) return;
    setDeleting(true);
    try {
      const result = await deleteKarigar(userId, employee.id);
      if (!result.ok) {
        toast.error("Karigar delete nahi ho saka.");
        return;
      }
      toast.success(
        result.offline
          ? "Offline — delete local save ho gaya."
          : "Karigar delete ho gaya."
      );
      await refreshPending();
      setDeleteKarigarOpen(false);
      router.replace("/karigar");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAdvance() {
    if (!deleteAdvance || !userId) return;
    setDeleting(true);
    try {
      const result = await offlineDelete(
        "karigar_advances",
        "karigar_advances",
        deleteAdvance.id
      );
      if (!result.ok) throw new Error("Delete failed");
      toast.success(
        result.offline
          ? "Offline — delete local save ho gaya."
          : "Advance delete ho gaya."
      );
      await refreshPending();
      refreshAllData();
      setDeleteAdvance(null);
    } catch {
      toast.error("Delete nahi ho saka.");
    } finally {
      setDeleting(false);
    }
  }

  const factoryName =
    (user?.user_metadata?.factory_name as string | undefined) ?? undefined;

  if (!authLoading && !empLoading && !employee) {
    return (
      <div>
        <Header title="Karigar" showBack onBack={() => router.back()} />
        <Card className="mx-4 mt-4 text-center">
          <p className="text-sm text-ink-500">Karigar nahi mila.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={employee?.name ?? "Karigar"}
        subtitle={employee?.role ?? undefined}
        showBack
        onBack={() => router.back()}
        right={
          employee ? (
            <>
              <button
                type="button"
                onClick={() => setShareSheetOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="WhatsApp pe share karein"
              >
                <WhatsAppShareIcon />
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Edit karigar"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => setDeleteKarigarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Delete karigar"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          ) : null
        }
      />

      <div className="px-4 pt-3 pb-24">
        {employee?.phone ? (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-500">
            <PhoneIcon className="h-4 w-4" />
            {employee.phone}
          </p>
        ) : null}

        <div
          className="rounded-2xl border p-4"
          style={{
            background: KARIGAR_PENDING.bg,
            borderColor: KARIGAR_PENDING.border,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: KARIGAR_PENDING.color }}>
            💰 Hisaab
          </p>
          {empLoading || workEntriesLoading ? (
            <Skeleton className="mt-2 h-8 w-40" />
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-600">Kaam (pending)</span>
                <span className="font-mono font-semibold">{formatRs(pendingTotal)}</span>
              </div>
              <div className="flex justify-between text-dena">
                <span>Kharcha lia (auto cut)</span>
                <span className="font-mono font-semibold">− {formatRs(kharchaTotal)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Advance baaki</span>
                <span className="font-mono font-semibold">
                  Rs. {formatPKR(advanceBalanceTotal)}
                </span>
              </div>
              <div
                className="flex justify-between border-t border-amber-200/80 pt-2 font-semibold"
                style={{ color: KARIGAR_PENDING.color }}
              >
                <span>Andaza net (advance alag)</span>
                <span className="font-mono">{formatRs(estimatedNet)}</span>
              </div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="col-span-2"
              disabled={
                unpaidEntries.length === 0 &&
                unpaidKharcha.length === 0 &&
                openAdvances.length === 0
              }
              onClick={() => setPaySheetOpen(true)}
            >
              Calculate & Pay
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setWorkFormOpen(true)}>
              + Kaam
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setKharchaFormOpen(true)}>
              + Kharcha
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="col-span-2"
              onClick={() => setAdvanceFormOpen(true)}
            >
              + Advance
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto">
          {(
            [
              ["kaam", "Kaam"],
              ["kharcha", "Kharcha"],
              ["advance", "Advance"],
              ["payments", "Payments"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={classNames(
                "shrink-0 rounded-full px-3 py-2 text-xs font-semibold",
                tab === t
                  ? "bg-brand text-white"
                  : "border border-line bg-white text-ink-500"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "kaam" ? (
          <div className="mt-3 flex gap-2">
            {(["unpaid", "history"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setKaamSub(s)}
                className={classNames(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  kaamSub === s
                    ? "bg-brand-50 text-brand"
                    : "border border-line text-ink-500"
                )}
              >
                {s === "unpaid" ? "Unpaid" : "History"}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          {tab === "payments" ? (
            <PaymentsList payments={payments} loading={empLoading} />
          ) : tab === "kharcha" ? (
            kharchaLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : allKharcha.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-ink-500">Abhi kharcha log nahi.</p>
              </Card>
            ) : (
              <Card className="divide-y divide-line p-0 overflow-hidden">
                {allKharcha.map((k) => (
                  <KharchaRow
                    key={k.id}
                    item={k}
                    onDelete={!k.wage_payment_id ? setDeleteKharcha : undefined}
                  />
                ))}
              </Card>
            )
          ) : tab === "advance" ? (
            advanceLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : allAdvances.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-ink-500">Abhi advance nahi.</p>
              </Card>
            ) : (
              <Card className="divide-y divide-line p-0 overflow-hidden">
                {allAdvances.map((a) => (
                  <AdvanceRow
                    key={a.id}
                    advance={a}
                    onDelete={
                      Number(a.amount_settled) === 0 ? setDeleteAdvance : undefined
                    }
                  />
                ))}
              </Card>
            )
          ) : kaamLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="mb-2">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))
          ) : grouped.length === 0 ? (
            <Card className="text-center">
              <p className="text-sm text-ink-500">
                {kaamSub === "unpaid"
                  ? "Koi unpaid kaam nahi. + Kaam se add karein."
                  : "Abhi koi history nahi."}
              </p>
            </Card>
          ) : (
            grouped.map((group) => (
              <div key={group.date} className="mb-4">
                <p className="mb-2 text-sm font-bold text-ink-900">
                  📅 {formatEntryDateHeader(group.date)}
                </p>
                <Card className="divide-y divide-line p-0 overflow-hidden">
                  {group.entries.map((entry) => (
                    <WorkEntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={
                        kaamSub === "unpaid" && !entry.wage_payment_id
                          ? setDeleteTarget
                          : undefined
                      }
                    />
                  ))}
                  <div
                    className="px-3 py-2 text-right text-xs font-semibold"
                    style={{ color: KARIGAR_PENDING.color }}
                  >
                    Day total: Rs. {formatPKR(group.dayTotal)}
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {employee && userId ? (
        <>
          <AddWorkEntryForm
            open={workFormOpen}
            onClose={() => setWorkFormOpen(false)}
            ownerId={userId}
            employee={employee}
            onSaved={refreshAllData}
          />
          <AddKharchaForm
            open={kharchaFormOpen}
            onClose={() => setKharchaFormOpen(false)}
            ownerId={userId}
            employeeId={employee.id}
            onSaved={refreshAllData}
          />
          <AddAdvanceForm
            open={advanceFormOpen}
            onClose={() => setAdvanceFormOpen(false)}
            ownerId={userId}
            employeeId={employee.id}
            onSaved={refreshAllData}
          />
          <CalculateWagesSheet
            open={paySheetOpen}
            onClose={() => setPaySheetOpen(false)}
            ownerId={userId}
            employee={employee}
            unpaidEntries={unpaidEntries}
            unpaidKharcha={unpaidKharcha}
            openAdvances={openAdvances}
            onPaid={refreshAllData}
            factoryName={factoryName}
          />
          <KarigarShareSheet
            open={shareSheetOpen}
            onClose={() => setShareSheetOpen(false)}
            employee={employee}
            factoryName={factoryName}
            unpaidEntries={unpaidEntries}
            unpaidKharcha={unpaidKharcha}
            openAdvances={openAdvances}
            allEntries={allEntries}
            allKharcha={allKharcha}
            payments={payments}
            pendingSummary={{
              kaamPending: pendingTotal,
              kharchaPending: kharchaTotal,
              advanceBalance: advanceBalanceTotal,
              estimatedNet,
            }}
          />
          <BottomSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            title="Karigar Edit"
          >
            <EditKarigarForm
              employee={employee}
              ownerId={userId}
              onSaved={(e) => setEmployee(e)}
              onClose={() => setEditOpen(false)}
            />
          </BottomSheet>
        </>
      ) : null}

      <ConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Entry delete?"
        message="Yeh unpaid kaam ki entry delete ho jayegi."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteEntry}
      />
      <ConfirmSheet
        open={!!deleteKharcha}
        onClose={() => setDeleteKharcha(null)}
        title="Kharcha delete?"
        message="Yeh kharcha record delete ho jayegi."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteKharcha}
      />
      <ConfirmSheet
        open={!!deleteAdvance}
        onClose={() => setDeleteAdvance(null)}
        title="Advance delete?"
        message="Yeh advance delete ho jayegi (sirf jab abhi kuch cut na hua ho)."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteAdvance}
      />
      <ConfirmSheet
        open={deleteKarigarOpen}
        onClose={() => setDeleteKarigarOpen(false)}
        title="Karigar delete karein?"
        message={
          hasKarigarRecords
            ? "Is karigar ka saara kaam, kharcha, advance aur payment history bhi delete ho jayegi. Kya aap sure hain?"
            : "Yeh karigar list se hata diya jayega. Kya aap sure hain?"
        }
        confirmLabel="Haan, Delete Karo"
        cancelLabel="Nahi"
        loading={deleting}
        onConfirm={handleDeleteKarigar}
      />
    </div>
  );
}

function PaymentsList({
  payments,
  loading,
}: {
  payments: WagePayment[];
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (payments.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-ink-500">Abhi koi payment nahi.</p>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {payments.map((p) => (
        <Card key={p.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {formatPeriodRange(p.period_start, p.period_end)}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {parsePaymentMode(p.notes)}
              {Number(p.kharcha_deduction ?? 0) > 0
                ? ` · Kharcha −${formatPKR(p.kharcha_deduction)}`
                : ""}
              {Number(p.advance_deduction ?? 0) > 0
                ? ` · Adv −${formatPKR(p.advance_deduction)}`
                : ""}
            </p>
          </div>
          <p className="font-mono text-sm font-bold text-ink-900">
            Rs. {formatPKR(p.net_amount)}
          </p>
        </Card>
      ))}
    </div>
  );
}
