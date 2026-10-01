import type { PartyBalance } from "@/types/database";

/**
 * Khata totals expressed as receivable / payable.
 *
 * A transaction's `type` is only the *direction* of an entry, not a debt.
 * A customer's "Payment Received" is stored as `dena`, and a vendor's
 * "Payment Made" as `lena` — both reduce what is outstanding. Summing the
 * raw `total_lena` / `total_dena` columns across parties therefore counts a
 * customer's payment as money you owe, which is backwards.
 *
 * So we sum each party's net balance instead: a party you owe is a payable,
 * a party that owes you is a receivable.
 *
 * `net` is unaffected by this: sum(max(net, 0)) - sum(|min(net, 0)|) always
 * equals the sum of every party's net_balance.
 */
export interface KhataTotals {
  /** Receivable — customers se lena baqi. */
  lena: number;
  /** Payable — vendors ko dena baqi (always a positive number). */
  dena: number;
  /** lena - dena; same value as the sum of all party net balances. */
  net: number;
  /** Parties that owe you, largest first. */
  lenaParties: PartyBalance[];
  /** Parties you owe, largest debt first. */
  denaParties: PartyBalance[];
}

export function sumPartyBalances(parties: PartyBalance[]): KhataTotals {
  const lenaParties: PartyBalance[] = [];
  const denaParties: PartyBalance[] = [];
  let lena = 0;
  let dena = 0;

  for (const p of parties) {
    const balance = Number(p.net_balance ?? 0);
    if (balance > 0) {
      lena += balance;
      lenaParties.push(p);
    } else if (balance < 0) {
      dena += -balance;
      denaParties.push(p);
    }
  }

  lenaParties.sort((a, b) => Number(b.net_balance) - Number(a.net_balance));
  denaParties.sort((a, b) => Number(a.net_balance) - Number(b.net_balance));

  return { lena, dena, net: lena - dena, lenaParties, denaParties };
}
