export type PartyType = "customer" | "vendor" | "both";
export type TransactionType = "lena" | "dena";

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
        Insert: Omit<Transaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<
          Omit<Transaction, "id" | "owner_id" | "party_id" | "created_at">
        >;
        Relationships: [];
      };
    };
    Views: {
      party_balances: {
        Row: PartyBalance;
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      party_type: PartyType;
      transaction_type: TransactionType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
