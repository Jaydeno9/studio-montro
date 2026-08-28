"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isPasswordValid } from "@/src/lib/passwordValidation";
import { isValidEmail } from "@/src/lib/emailValidation";
import { AuthField } from "@/src/components/auth/AuthField";
import { AuthMessage } from "@/src/components/auth/AuthMessage";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { PasswordField } from "@/src/components/auth/PasswordField";
import { PasswordRequirements } from "@/src/components/auth/PasswordRequirements";

function getSignupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("already registered") || message.includes("already exists")) return "An account with this email may already exist. Try signing in instead.";
  if (message.includes("rate") || message.includes("too many")) return "Too many attempts. Please try again shortly.";
  return "We couldn't create your account. Please try again.";
}

function getResendErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("rate") || message.includes("too many")) return "Too many resend attempts. Please try again shortly.";
  return "We couldn't resend the verification email. Please try again.";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const emailError =
    signupError === "Enter a valid email address." ? signupError : undefined;
  const passwordError =
    signupError === "Password must meet all four requirements."
      ? signupError
      : undefined;
  const confirmationError =
    signupError === "Passwords do not match." ? signupError : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setSignupError("Enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    if (!isPasswordValid(password)) {
      setSignupError("Password must meet all four requirements.");
      return;
    }

    try {
      setLoading(true);
      setSignupError("");
      setEmail(normalizedEmail);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        },
      });

      if (error) {
        console.error("Signup failed:", error);
        setSignupError(getSignupErrorMessage(error));
        return;
      }

      if (data.session) {
        router.push(returnTo);
        router.refresh();
        return;
      }

      setSignupError("");
      setVerificationSent(true);
    } catch (error) {
      console.error("Signup failed:", error);

      setSignupError(getSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      setResending(true);
      setResendError("");
      setResendMessage("");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        },
      });
      if (error) throw error;
      setResendMessage("A new verification email has been sent.");
    } catch (err) {
      console.error(err);
      setResendError(getResendErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  if (verificationSent) {
    return (
      <AuthShell headline="A considered beginning." description="Confirm your email to keep every saved piece and future selection connected to you.">
        <section className="w-full">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account verification</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Check your inbox.</h1>
          <p className="mt-5 text-sm leading-7 text-[#746c64]">We sent a verification email to <span className="font-medium text-[#25211d]">{email}</span>. Open it to confirm your account.</p>
          {resendMessage && <AuthMessage tone="success">{resendMessage}</AuthMessage>}
          {resendError && <AuthMessage>{resendError}</AuthMessage>}
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm">
            <button type="button" onClick={handleResend} disabled={resending} className="min-h-12 bg-[#25211d] px-5 py-4 text-[#f4f0e9] transition hover:bg-[#39332d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b1f26] disabled:cursor-wait disabled:opacity-50">{resending ? "Sending..." : "Resend email"}</button>
            <Link href={withReturnTo("/login", returnTo)} className="underline decoration-[#aaa097] underline-offset-4">Sign in</Link>
          </div>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell headline="Make it yours." description="Create an account to save pieces you love and keep your cart ready for later.">
      <form onSubmit={handleSubmit} className="w-full">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Your account</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Create account</h1>
        <p className="mt-4 text-sm leading-7 text-[#746c64]">A quiet place for the pieces that feel like yours.</p>

        <div className="mt-8 space-y-5">
          <AuthField id="signup-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" error={emailError} />
          <PasswordField id="signup-password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" error={passwordError} variant="boxed">
            <PasswordRequirements password={password} />
          </PasswordField>
          <PasswordField id="signup-confirm-password" label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat password" error={confirmationError} variant="boxed" />
        </div>

        {signupError && !emailError && !passwordError && !confirmationError && <AuthMessage>{signupError}</AuthMessage>}

        <button type="submit" disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b1f26] disabled:cursor-wait disabled:opacity-50">
          <span>{loading ? "Creating account..." : "Create account"}</span><span aria-hidden="true">→</span>
        </button>

        <div className="mt-6 flex items-center justify-between gap-6 text-sm">
          <p className="text-[#756d65]">Already have an account?</p>
          <Link href={withReturnTo("/login", returnTo)} className="underline decoration-[#aaa097] underline-offset-4 transition hover:text-black">Sign in</Link>
        </div>
        <Link href="/products" className="mt-10 inline-flex items-center gap-2 text-sm text-[#756d65] transition hover:text-[#25211d]">← Back to shop</Link>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
