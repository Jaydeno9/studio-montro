"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyAdminAccess } from "@/src/lib/adminAuth";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isValidEmail } from "@/src/lib/emailValidation";
import { AuthField } from "@/src/components/auth/AuthField";
import { AuthMessage } from "@/src/components/auth/AuthMessage";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { PasswordField } from "@/src/components/auth/PasswordField";

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials"))
    return "Incorrect email or password.";
  if (message.includes("email not confirmed"))
    return "Please verify your email before signing in.";
  if (message.includes("rate") || message.includes("too many"))
    return "Too many attempts. Please try again shortly.";
  return "We couldn't sign you in. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const callbackError =
    searchParams.get("authError") === "callback_failed"
      ? "We couldn't verify that sign-in link. Please try signing in again."
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      let isAdmin = false;

      try {
        isAdmin = await verifyAdminAccess(data.session.access_token);
      } catch (adminCheckError) {
        console.error("Admin access check failed:", adminCheckError);
      }

      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.push(returnTo);
      }

      router.refresh();
    } catch (err) {
      console.error(err);

      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline="Welcome back."
      description="Sign in to save pieces, manage your cart and continue your Studio MONTRO experience."
    >
      <form onSubmit={handleSubmit} className="w-full">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Your account</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Sign in</h1>
        <p className="mt-4 text-sm leading-7 text-[#746c64]">Welcome back to your considered collection.</p>

        <div className="mt-8 space-y-5">
          <AuthField id="login-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" error={emailError} />
          <PasswordField id="login-password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Your password" variant="boxed">
            <Link href={withReturnTo("/forgot-password", returnTo)} className="mt-3 inline-block text-xs underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]">Forgot password?</Link>
          </PasswordField>
        </div>

        {((error && !emailError) || callbackError) && <AuthMessage>{(error && !emailError ? error : "") || callbackError}</AuthMessage>}

        <button type="submit" disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b1f26] disabled:cursor-wait disabled:opacity-50">
          <span>{loading ? "Signing in..." : "Sign in"}</span><span aria-hidden="true">→</span>
        </button>

        <div className="mt-6 flex items-center justify-between gap-6 text-sm">
          <p className="text-[#756d65]">New to Studio MONTRO?</p>
          <Link href={withReturnTo("/signup", returnTo)} className="underline decoration-[#aaa097] underline-offset-4 transition hover:text-black">Create account</Link>
        </div>
        <Link href="/products" className="mt-10 inline-flex items-center gap-2 text-sm text-[#756d65] transition hover:text-[#25211d]">← Back to shop</Link>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
