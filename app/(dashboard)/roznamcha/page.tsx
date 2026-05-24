"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { useToast } from "@/components/ui/Toast";
import { AddEntryForm } from "@/components/roznamcha/AddEntryForm";
import { DailySummary } from "@/components/roznamcha/DailySummary";
import { DateNavigator } from "@/components/roznamcha/DateNavigator";
import { EntryCard } from "@/components/roznamcha/EntryCard";
import { OpeningBalanceCard } from "@/components/roznamcha/OpeningBalanceCard";
import { OpeningBalanceEditor } from "@/components/roznamcha/OpeningBalanceEditor";
import { clearOpeningBalanceForDay } from "@/lib/roznamcha-opening";
import { useAuth } from "@/hooks/useAuth";
import { useRoznamcha } from "@/hooks/useRoznamcha";
import { useOffline } from "@/context/OfflineContext";
import { offlineDelete } from "@/lib/offline-write";
import { todayIso } from "@/lib/format";
import type { RoznamchaEntry, RoznamchaType } from "@/types/database";

export default function RoznamchaPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const toast = useToast();
  const { refreshPending } = useOffline();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso());

  const {
    entries,
    loading,
    error,
    openingBalance,
    openingIsExplicit,
    totalIncome,
    totalExpense,
    closingBalance,
    refresh,
  } = useRoznamcha(userId, selectedDate);

  const [entrySheet, setEntrySheet] = useState<{
    open: boolean;
    type: RoznamchaType;
    editing: RoznamchaEntry | null;
  }>({ open: false, type: "income", editing: null });

  const [openingSheetOpen, setOpeningSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoznamchaEntry | null>(null);
  const [deleteOpeningOpen, setDeleteOpeningOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openAdd(type: RoznamchaType) {
    setEntrySheet({ open: true, type, editing: null });
  }
  function openEdit(entry: RoznamchaEntry) {
    setEntrySheet({ open: true, type: entry.type, editing: entry });
  }
  function closeSheet() {
    setEntrySheet((s) => ({ ...s, open: false }));
  }

  async function handleDelete() {
    if (!deleteTarget || !userId) return;
    setDeleting(true);
    const result = await offlineDelete("roznamcha", "roznamcha", deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error("Delete nahi ho saka.");
      return;
    }
    toast.success(
      result.offline
        ? "Offline — delete local save ho gaya."
        : "Entry delete ho gayi."
    );
    await refreshPending();
    setDeleteTarget(null);
    refresh();
  }

  async function handleDeleteOpening() {
    if (!userId) return;
    setDeleting(true);
    const result = await clearOpeningBalanceForDay(userId, selectedDate);
    setDeleting(false);
    if (!result.ok) {
      toast.error("Opening balance delete nahi ho saka.");
      return;
    }
    toast.success(
      result.offline
        ? "Offline — delete local save ho gaya."
        : openingIsExplicit
          ? "Kal ka bakaya delete ho gaya — ab auto calculate hoga."
          : "Opening balance Rs 0 set ho gaya."
    );
    await refreshPending();
    setDeleteOpeningOpen(false);
    refresh();
  }

  const showLoading = authLoading || loading;

  return (
    <div>
      <Header
        title="Roznamcha"
        subtitle="Daily cash book"
      />

      <div className="px-4 pt-4">
        <DateNavigator date={selectedDate} onChange={setSelectedDate} />

        <div className="mt-4">
          {showLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            </div>
          ) : (
            <DailySummary
              openingBalance={openingBalance}
              openingIsExplicit={openingIsExplicit}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              closingBalance={closingBalance}
              onEditOpening={() => setOpeningSheetOpen(true)}
              onDeleteOpening={
                openingIsExplicit || openingBalance !== 0
                  ? () => setDeleteOpeningOpen(true)
                  : undefined
              }
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="lena"
            size="lg"
            fullWidth
            onClick={() => openAdd("income")}
          >
            + Amdani
          </Button>
          <Button
            variant="dena"
            size="lg"
            fullWidth
            onClick={() => openAdd("expense")}
          >
            + Kharcha
          </Button>
        </div>

        {error ? (
          <Card className="mt-4 border border-dena-100 bg-dena-50">
            <p className="text-sm font-medium text-dena-700">
              Data load nahi ho saka. {error}
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

        <section className="mt-6 pb-8">
          <h2 className="px-1 text-base font-bold text-ink-900">
            Aaj ki Entries
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {showLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </Card>
              ))
            ) : entries.length === 0 && !openingIsExplicit ? (
              <Card className="text-center">
                <p className="text-sm text-ink-500">
                  Is din ke liye koi entry nahi hai. Upar se Amdani ya Kharcha
                  add karein.
                </p>
              </Card>
            ) : (
              <>
                {openingIsExplicit ? (
                  <OpeningBalanceCard
                    amount={openingBalance}
                    onEdit={() => setOpeningSheetOpen(true)}
                    onDelete={() => setDeleteOpeningOpen(true)}
                  />
                ) : null}
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={openEdit}
                    onDelete={(e) => setDeleteTarget(e)}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      <BottomSheet
        open={entrySheet.open}
        onClose={closeSheet}
        title={
          entrySheet.editing
            ? "Entry edit karein"
            : entrySheet.type === "income"
              ? "Amdani add karein"
              : "Kharcha add karein"
        }
      >
        {userId ? (
          <AddEntryForm
            ownerId={userId}
            defaultDate={selectedDate}
            initialType={entrySheet.type}
            editing={entrySheet.editing}
            onSaved={() => {
              closeSheet();
              refresh();
            }}
            onCancel={closeSheet}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={openingSheetOpen}
        onClose={() => setOpeningSheetOpen(false)}
        title="Opening Balance"
      >
        {userId ? (
          <OpeningBalanceEditor
            ownerId={userId}
            date={selectedDate}
            currentOpening={openingBalance}
            isExplicit={openingIsExplicit}
            onSaved={() => {
              setOpeningSheetOpen(false);
              refresh();
            }}
            onCancel={() => setOpeningSheetOpen(false)}
          />
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        open={!!deleteTarget}
        title="Entry delete karein?"
        message="Kya aap is amdani/kharcha entry ko delete karna chahte hain?"
        confirmLabel="Haan, Delete Karo"
        cancelLabel="Nahi"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
      />

      <ConfirmSheet
        open={deleteOpeningOpen}
        title={
          openingIsExplicit
            ? "Kal ka bakaya delete karein?"
            : "Opening balance clear karein?"
        }
        message={
          openingIsExplicit
            ? "Manual opening balance hata diya jayega. Uske baad pichle din ke closing se auto calculate hoga."
            : "Is din ka opening balance Rs 0 set ho jayega."
        }
        confirmLabel="Haan, Delete Karo"
        cancelLabel="Nahi"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteOpening}
        onClose={() => !deleting && setDeleteOpeningOpen(false)}
      />
    </div>
  );
}
