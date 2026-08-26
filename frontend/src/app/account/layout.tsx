"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/src/lib/supabase";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authState, setAuthState] = useState<
    "loading" | "authenticated" | "guest"
  >("loading");

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      async function checkSession() {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        setAuthState(session ? "authenticated" : "guest");
      }

      void checkSession();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!active) {
          return;
        }

        setAuthState(session ? "authenticated" : "guest");
      }, 0);
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  if (authState === "loading") {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-32 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Loading your account...</p>
      </main>
    );
  }

  if (authState === "guest") {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-32 text-[#25211d]">
        <header className="border-b border-[#cec6bc] pb-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
            My account
          </p>

          <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Sign in to continue.
          </p>
        </header>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[460px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Your account keeps everything together.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Log in or create an account to view orders, manage delivery
              addresses, update your profile and follow payment or refund
              activity.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="bg-[#765149] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="bg-[#5f6f59] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                Create account
              </Link>
            </div>

            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-2 text-sm text-[#6f675f] underline decoration-[#aaa198] underline-offset-4"
            >
              Continue browsing
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
