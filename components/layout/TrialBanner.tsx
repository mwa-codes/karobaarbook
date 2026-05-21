"use client";

import { useState } from "react";
import { OWNER_WHATSAPP } from "@/lib/support";
import type { SubscriptionState } from "@/types/subscription";

interface TrialBannerProps {
  state: SubscriptionState;
}

export function TrialBanner({ state }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!state.isTrialing || state.daysLeft > 7 || dismissed) return null;

  const whatsappMsg = encodeURIComponent(
    "Assalam o Alaikum, KarobaarBook subscribe karna chahta hoon. Payment details batayein."
  );

  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <span className="text-base">⏰</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-amber-800">
          {state.daysLeft === 0
            ? "Aaj trial khatam ho raha hai!"
            : `Trial mein ${state.daysLeft} din baaki hain`}
        </p>
        <a
          href={`https://wa.me/${OWNER_WHATSAPP}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-amber-700 underline"
        >
          Subscribe karein →
        </a>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
