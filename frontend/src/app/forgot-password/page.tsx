"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isValidEmail } from "@/src/lib/emailValidation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-24 text-[#25211d]">
      <div className="mx-auto flex min-h-[70vh] max-w-[620px] items-center">
        <section className="w-full">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Studio MONTRO</p>
          <h1 className="mt-5 text-5xl font-medium leading-[0.98] tracking-[-0.045em]"><span className="text-[#4b1f26]">Forgot your password?</span></h1>
          <p className="mt-6 max-w-[500px] text-sm leading-7 text-[#746c64]">Enter your email and we’ll send instructions for choosing a new password.</p>

          {submitted ? (
            <div className="mt-10 border-y border-[#cec6bc] py-8">
              <p className="text-sm leading-7 text-[#5f6757]">If an account exists for that email, we’ve sent password reset instructions.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 max-w-[460px]">
              <label className="block border-y border-[#cec6bc] py-6">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-3 w-full bg-transparent text-base outline-none placeholder:text-[#a19890]" placeholder="you@example.com" />
              </label>
              {error && <p className="mt-4 text-sm text-[#8b3a34]">{error}</p>}
              <button type="submit" disabled={loading} className="mt-7 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] disabled:cursor-wait disabled:opacity-50">
                <span>{loading ? "Sending..." : "Send reset instructions"}</span><span>→</span>
              </button>
            </form>
          )}

          <Link href={withReturnTo("/login", returnTo)} className="mt-8 inline-flex text-sm underline decoration-[#aaa097] underline-offset-4">← Back to sign in</Link>
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>;
}
