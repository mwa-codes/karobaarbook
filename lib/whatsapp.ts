import type { PartyBalance, Transaction } from "@/types/database";
import { formatPKR, openWhatsApp } from "@/lib/format";

export { openWhatsApp };

/** Single party — outstanding balance reminder */
export function buildPartyBalanceMessage(
  party: PartyBalance,
  factoryName?: string
): string {
  const balance = Number(party.net_balance);
  const absBalance = Math.abs(balance);
  const isLena = balance > 0;

  const header = factoryName ? `*${factoryName}*\n` : "";

  if (balance === 0) {
    return (
      `${header}` +
      `Assalam o Alaikum ${party.name} Sahab,\n\n` +
      `Aap ka hisaab barabar hai. Shukriya! 🙏\n\n` +
      `_KarobaarBook se bheja gaya_`
    );
  }

  if (isLena) {
    return (
      `${header}` +
      `Assalam o Alaikum ${party.name} Sahab,\n\n` +
      `Aap ki taraf se *Rs. ${formatPKR(absBalance)}* baaki hain.\n\n` +
      `Shukriya 🙏\n` +
      `_KarobaarBook se bheja gaya_`
    );
  }

  return (
    `${header}` +
    `Assalam o Alaikum ${party.name} Sahab,\n\n` +
    `Hamaari taraf se aap ko *Rs. ${formatPKR(absBalance)}* dene hain.\n\n` +
    `_KarobaarBook se bheja gaya_`
  );
}

/** Full khata summary — all parties with pending balances */
export function buildKhataSummaryMessage(
  parties: PartyBalance[],
  factoryName?: string
): string {
  const lenaParties = parties.filter((p) => Number(p.net_balance) > 0);
  const denaParties = parties.filter((p) => Number(p.net_balance) < 0);

  const totalLena = lenaParties.reduce(
    (s, p) => s + Number(p.net_balance),
    0
  );
  const totalDena = denaParties.reduce(
    (s, p) => s + Math.abs(Number(p.net_balance)),
    0
  );

  const header = factoryName
    ? `*${factoryName} — Khata Summary*\n`
    : `*Khata Summary*\n`;
  const date = new Date().toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let msg = `${header}📅 ${date}\n\n`;

  if (lenaParties.length > 0) {
    msg += `*📥 Lena (Receivable) — Rs. ${formatPKR(totalLena)}*\n`;
    lenaParties.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}: Rs. ${formatPKR(Math.abs(Number(p.net_balance)))}\n`;
    });
    msg += `\n`;
  }

  if (denaParties.length > 0) {
    msg += `*📤 Dena (Payable) — Rs. ${formatPKR(totalDena)}*\n`;
    denaParties.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}: Rs. ${formatPKR(Math.abs(Number(p.net_balance)))}\n`;
    });
    msg += `\n`;
  }

  if (lenaParties.length === 0 && denaParties.length === 0) {
    msg += `✅ Sab parties ka hisaab barabar hai!\n\n`;
  }

  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}

/** Single party — full transaction ledger */
export function buildPartyLedgerMessage(
  party: PartyBalance,
  transactions: Transaction[],
  factoryName?: string
): string {
  const header = factoryName ? `*${factoryName}*\n` : "";
  const balance = Number(party.net_balance);
  const absBalance = Math.abs(balance);

  const sorted = [...transactions]
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    .slice(-20);

  let msg =
    `${header}` +
    `*${party.name} — Khata Detail*\n` +
    `📅 ${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}\n\n`;

  if (sorted.length > 0) {
    msg += `*Transactions:*\n`;
    sorted.forEach((t) => {
      const d = new Date(t.transaction_date).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
      });
      const sign = t.type === "lena" ? "+" : "-";
      const desc = t.description ? ` (${t.description})` : "";
      msg += `${d}: ${sign}Rs. ${formatPKR(Number(t.amount))}${desc}\n`;
    });
    msg += `\n`;
  }

  msg +=
    balance === 0
      ? `✅ *Hisaab barabar hai*\n`
      : balance > 0
        ? `*Baaki: Rs. ${formatPKR(absBalance)} LENA hai*\n`
        : `*Baaki: Rs. ${formatPKR(absBalance)} DENA hai*\n`;

  msg += `\n_KarobaarBook se bheja gaya_`;
  return msg;
}

/** Pending balances only — Thursday reminder blast */
export function buildPendingRemindersMessage(
  parties: PartyBalance[],
  factoryName?: string
): string {
  const pending = parties.filter((p) => Number(p.net_balance) > 0);

  if (pending.length === 0) {
    return `Sab parties ne payment kar di hai! ✅`;
  }

  const total = pending.reduce((s, p) => s + Number(p.net_balance), 0);
  const header = factoryName ? `*${factoryName}*\n` : "";

  let msg =
    `${header}` +
    `*📋 Pending Payments — ${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long" })}*\n\n`;

  pending.forEach((p, i) => {
    const phone = p.phone ? ` | 📞 ${p.phone}` : "";
    msg += `${i + 1}. *${p.name}*${phone}\n   Rs. ${formatPKR(Number(p.net_balance))} baaki\n\n`;
  });

  msg += `*Total Pending: Rs. ${formatPKR(total)}*\n\n`;
  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}

/** Karigar wage slip after payment */
export function buildWageSlipMessage(
  employeeName: string,
  period: { from: string; to: string },
  breakdown: { label: string; amount: number }[],
  gross: number,
  deductions: number,
  net: number,
  factoryName?: string,
  extras?: { kharcha?: number; advance?: number }
): string {
  const header = factoryName ? `*${factoryName}*\n` : "";
  const from = new Date(`${period.from}T12:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
  const to = new Date(`${period.to}T12:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });

  let msg =
    `${header}` +
    `*💰 Wage Slip — ${employeeName}*\n` +
    `📅 ${from} – ${to}\n\n` +
    `*Breakdown:*\n`;

  breakdown.forEach((b) => {
    msg += `• ${b.label}: Rs. ${formatPKR(b.amount)}\n`;
  });

  msg += `\n`;
  msg += `Gross (kaam): Rs. ${formatPKR(gross)}\n`;
  if (extras?.kharcha && extras.kharcha > 0) {
    msg += `Kharcha cut:  Rs. ${formatPKR(extras.kharcha)}\n`;
  }
  if (extras?.advance && extras.advance > 0) {
    msg += `Advance cut:  Rs. ${formatPKR(extras.advance)}\n`;
  }
  if (deductions > 0) {
    msg += `Aur katoti:   Rs. ${formatPKR(deductions)}\n`;
  }
  msg += `*Net Paid:  Rs. ${formatPKR(net)}*\n\n`;
  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}
