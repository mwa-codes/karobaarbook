"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { OWNER_WHATSAPP } from "@/lib/support";

export default function SubscribePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { state, loading: subLoading } = useSubscription(user?.id);
  const router = useRouter();
  const loading = authLoading || subLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!loading && state.isActive) {
      router.replace("/dashboard");
    }
  }, [loading, state.isActive, router]);

  const whatsappMessage = encodeURIComponent(
    `Assalam o Alaikum,\n\nMain KarobaarBook subscribe karna chahta hoon.\n\nMera email: ${user?.email ?? ""}\n\nKripya payment details batayein.`
  );
  const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${whatsappMessage}`;

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white shadow-md">
            K
          </div>
          <h1 className="text-xl font-bold text-ink-900">KarobaarBook</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          {state.status === "suspended" ? (
            <>
              <div className="mb-4 text-center text-4xl">🔒</div>
              <h2 className="text-center text-lg font-bold text-ink-900">
                Account Suspend Hai
              </h2>
              <p className="mt-2 text-center text-sm text-ink-500">
                Aap ka account suspend kar diya gaya hai. Madad ke liye hamare
                se rabta karein.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 text-center text-4xl">⏰</div>
              <h2 className="text-center text-lg font-bold text-ink-900">
                Trial Khatam Ho Gaya
              </h2>
              <p className="mt-2 text-center text-sm text-ink-500">
                Aap ka free trial khatam ho gaya hai. App use karte rehne ke
                liye subscribe karein.
              </p>
            </>
          )}

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border-2 border-brand bg-brand-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-brand-700">Monthly Plan</p>
                  <p className="text-xs text-ink-500">Har mahine</p>
                </div>
                <p className="text-xl font-bold text-brand-700">Rs. 500</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink-900">Annual Plan</p>
                  <p className="text-xs text-lena">2 mahine free!</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-ink-900">Rs. 5,000</p>
                  <p className="text-xs text-ink-500">saal ka</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-ink-900">
              Payment kaise karein:
            </p>
            <p className="mt-1 text-xs text-ink-500">
              JazzCash, EasyPaisa, ya bank transfer. Payment ke baad hamare se
              WhatsApp pe rabta karein — 30 minute mein app activate ho jayegi.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp pe Subscribe Karein
          </a>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="mt-3 w-full text-center text-xs text-ink-500 underline"
          >
            Logout karein
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-ink-500">
          Logged in as {user?.email}
        </p>
      </div>
    </div>
  );
}
