"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyAdminAccess } from "@/src/lib/adminAuth";
import { supabase } from "@/src/lib/supabase";

const ACCESS_DENIED_MESSAGE = "This account does not have admin access.";
const SESSION_EXPIRED_MESSAGE =
  "Your admin session expired. Please sign in again.";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("access") === "denied"
      ? ACCESS_DENIED_MESSAGE
      : searchParams.get("reason") === "session_expired"
        ? SESSION_EXPIRED_MESSAGE
        : "",
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    try {
      const isAdmin = await verifyAdminAccess(data.session.access_token);

      if (!isAdmin) {
        await supabase.auth.signOut({ scope: "local" });
        setMessage(ACCESS_DENIED_MESSAGE);
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      setMessage("We couldn't verify admin access. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="mb-2 text-sm uppercase tracking-[0.25em]">
          Studio Montro
        </p>

        <h1 className="text-4xl mb-8">
              <span className="text-[#50250a]">Admin Login</span>
            </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full border border-black/20 bg-transparent px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-2 text-sm">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full border border-black/20 bg-transparent px-4 py-3 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#50250a] px-4 py-3 text-[#f5f1e8] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
