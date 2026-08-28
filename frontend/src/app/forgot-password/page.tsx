"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isValidEmail } from "@/src/lib/emailValidation";
import { AuthField } from "@/src/components/auth/AuthField";
import { AuthMessage } from "@/src/components/auth/AuthMessage";
import { AuthShell } from "@/src/components/auth/AuthShell";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const emailError =
    error === "Enter a valid email address." ? error : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const resetUrl = new URL("/reset-password", window.location.origin);
      resetUrl.searchParams.set("returnTo", returnTo);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resetUrl.toString(),
      });
      if (error) console.error(error);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  return (
    <AuthShell headline="Find your way back." description="A considered home should be easy to return to. We’ll help you restore access securely.">
      <section className="w-full">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account recovery</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.02] tracking-[-0.04em] text-[#4b1f26]">Forgot your password?</h1>
        <p className="mt-4 text-sm leading-7 text-[#746c64]">Enter your email and we’ll send instructions for choosing a new password.</p>

        {submitted ? (
          <div className="mt-8 border-y border-[#cec6bc] py-6">
            <AuthMessage tone="success">If an account exists for that email, we’ve sent password reset instructions.</AuthMessage>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <AuthField id="recovery-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" error={emailError} />
            {error && !emailError && <AuthMessage>{error}</AuthMessage>}
            <button type="submit" disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b1f26] disabled:cursor-wait disabled:opacity-50">
              <span>{loading ? "Sending..." : "Send reset instructions"}</span><span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        <Link href={withReturnTo("/login", returnTo)} className="mt-8 inline-flex text-sm underline decoration-[#aaa097] underline-offset-4">← Back to sign in</Link>
      </section>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>;
}
