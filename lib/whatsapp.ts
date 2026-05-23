import type {
  KarigarAdvance,
  KarigarKharcha,
  KarigarPendingWage,
  KarigarWorkEntry,
  PartyBalance,
  Transaction,
  WagePayment,
} from "@/types/database";
import { formatPKR, openWhatsApp } from "@/lib/format";
import {
  advanceRemaining,
  computeNetPayable,
  computeWageBreakdown,
  formatPeriodRange,
  workTypeLabel,
  workTypeUnit,
} from "@/lib/karigar";

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

function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
}

function inPeriod(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

/** Unpaid kaam / kharcha / advance — quick summary for karigar */
export function buildKarigarPendingSummaryMessage(
  employeeName: string,
  summary: {
    kaamPending: number;
    kharchaPending: number;
    advanceBalance: number;
    estimatedNet: number;
    unpaidEntryCount: number;
  },
  factoryName?: string
): string {
  const header = factoryName ? `*${factoryName}*\n` : "";
  let msg =
    `${header}` +
    `*💰 ${employeeName} — Pending Hisaab*\n` +
    `📅 ${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}\n\n`;

  msg += `Kaam (unpaid): Rs. ${formatPKR(summary.kaamPending)}`;
  if (summary.unpaidEntryCount > 0) {
    msg += ` (${summary.unpaidEntryCount} entries)`;
  }
  msg += `\n`;

  if (summary.kharchaPending > 0) {
    msg += `Kharcha (cut hoga): − Rs. ${formatPKR(summary.kharchaPending)}\n`;
  }
  if (summary.advanceBalance > 0) {
    msg += `Advance baaki: − Rs. ${formatPKR(summary.advanceBalance)}\n`;
  }

  msg += `\n*Andaza net dena hai: Rs. ${formatPKR(summary.estimatedNet)}*\n\n`;
  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}

/** Kaam, kharcha, advance detail for a date range */
export function buildKarigarPeriodDetailMessage(
  employeeName: string,
  period: { from: string; to: string },
  entries: KarigarWorkEntry[],
  kharcha: KarigarKharcha[],
  openAdvances: KarigarAdvance[],
  factoryName?: string
): string {
  const header = factoryName ? `*${factoryName}*\n` : "";
  const rangeEntries = entries.filter((e) =>
    inPeriod(e.entry_date, period.from, period.to)
  );
  const rangeKharcha = kharcha.filter((k) =>
    inPeriod(k.entry_date, period.from, period.to)
  );
  const gross = rangeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const kharchaTotal = rangeKharcha.reduce((s, k) => s + Number(k.amount), 0);
  const advanceTotal = openAdvances.reduce(
    (s, a) => s + advanceRemaining(a),
    0
  );
  const estimatedNet = computeNetPayable(gross, kharchaTotal, 0, 0);

  let msg =
    `${header}` +
    `*📋 ${employeeName} — Hisaab Detail*\n` +
    `📅 ${formatPeriodRange(period.from, period.to)}\n\n`;

  if (rangeEntries.length > 0) {
    msg += `*Kaam:*\n`;
    const byDate = [...rangeEntries].sort((a, b) =>
      a.entry_date.localeCompare(b.entry_date)
    );
    for (const e of byDate) {
      const d = formatShortDate(e.entry_date);
      const qty = formatPKR(Number(e.quantity));
      const unit = workTypeUnit(e.work_type);
      const rate = formatPKR(Number(e.rate));
      const amt = formatPKR(Number(e.amount));
      const desc = e.description ? ` — ${e.description}` : "";
      msg += `${d}: ${workTypeLabel(e.work_type)} ${qty} ${unit} × Rs. ${rate} = Rs. ${amt}${desc}\n`;
    }
    msg += `\n`;
  } else {
    msg += `*Kaam:* Is range me koi entry nahi.\n\n`;
  }

  if (rangeKharcha.length > 0) {
    msg += `*Kharcha (cut):*\n`;
    for (const k of rangeKharcha) {
      const d = formatShortDate(k.entry_date);
      const desc = k.description ? ` (${k.description})` : "";
      msg += `${d}: Rs. ${formatPKR(Number(k.amount))}${desc}\n`;
    }
    msg += `\n`;
  }

  if (openAdvances.length > 0) {
    msg += `*Advance (open):*\n`;
    for (const a of openAdvances) {
      const bal = advanceRemaining(a);
      if (bal <= 0) continue;
      const d = formatShortDate(a.entry_date);
      const desc = a.description ? ` (${a.description})` : "";
      msg += `${d}: Rs. ${formatPKR(bal)} baaki${desc}\n`;
    }
    msg += `\n`;
  }

  msg += `*Summary:*\n`;
  msg += `Gross (kaam): Rs. ${formatPKR(gross)}\n`;
  if (kharchaTotal > 0) {
    msg += `Kharcha cut:  Rs. ${formatPKR(kharchaTotal)}\n`;
  }
  if (advanceTotal > 0) {
    msg += `Advance baaki: Rs. ${formatPKR(advanceTotal)} (alag se cut)\n`;
  }
  msg += `*Andaza net: Rs. ${formatPKR(estimatedNet)}*\n\n`;
  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}

/** Wage slip style message for a period (paid or unpaid / andaza) */
export function buildKarigarPeriodWageSlipMessage(
  employeeName: string,
  period: { from: string; to: string },
  entries: KarigarWorkEntry[],
  kharchaTotal: number,
  advanceTotal: number,
  otherDeductions: number,
  factoryName?: string,
  paid?: boolean
): string {
  const rangeEntries = entries.filter((e) =>
    inPeriod(e.entry_date, period.from, period.to)
  );
  const { items, gross } = computeWageBreakdown(rangeEntries);
  const net = computeNetPayable(
    gross,
    kharchaTotal,
    advanceTotal,
    otherDeductions
  );
  const slip = buildWageSlipMessage(
    employeeName,
    period,
    items,
    gross,
    otherDeductions,
    net,
    factoryName,
    { kharcha: kharchaTotal, advance: advanceTotal }
  );
  if (paid) return slip;
  return slip.replace("*Net Paid:", "*Andaza Net:");
}

export function buildWageSlipFromPayment(
  employeeName: string,
  payment: WagePayment,
  factoryName?: string
): string {
  const gross = Number(payment.gross_amount);
  const kharcha = Number(payment.kharcha_deduction ?? 0);
  const advance = Number(payment.advance_deduction ?? 0);
  const other = Number(payment.deductions ?? 0);
  const net = Number(payment.net_amount);
  const items: { label: string; amount: number }[] = [];

  const days = Number(payment.total_days ?? 0);
  const pieces = Number(payment.total_units ?? 0);
  const kg = Number(payment.total_hours ?? 0);

  if (days > 0) items.push({ label: `${days} din (dihari)`, amount: gross });
  else if (pieces > 0)
    items.push({ label: `${formatPKR(pieces)} pieces`, amount: gross });
  else if (kg > 0) items.push({ label: `${formatPKR(kg)} kg`, amount: gross });
  else items.push({ label: "Kaam", amount: gross });

  return buildWageSlipMessage(
    employeeName,
    { from: payment.period_start, to: payment.period_end },
    items,
    gross,
    other,
    net,
    factoryName,
    { kharcha, advance }
  );
}

/** All karigars with pending wages — factory-wide list */
export function buildKarigarPendingListMessage(
  karigars: KarigarPendingWage[],
  factoryName?: string
): string {
  const pending = karigars.filter(
    (k) =>
      Number(k.total_pending ?? 0) > 0 ||
      Number(k.total_kharcha ?? 0) > 0 ||
      Number(k.advance_balance ?? 0) > 0
  );

  if (pending.length === 0) {
    return `Sab karigaron ka hisaab clear hai! ✅`;
  }

  const header = factoryName ? `*${factoryName}*\n` : "";
  let msg =
    `${header}` +
    `*👷 Karigar Pending Wages — ${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long" })}*\n\n`;

  pending.forEach((k, i) => {
    const kaam = Number(k.total_pending ?? 0);
    const kharcha = Number(k.total_kharcha ?? 0);
    const adv = Number(k.advance_balance ?? 0);
    const phone = k.phone ? ` | 📞 ${k.phone}` : "";
    msg += `${i + 1}. *${k.name}*${phone}\n`;
    if (kaam > 0) msg += `   Kaam: Rs. ${formatPKR(kaam)}\n`;
    if (kharcha > 0) msg += `   Kharcha: Rs. ${formatPKR(kharcha)}\n`;
    if (adv > 0) msg += `   Advance: Rs. ${formatPKR(adv)}\n`;
    msg += `\n`;
  });

  const totalKaam = pending.reduce((s, k) => s + Number(k.total_pending ?? 0), 0);
  msg += `*Total pending kaam: Rs. ${formatPKR(totalKaam)}*\n\n`;
  msg += `_KarobaarBook se bheja gaya_`;
  return msg;
}
