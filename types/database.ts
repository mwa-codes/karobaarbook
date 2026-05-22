export type PartyType = "customer" | "vendor" | "both";
export type TransactionType = "lena" | "dena";
export type PaymentMode = "cash" | "bank" | "cheque" | "other";
export type TransactionCategory =
  | "sale"
  | "purchase"
  | "payment_received"
  | "payment_made"
  | "opening_balance"
  | "other";
export type RoznamchaType = "income" | "expense";
export type SubscriptionStatus = "trial" | "active" | "expired" | "suspended";
export type SubscriptionPlan = "monthly" | "annual";

// IMPORTANT: these are intentionally `type` aliases (not `interface`).
// Interfaces are considered open/extensible by TypeScript and do NOT satisfy
// `Record<string, unknown>` — which is what @supabase/postgrest-js's
// `GenericTable.Row|Insert|Update` constrain to, causing the entire schema to
// collapse to `never` when you try to `.insert()` / `.update()`.
export type Profile = {
  id: string;
  full_name: string | null;
  factory_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
};

export type Party = {
  id: string;
  owner_id: string;
  name: string;
  type: PartyType;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  owner_id: string;
  party_id: string;
  amount: number;
  type: TransactionType;
  transaction_category: TransactionCategory;
  payment_mode: PaymentMode;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

export type PartyBalance = {
  party_id: string;
  owner_id: string;
  name: string;
  type: PartyType;
  phone: string | null;
  is_active: boolean;
  total_lena: number;
  total_dena: number;
  net_balance: number;
};

export type RoznamchaEntry = {
  id: string;
  owner_id: string;
  entry_date: string;
  type: RoznamchaType;
  amount: number;
  description: string;
  category: string | null;
  payment_mode: PaymentMode;
  created_at: string;
  updated_at: string;
};

/** JSON returned by `get_roznamcha_day` RPC (Phase 2 migration). */
export type RoznamchaDayResult = {
  opening_balance: number;
  is_explicit: boolean;
};

export type Subscription = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string;
  subscription_ends_at: string | null;
  plan: SubscriptionPlan | null;
  amount_pkr: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyOpeningBalance = {
  id: string;
  owner_id: string;
  entry_date: string;
  opening_balance: number;
  created_at: string;
  updated_at: string;
};

export type DailySummary = {
  date: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  entries: RoznamchaEntry[];
};

// ── Karigar ──────────────────────────────────────────────────
export type WorkType = "per_day" | "per_piece" | "per_kg";

export type Employee = {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  rate_type: WorkType;
  rate_amount: number;
  joining_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type KarigarWorkEntry = {
  id: string;
  owner_id: string;
  employee_id: string;
  entry_date: string;
  work_type: WorkType;
  quantity: number;
  rate: number;
  amount: number;
  description: string | null;
  wage_payment_id: string | null;
  created_at: string;
};

export type WagePayment = {
  id: string;
  owner_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_days: number;
  total_units: number;
  total_hours: number;
  gross_amount: number;
  kharcha_deduction: number;
  advance_deduction: number;
  deductions: number;
  net_amount: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

export type KarigarKharcha = {
  id: string;
  owner_id: string;
  employee_id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  wage_payment_id: string | null;
  created_at: string;
};

export type KarigarAdvance = {
  id: string;
  owner_id: string;
  employee_id: string;
  entry_date: string;
  amount: number;
  amount_settled: number;
  description: string | null;
  created_at: string;
};

export type KarigarAdvanceApplication = {
  id: string;
  owner_id: string;
  advance_id: string;
  wage_payment_id: string;
  amount: number;
  created_at: string;
};

export type KarigarPendingWage = {
  employee_id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  rate_type: WorkType;
  rate_amount: number;
  is_active: boolean;
  total_pending: number;
  entry_count: number;
  earliest_unpaid_date: string | null;
  latest_unpaid_date: string | null;
  total_kharcha: number;
  advance_balance: number;
};

// Supabase-generated style schema map. Lets the typed clients infer
// row/insert/update shapes without running `supabase gen types`.
// Shape must match what @supabase/supabase-js expects
// (Relationships + CompositeTypes), otherwise `.insert()`/`.update()`
// argument types resolve to `never`.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      parties: {
        Row: Party;
        Insert: Omit<Party, "id" | "created_at" | "is_active"> & {
          id?: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: Partial<Omit<Party, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<
          Transaction,
          "id" | "created_at" | "transaction_category" | "payment_mode"
        > & {
          id?: string;
          created_at?: string;
          transaction_category?: TransactionCategory;
          payment_mode?: PaymentMode;
        };
        Update: Partial<
          Omit<Transaction, "id" | "owner_id" | "party_id" | "created_at">
        >;
        Relationships: [];
      };
      roznamcha: {
        Row: RoznamchaEntry;
        Insert: Omit<
          RoznamchaEntry,
          "id" | "created_at" | "updated_at" | "payment_mode" | "category"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          payment_mode?: PaymentMode;
          category?: string | null;
        };
        Update: Partial<
          Omit<RoznamchaEntry, "id" | "owner_id" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      daily_opening_balance: {
        Row: DailyOpeningBalance;
        Insert: Omit<DailyOpeningBalance, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<DailyOpeningBalance, "id" | "owner_id" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<
          Subscription,
          "id" | "created_at" | "updated_at" | "status" | "trial_ends_at"
        > & {
          id?: string;
          status?: SubscriptionStatus;
          trial_ends_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Subscription, "id" | "user_id">>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, "id" | "created_at" | "updated_at" | "is_active" | "joining_date"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          joining_date?: string;
        };
        Update: Partial<Omit<Employee, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      karigar_work_entries: {
        Row: KarigarWorkEntry;
        Insert: Omit<KarigarWorkEntry, "id" | "amount" | "created_at" | "wage_payment_id"> & {
          id?: string;
          created_at?: string;
          wage_payment_id?: string | null;
        };
        Update: Partial<Omit<KarigarWorkEntry, "id" | "owner_id" | "amount" | "created_at">>;
        Relationships: [];
      };
      wage_payments: {
        Row: WagePayment;
        Insert: Omit<
          WagePayment,
          "id" | "created_at" | "paid" | "paid_at" | "kharcha_deduction" | "advance_deduction"
        > & {
          id?: string;
          created_at?: string;
          paid?: boolean;
          paid_at?: string | null;
          kharcha_deduction?: number;
          advance_deduction?: number;
        };
        Update: Partial<Omit<WagePayment, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      karigar_kharcha: {
        Row: KarigarKharcha;
        Insert: Omit<KarigarKharcha, "id" | "created_at" | "wage_payment_id"> & {
          id?: string;
          created_at?: string;
          wage_payment_id?: string | null;
        };
        Update: Partial<Omit<KarigarKharcha, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      karigar_advances: {
        Row: KarigarAdvance;
        Insert: Omit<KarigarAdvance, "id" | "created_at" | "amount_settled"> & {
          id?: string;
          created_at?: string;
          amount_settled?: number;
        };
        Update: Partial<Omit<KarigarAdvance, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      karigar_advance_applications: {
        Row: KarigarAdvanceApplication;
        Insert: Omit<KarigarAdvanceApplication, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<KarigarAdvanceApplication, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      party_balances: {
        Row: PartyBalance;
        Relationships: [];
      };
      karigar_pending_wages: {
        Row: KarigarPendingWage;
        Relationships: [];
      };
    };
    Functions: {
      get_roznamcha_day: {
        Args: {
          p_owner_id: string;
          p_date: string;
        };
        Returns: RoznamchaDayResult;
      };
      is_subscription_active: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      party_type: PartyType;
      transaction_type: TransactionType;
      payment_mode: PaymentMode;
      transaction_category: TransactionCategory;
      roznamcha_type: RoznamchaType;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
