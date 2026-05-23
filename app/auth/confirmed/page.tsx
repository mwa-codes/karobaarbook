"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "success" | "error" | "check_login";

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
        <p className="mt-6 text-sm text-ink-500">Verification check ho rahi hai…</p>
      </div>
    </div>
  );
}

function ConfirmedContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!cancelled && !error) {
            window.history.replaceState(null, "", "/auth/confirmed");
            setStatus("success");
            return;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session) {
        setStatus("success");
        return;
      }

      if (searchParams.get("hint") === "check_login") {
        if (!cancelled) setStatus("check_login");
        return;
      }

      if (searchParams.get("error") === "1") {
        if (!cancelled) setStatus("error");
        return;
      }

      if (!cancelled) setStatus("check_login");
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-[100dvh] bg-page safe-top">
      <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col items-center justify-center px-5 pb-10 pt-12 text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">KarobaarBook</h1>

        {status === "loading" && (
          <p className="mt-6 text-sm text-ink-500">Verification check ho rahi hai…</p>
        )}

        {status === "error" && (
          <>
            <p className="mt-6 text-base font-semibold text-red-600">
              Link theek se kaam nahi kiya
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Link expire ho sakta hai. Pehle <strong>Login</strong> try karein — agar
              login ho jaye to email pehle hi verify ho chuka hai.
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
              <Link href="/login">
                <Button variant="primary" size="lg" fullWidth>
                  Login karein
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary" size="lg" fullWidth>
                  Register dubara
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === "check_login" && (
          <>
            <div
              className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
              aria-hidden
            >
              ✓
            </div>
            <p className="mt-4 text-lg font-semibold text-ink-900">
              Email verify ho gaya lagta hai
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Ab login karein. Agar password yaad hai to seedha dashboard par ja
              sakte hain.
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

        {status === "success" && (
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
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
              <Link href="/login">
                <Button variant="primary" size="lg" fullWidth>
                  Login karein
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" fullWidth>
                  Dashboard
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
