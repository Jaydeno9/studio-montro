"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isValidEmail } from "@/src/lib/emailValidation";

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

      const userId = data.user.id;

      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(profileError);
      }

      if (profile?.is_admin) {
        router.push("/admin/products");
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
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-24 text-[#25211d]">
      <div className="grid min-h-[70vh] items-center gap-16 lg:grid-cols-2">
        <section>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">
            Studio MONTRO
          </p>

          <p className="mt-5 max-w-[580px] text-5xl font-medium leading-[0.98] tracking-[-0.045em] md:text-7xl">
            Welcome back.
          </p>

          <p className="mt-6 max-w-[430px] text-sm leading-7 text-[#746c64]">
            Sign in to save pieces, manage your cart and continue your Studio
            MONTRO experience.
          </p>
        </section>

        <section className="lg:flex lg:justify-end">
          <form onSubmit={handleSubmit} className="w-full max-w-[460px]">
            <div className="border-b border-[#cec6bc] pb-6">
              <p className="text-2xl font-medium tracking-[-0.025em]">
                Sign in
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
                  className="mt-3 w-full bg-transparent text-base text-[#25211d] outline-none placeholder:text-[#a19890]"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-3 w-full bg-transparent text-base text-[#25211d] outline-none placeholder:text-[#a19890]"
                  placeholder="Your password"
                />

                <Link
                  href={withReturnTo("/forgot-password", returnTo)}
                  className="mt-3 inline-block text-sm underline decoration-[#aaa097] underline-offset-4 transition hover:text-black"
                >
                  Forgot password?
                </Link>
              </label>
            </div>

            {(error || callbackError) && (
              <p className="mt-4 text-sm text-[#8b3a34]">
                {error || callbackError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <span>→</span>
            </button>

            <div className="mt-6 flex items-center justify-between gap-6 text-sm">
              <p className="text-[#756d65]">New to Studio MONTRO?</p>

              <Link
                href={withReturnTo("/signup", returnTo)}
                className="underline decoration-[#aaa097] underline-offset-4 transition hover:text-black"
              >
                Create account
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
