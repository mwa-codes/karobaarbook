"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function EmailConfirmedPage() {
  return (
    <Suspense fallback={<ConfirmedFallback />}>
      <ConfirmedContent />
    </Suspense>
  );
}

function ConfirmedFallback() {
  return (
    <div className="min-h-[100dvh] bg-page safe-top">
      <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col items-center justify-center px-5 pb-10 pt-12 text-center">
        <Logo size={64} />
      </div>
    </div>
  );
}

function ConfirmedContent() {
  const searchParams = useSearchParams();
  const failed = searchParams.get("error") === "1";

  return (
    <div className="min-h-[100dvh] bg-page safe-top">
      <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col items-center justify-center px-5 pb-10 pt-12 text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">KarobaarBook</h1>

        {failed ? (
          <>
            <p className="mt-6 text-base font-semibold text-red-600">
              Verification nahi ho saki
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Link expire ho chuka hai ya pehle use ho chuka hai. Dobara register
              karein ya login se naya confirmation email mangwayein.
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
              <Link href="/register">
                <Button variant="primary" size="lg" fullWidth>
                  Register dubara
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" fullWidth>
                  Login
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div
              className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
              aria-hidden
            >
              ✓
            </div>
            <p className="mt-4 text-lg font-semibold text-ink-900">
              Email verify ho gaya!
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Aapka KarobaarBook account tayyar hai. Ab login karke apna digital
              register shuru karein.
            </p>
            <div className="mt-8 w-full max-w-xs">
              <Link href="/login">
                <Button variant="primary" size="lg" fullWidth>
                  Login karein
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
