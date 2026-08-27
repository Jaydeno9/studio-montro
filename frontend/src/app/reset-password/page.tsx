"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import {
  getPasswordChecks,
  isPasswordValid,
} from "@/src/lib/passwordValidation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"), "/login");
  const [status, setStatus] = useState<
    "checking" | "ready" | "invalid" | "success"
  >("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const checks = getPasswordChecks(password);

  useEffect(() => {
    let active = true;
    const recoveryLink =
      window.location.hash.includes("type=recovery") ||
      searchParams.get("type") === "recovery" ||
      searchParams.has("code");
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (active && event === "PASSWORD_RECOVERY" && session)
          setStatus("ready");
      },
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (recoveryLink && data.session) setStatus("ready");
      else
        window.setTimeout(
          () =>
            active &&
            setStatus((current) =>
              current === "checking" ? "invalid" : current,
            ),
          800,
        );
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPasswordValid(password))
      return setError("Password must meet all four requirements.");
    if (password !== confirmation) return setError("Passwords do not match.");

    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      window.setTimeout(() => {
        router.push(returnTo);
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(
        "We couldn't update your password. The reset link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking")
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pt-24 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Checking reset link...</p>
      </main>
    );
  if (status === "invalid")
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pt-24 text-[#25211d]">
        <h1 className="text-4xl font-medium tracking-[-0.04em]">
          <span className="text-[#4b1f26]">
            This reset link is invalid or has expired.
          </span>
        </h1>
        <Link
          href={withReturnTo("/forgot-password", returnTo)}
          className="mt-8 inline-block text-sm underline underline-offset-4"
        >
          Request a new reset link
        </Link>
      </main>
    );
  if (status === "success")
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pt-24 text-[#25211d]">
        <h1 className="text-4xl font-medium tracking-[-0.04em]">
          <span className="text-[#4b1f26]">Password updated.</span>
        </h1>
        <p className="mt-5 text-sm text-[#746c64]">
          Taking you back securely...
        </p>
      </main>
    );

  const items = [
    ["8+ characters", checks.minLength],
    ["Uppercase letter", checks.uppercase],
    ["Lowercase letter", checks.lowercase],
    ["Number", checks.number],
  ] as const;
  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-24 text-[#25211d]">
      <div className="mx-auto flex min-h-[70vh] max-w-[620px] items-center">
        <section className="w-full">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">
            Studio MONTRO
          </p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.045em]">
            <span className="text-[#4b1f26]">Choose a new password.</span>
          </h1>
          <form onSubmit={handleSubmit} className="mt-10 max-w-[460px]">
            <label className="block border-t border-[#cec6bc] py-6">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">
                New password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-3 w-full bg-transparent text-base outline-none"
              />
            </label>
            <ul className="grid grid-cols-2 gap-2 border-b border-[#cec6bc] pb-6 text-xs text-[#857c73]">
              {items.map(([label, passed]) => (
                <li
                  key={label}
                  className={passed ? "text-[#5f6757]" : undefined}
                >
                  {passed ? "✓" : "○"} {label}
                </li>
              ))}
            </ul>
            <label className="block border-b border-[#cec6bc] py-6">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">
                Confirm password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-3 w-full bg-transparent text-base outline-none"
              />
            </label>
            {error && <p className="mt-4 text-sm text-[#8b3a34]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] disabled:cursor-wait disabled:opacity-50"
            >
              <span>{loading ? "Updating..." : "Update password"}</span>
              <span>→</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
