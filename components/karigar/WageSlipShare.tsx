"use client";

import { Button } from "@/components/ui/Button";
import { buildWageSlipMessage, openWhatsApp } from "@/lib/whatsapp";
import type { WageBreakdownItem } from "@/lib/karigar";

export function WageSlipShare({
  employeeName,
  phone,
  period,
  breakdown,
  gross,
  deductions,
  net,
  kharcha = 0,
  advance = 0,
  factoryName,
}: {
  employeeName: string;
  phone?: string | null;
  period: { from: string; to: string };
  breakdown: WageBreakdownItem[];
  gross: number;
  deductions: number;
  net: number;
  kharcha?: number;
  advance?: number;
  factoryName?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      className="mt-3 border border-[#25D366]/30 bg-[#25D366]/5 text-[#128C7E]"
      onClick={() => {
        const msg = buildWageSlipMessage(
          employeeName,
          period,
          breakdown,
          gross,
          deductions,
          net,
          factoryName,
          { kharcha, advance }
        );
        openWhatsApp(msg, phone ?? undefined);
      }}
    >
      📲 WhatsApp pe Wage Slip Bhejein
    </Button>
  );
}
