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
import { AddTransactionForm } from "@/components/khata/AddTransactionForm";
import { AddPartyForm } from "@/components/khata/AddPartyForm";
import { TransactionRow } from "@/components/khata/TransactionRow";
import { useAuth } from "@/hooks/useAuth";
import { fetchParty, fetchPartyBalance } from "@/hooks/useParties";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/lib/supabase";
import { classNames, formatRs, formatPKR } from "@/lib/format";
import type {
  Party,
  PartyBalance,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/types/database";

export default function PartyDetailPage() {
  const params = useParams<{ id: string }>();
  const partyId = params?.id as string;
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [party, setParty] = useState<Party | null>(null);
  const [balance, setBalance] = useState<PartyBalance | null>(null);
  const [partyLoading, setPartyLoading] = useState(true);
  const [partyError, setPartyError] = useState<string | null>(null);

  const {
    transactions,
    loading: txLoading,
    refresh: refreshTx,
  } = useTransactions(userId, { partyId });

  const [sheet, setSheet] = useState<{
    open: boolean;
    type: TransactionType;
    category?: TransactionCategory;
    editing?: Transaction | null;
  }>({ open: false, type: "lena", editing: null });

  const [editPartyOpen, setEditPartyOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletePartyOpen, setDeletePartyOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingParty, setDeletingParty] = useState(false);

  const loadParty = useCallback(async () => {
    if (!userId || !partyId) return;
    setPartyError(null);
    try {
      const [p, b] = await Promise.all([
        fetchParty(partyId, userId),
        fetchPartyBalance(partyId, userId),
      ]);
      setParty(p);
      setBalance(b);
    } catch (err) {
      setPartyError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setPartyLoading(false);
    }
  }, [partyId, userId]);

  useEffect(() => {
    if (userId) {
      setPartyLoading(true);
      loadParty();
    }
  }, [userId, loadParty]);

  // Realtime: refetch the balance row when transactions for this party change.
  useEffect(() => {
    if (!userId || !partyId) return;
    const channel = supabase
      .channel(`party-detail:${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `party_id=eq.${partyId}`,
        },
        () => {
          loadParty();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, partyId, loadParty]);

  const net = useMemo(() => Number(balance?.net_balance ?? 0), [balance]);
  const isLena = net > 0;
  const isSettled = net === 0;

  // Build a chronological-ASC running-balance list for display.
  // Always recalc from beginning — never store running balance.
  const ledger = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const d = a.transaction_date.localeCompare(b.transaction_date);
      if (d !== 0) return d;
      return a.created_at.localeCompare(b.created_at);
    });
    let running = 0;
    const rows = sorted.map((t) => {
      running += t.type === "lena" ? Number(t.amount) : -Number(t.amount);
      return { t, runningBalance: running };
    });
    return rows.reverse();
  }, [transactions]);

  function openAdd(type: TransactionType, category?: TransactionCategory) {
    setSheet({ open: true, type, category, editing: null });
  }
  function openEdit(t: Transaction) {
    setSheet({
      open: true,
      type: t.type,
      category: t.transaction_category,
      editing: t,
    });
  }
  function closeSheet() {
    setSheet((s) => ({ ...s, open: false }));
  }

  async function handleDeleteTransaction() {
    if (!deleteTarget || !userId) return;
    setDeletingId(deleteTarget.id);
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("owner_id", userId);
    setDeletingId(null);
    if (error) {
      toast.error("Delete nahi ho saka.");
      return;
    }
    toast.success("Entry delete ho gayi.");
    setDeleteTarget(null);
    refreshTx();
    loadParty();
  }

  async function handleDeleteParty() {
    if (!party || !userId) return;
    setDeletingParty(true);
    const { error } = await supabase
      .from("parties")
      .delete()
      .eq("id", party.id)
      .eq("owner_id", userId);
    setDeletingParty(false);
    if (error) {
      toast.error("Party delete nahi hui.");
      return;
    }
    toast.success("Party delete ho gayi.");
    setDeletePartyOpen(false);
    router.replace("/khata");
    router.refresh();
  }

  if (partyLoading || authLoading) {
    return (
      <div>
        <Header title="Party" showBack />
        <div className="px-4 pt-4">
          <Card>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-10 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div>
        <Header title="Party" showBack />
        <div className="px-4 pt-6">
          <Card className="text-center">
            <p className="text-sm font-semibold text-ink-900">
              Party nahi mili.
            </p>
            {partyError ? (
              <p className="mt-1 text-xs text-dena">{partyError}</p>
            ) : null}
            <Button
              className="mt-3"
              variant="primary"
              size="md"
              onClick={() => router.replace("/khata")}
            >
              Khata par wapas jayein
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isCustomer = party.type === "customer" || party.type === "both";
  const isVendor = party.type === "vendor" || party.type === "both";

  return (
    <div>
      <Header
        title={party.name}
        subtitle={
          party.type === "both"
            ? "Customer + Vendor"
            : party.type === "customer"
              ? "Customer"
              : "Vendor"
        }
        showBack
        right={
          <>
            <button
              type="button"
              onClick={() => setEditPartyOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
              aria-label="Edit party"
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={() => setDeletePartyOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
              aria-label="Delete party"
            >
              <TrashIcon />
            </button>
          </>
        }
      />

      <div className="px-4 pt-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-500">
                Net Balance
              </p>
              <p
                className={classNames(
                  "mt-1 font-mono text-3xl font-bold",
                  isSettled
                    ? "text-ink-900"
                    : isLena
                      ? "text-lena"
                      : "text-dena"
                )}
              >
                {formatRs(Math.abs(net))}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {isSettled
                  ? "Hisaab barabar."
                  : isLena
                    ? `${party.name} se Rs. ${formatPKR(Math.abs(net))} milne hain (LENA)`
                    : `${party.name} ko Rs. ${formatPKR(Math.abs(net))} dene hain (DENA)`}
              </p>
            </div>
            {party.phone ? (
              <a
                href={`tel:${party.phone}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"
                aria-label="Call"
              >
                <PhoneIcon />
              </a>
            ) : null}
          </div>

          {/* Two visually-connected action buttons */}
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line">
            {isCustomer ? (
              <ActionTile
                tone="lena"
                emoji="📥"
                title="+ New Bill"
                subtitle="Unhon ne kharida"
                onClick={() => openAdd("lena", "sale")}
              />
            ) : (
              <ActionTile
                tone="dena"
                emoji="📥"
                title="+ Purchase"
                subtitle="Aap ne kharida"
                onClick={() => openAdd("dena", "purchase")}
              />
            )}
            {isCustomer ? (
              <ActionTile
                tone="dena"
                emoji="📤"
                title="+ Payment Received"
                subtitle="Unhon ne diya"
                onClick={() => openAdd("dena", "payment_received")}
              />
            ) : isVendor ? (
              <ActionTile
                tone="lena"
                emoji="📤"
                title="+ Payment Made"
                subtitle="Aap ne diya"
                onClick={() => openAdd("lena", "payment_made")}
              />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-center">
            <div>
              <p className="text-[11px] uppercase text-ink-500">Total Lena</p>
              <p className="font-mono text-sm font-semibold text-lena">
                Rs. {formatPKR(balance?.total_lena ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-ink-500">Total Dena</p>
              <p className="font-mono text-sm font-semibold text-dena">
                Rs. {formatPKR(balance?.total_dena ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        {party.address || party.notes ? (
          <Card className="mt-3">
            {party.address ? (
              <p className="text-xs">
                <span className="font-semibold text-ink-900">Address: </span>
                <span className="text-ink-500">{party.address}</span>
              </p>
            ) : null}
            {party.notes ? (
              <p className="mt-1 text-xs">
                <span className="font-semibold text-ink-900">Notes: </span>
                <span className="text-ink-500">{party.notes}</span>
              </p>
            ) : null}
          </Card>
        ) : null}

        <section className="mt-6 pb-8">
          <h2 className="px-1 text-base font-bold text-ink-900">
            Transaction History
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {txLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card"
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))
            ) : ledger.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-ink-500">
                  Koi transaction nahi hai. Upar se add karo.
                </p>
              </Card>
            ) : (
              ledger.map(({ t, runningBalance }) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  runningBalance={runningBalance}
                  onEdit={openEdit}
                  onDelete={(tx) => setDeleteTarget(tx)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <BottomSheet
        open={sheet.open}
        onClose={closeSheet}
        title={sheet.editing ? "Transaction edit karein" : "Nayi entry"}
      >
        {userId ? (
          <AddTransactionForm
            ownerId={userId}
            partyId={partyId}
            partyType={party.type}
            initialType={sheet.type}
            initialCategory={sheet.category}
            editing={sheet.editing ?? null}
            onSaved={() => {
              closeSheet();
              refreshTx();
              loadParty();
            }}
            onCancel={closeSheet}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={editPartyOpen}
        onClose={() => setEditPartyOpen(false)}
        title="Party edit karein"
      >
        {userId && party ? (
          <AddPartyForm
            ownerId={userId}
            initial={party}
            onSaved={(updated) => {
              setEditPartyOpen(false);
              setParty(updated);
            }}
          />
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        open={!!deleteTarget}
        title="Transaction delete karein?"
        message="Kya aap ye entry delete karna chahte hain?"
        confirmLabel="Haan, Delete Karo"
        cancelLabel="Nahi"
        variant="danger"
        loading={!!deletingId}
        onConfirm={handleDeleteTransaction}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmSheet
        open={deletePartyOpen}
        title="Party delete karein?"
        message="Iski saari transactions bhi delete ho jayengi. Kya aap sure hain?"
        confirmLabel="Haan, Delete Karo"
        cancelLabel="Nahi"
        variant="danger"
        loading={deletingParty}
        onConfirm={handleDeleteParty}
        onClose={() => setDeletePartyOpen(false)}
      />
    </div>
  );
}

function ActionTile({
  tone,
  emoji,
  title,
  subtitle,
  onClick,
}: {
  tone: "lena" | "dena";
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex flex-col items-center justify-center gap-1 py-4 transition-colors",
        tone === "lena"
          ? "bg-lena-50 hover:bg-lena-100"
          : "bg-dena-50 hover:bg-dena-100"
      )}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span
        className={classNames(
          "text-sm font-semibold",
          tone === "lena" ? "text-lena-700" : "text-dena-700"
        )}
      >
        {title}
      </span>
      <span className="text-[11px] text-ink-500">{subtitle}</span>
    </button>
  );
}
