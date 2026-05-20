"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col px-5 pb-10 pt-12">
      <div className="flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">KarobaarBook</h1>
        <p className="mt-1 text-sm text-ink-500">
          Apna Karobaar, Digital Register
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email aur password dono daalein.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (err) {
      const msg =
        err.message === "Invalid login credentials"
          ? "Email ya password galat hai."
          : err.message;
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success("Welcome wapas!");
    const next = searchParams.get("redirect") || "/dashboard";
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col px-5 pb-10 pt-12">
      <div className="flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">KarobaarBook</h1>
        <p className="mt-1 text-sm text-ink-500">
          Apna Karobaar, Digital Register
        </p>
      </div>

      <form className="mt-10 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="aap@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={error}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          fullWidth
        >
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Account nahi hai?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand hover:underline"
        >
          Naya account banayein
        </Link>
      </p>
    </div>
  );
}
