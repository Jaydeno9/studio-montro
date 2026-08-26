"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
        router.push("/products");
      }

      router.refresh();
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Unable to sign in.");
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
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-[#8b3a34]">{error}</p>}

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
                href="/signup"
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
