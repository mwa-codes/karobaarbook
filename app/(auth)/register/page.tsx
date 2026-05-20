"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Naam zaroori hai.";
    if (!email.trim()) newErrors.email = "Email zaroori hai.";
    if (password.length < 6)
      newErrors.password = "Password kam se kam 6 digits ka ho.";
    if (password !== confirm) newErrors.confirm = "Dono passwords match nahi karte.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          factory_name: factoryName.trim() || null,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account ban gaya. Welcome!");
      router.replace("/dashboard");
      router.refresh();
    } else {
      toast.success("Account ban gaya. Email confirm karein.");
      router.replace("/login");
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col px-5 pb-10 pt-10">
      <div className="flex flex-col items-center text-center">
        <Logo size={56} />
        <h1 className="mt-3 text-2xl font-bold text-ink-900">Account banayein</h1>
        <p className="mt-1 text-sm text-ink-500">
          Apne factory ke liye digital register
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Aapka naam"
          autoComplete="name"
          placeholder="e.g. Ali Khan"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          required
        />
        <Input
          label="Factory ka naam (optional)"
          placeholder="e.g. Khan Steel Works"
          value={factoryName}
          onChange={(e) => setFactoryName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="aap@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="6+ digits"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Password confirm karein"
          type="password"
          autoComplete="new-password"
          placeholder="Wohi password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          fullWidth
        >
          Register
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Pehle se account hai?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand hover:underline"
        >
          Login karein
        </Link>
      </p>
    </div>
  );
}
