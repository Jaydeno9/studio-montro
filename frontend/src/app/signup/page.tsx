"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.push("/products");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account before signing in.",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account.",
      );
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
                  placeholder="At least 6 characters"
                />
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

            {error && (
              <p className="mt-4 text-sm text-[#8b3a34]">
                {error}
              </p>
            )}

            {message && (
              <p className="mt-4 text-sm leading-6 text-[#5f6757]">
                {message}
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
                href="/login"
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