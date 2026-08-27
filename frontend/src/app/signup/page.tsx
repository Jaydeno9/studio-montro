"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { getPasswordChecks, isPasswordValid } from "@/src/lib/passwordValidation";
import { isValidEmail } from "@/src/lib/emailValidation";

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

function PasswordChecklist({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const items = [
    ["8+ characters", checks.minLength],
    ["Uppercase letter", checks.uppercase],
    ["Lowercase letter", checks.lowercase],
    ["Number", checks.number],
  ] as const;

  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#857c73]">
      {items.map(([label, passed]) => (
        <li key={label} className={passed ? "text-[#5f6757]" : undefined}>
          {passed ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
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
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-24 text-[#25211d]">
        <div className="mx-auto flex min-h-[70vh] max-w-[620px] items-center">
          <section className="w-full border-y border-[#cec6bc] py-10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Studio MONTRO</p>
            <h1 className="mt-5 text-5xl font-medium tracking-[-0.045em]"><span className="text-[#4b1f26]">Check your inbox.</span></h1>
            <p className="mt-6 text-sm leading-7 text-[#746c64]">We sent a verification email to <span className="font-medium text-[#25211d]">{email}</span>. Open it to confirm your account.</p>
            {resendMessage && <p className="mt-4 text-sm text-[#5f6757]">{resendMessage}</p>}
            {resendError && <p className="mt-4 text-sm text-[#8b3a34]">{resendError}</p>}
            <div className="mt-8 flex items-center gap-6 text-sm">
              <button type="button" onClick={handleResend} disabled={resending} className="bg-[#25211d] px-5 py-4 text-[#f4f0e9] disabled:cursor-wait disabled:opacity-50">
                {resending ? "Sending..." : "Resend email"}
              </button>
              <Link href={withReturnTo("/login", returnTo)} className="underline decoration-[#aaa097] underline-offset-4">Sign in</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-24 text-[#25211d]">
      <div className="grid min-h-[70vh] items-center gap-16 lg:grid-cols-2">
        <section>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">
            Studio MONTRO
          </p>

          <p className="mt-5 max-w-[600px] text-5xl font-medium leading-[0.98] tracking-[-0.045em] md:text-7xl">
            Make it yours.
          </p>

          <p className="mt-6 max-w-[430px] text-sm leading-7 text-[#746c64]">
            Create an account to save pieces you love and keep your cart ready
            for later.
          </p>
        </section>

        <section className="lg:flex lg:justify-end">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[460px]"
          >
            <div className="border-b border-[#cec6bc] pb-6">
              <p className="text-2xl font-medium tracking-[-0.025em]">
                Create account
              </p>
            </div>

            <div className="border-b border-[#cec6bc] py-6">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">
                  Email
                </span>

                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-3 w-full bg-transparent text-base outline-none placeholder:text-[#a19890]"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <div className="border-b border-[#cec6bc] py-6">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">
                  Password
                </span>

                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-3 w-full bg-transparent text-base outline-none placeholder:text-[#a19890]"
                  placeholder="At least 8 characters"
                />
                <PasswordChecklist password={password} />
              </label>
            </div>

            <div className="border-b border-[#cec6bc] py-6">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">
                  Confirm password
                </span>

                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="mt-3 w-full bg-transparent text-base outline-none placeholder:text-[#a19890]"
                  placeholder="Repeat password"
                />
              </label>
            </div>

            {signupError && (
              <p className="mt-4 text-sm text-[#8b3a34]">
                {signupError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-50"
            >
              <span>
                {loading ? "Creating account..." : "Create account"}
              </span>
              <span>→</span>
            </button>

            <div className="mt-6 flex items-center justify-between gap-6 text-sm">
              <p className="text-[#756d65]">
                Already have an account?
              </p>

              <Link
                href={withReturnTo("/login", returnTo)}
                className="underline decoration-[#aaa097] underline-offset-4 transition hover:text-black"
              >
                Sign in
              </Link>
            </div>

            <Link
              href="/products"
              className="mt-10 inline-flex items-center gap-2 text-sm text-[#756d65] transition hover:text-[#25211d]"
            >
              ← Back to shop
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
