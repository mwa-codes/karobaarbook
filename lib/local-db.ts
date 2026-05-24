import Dexie, { type Table } from "dexie";
import type {
  Party,
  Transaction,
  Employee,
  KarigarWorkEntry,
  WagePayment,
  RoznamchaEntry,
  DailyOpeningBalance,
  KarigarKharcha,
  KarigarAdvance,
  KarigarAdvanceApplication,
} from "@/types/database";

export type SyncMeta = {
  _synced: 0 | 1;
  _deleted: 0 | 1;
  _local_id?: string;
};

export type LocalParty = Party & SyncMeta;
export type LocalTransaction = Transaction & SyncMeta;
export type LocalEmployee = Employee & SyncMeta;
export type LocalWorkEntry = KarigarWorkEntry & SyncMeta;
export type LocalWagePayment = WagePayment & SyncMeta;
export type LocalRoznamchaEntry = RoznamchaEntry & SyncMeta;
export type LocalOpeningBalance = DailyOpeningBalance & SyncMeta;
export type LocalKarigarKharcha = KarigarKharcha & SyncMeta;
export type LocalKarigarAdvance = KarigarAdvance & SyncMeta;
export type LocalKarigarAdvanceApplication = KarigarAdvanceApplication & SyncMeta;

export type DexieTableName =
  | "parties"
  | "transactions"
  | "employees"
  | "karigar_work_entries"
  | "wage_payments"
  | "roznamcha"
  | "daily_opening_balance"
  | "karigar_kharcha"
  | "karigar_advances"
  | "karigar_advance_applications";

class KarobaarLocalDB extends Dexie {
  parties!: Table<LocalParty>;
  transactions!: Table<LocalTransaction>;
  employees!: Table<LocalEmployee>;
  karigar_work_entries!: Table<LocalWorkEntry>;
  wage_payments!: Table<LocalWagePayment>;
  roznamcha!: Table<LocalRoznamchaEntry>;
  daily_opening_balance!: Table<LocalOpeningBalance>;
  karigar_kharcha!: Table<LocalKarigarKharcha>;
  karigar_advances!: Table<LocalKarigarAdvance>;
  karigar_advance_applications!: Table<LocalKarigarAdvanceApplication>;

  constructor() {
    super("KarobaarLocalDB");
    this.version(1).stores({
      parties:
        "id, owner_id, _synced, _deleted",
      transactions:
        "id, owner_id, party_id, transaction_date, _synced, _deleted",
      employees:
        "id, owner_id, is_active, _synced, _deleted",
      karigar_work_entries:
        "id, owner_id, employee_id, wage_payment_id, entry_date, _synced, _deleted",
      wage_payments:
        "id, owner_id, employee_id, _synced, _deleted",
      roznamcha:
        "id, owner_id, entry_date, _synced, _deleted",
      daily_opening_balance:
        "id, owner_id, entry_date, _synced, _deleted",
      karigar_kharcha:
        "id, owner_id, employee_id, wage_payment_id, entry_date, _synced, _deleted",
      karigar_advances:
        "id, owner_id, employee_id, entry_date, _synced, _deleted",
      karigar_advance_applications:
        "id, owner_id, advance_id, wage_payment_id, _synced, _deleted",
    });
  }
}

export const localDB = new KarobaarLocalDB();

export function tempId(): string {
  return `offline_${crypto.randomUUID()}`;
}

export function isOfflineRecord(id: string): boolean {
  return id.startsWith("offline_");
}

export function withSync<T extends Record<string, unknown>>(
  row: T,
  synced: 0 | 1 = 1
): T & SyncMeta {
  return { ...row, _synced: synced, _deleted: 0 };
}
