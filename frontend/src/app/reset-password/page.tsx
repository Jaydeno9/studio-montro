"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { isPasswordValid } from "@/src/lib/passwordValidation";
import { AuthMessage } from "@/src/components/auth/AuthMessage";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { PasswordField } from "@/src/components/auth/PasswordField";
import { PasswordRequirements } from "@/src/components/auth/PasswordRequirements";

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
  const passwordError =
    error === "Password must meet all four requirements." ? error : undefined;
  const confirmationError =
    error === "Passwords do not match." ? error : undefined;

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
      <AuthShell headline="A secure return." description="We’re carefully checking your recovery link before you choose a new password.">
        <section className="w-full" aria-live="polite">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account recovery</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Checking reset link...</h1>
          <AuthMessage tone="neutral">This will only take a moment.</AuthMessage>
        </section>
      </AuthShell>
    );
  if (status === "invalid")
    return (
      <AuthShell headline="A secure return." description="Expired links keep your account protected. Request a fresh link to continue.">
        <section className="w-full">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account recovery</p>
          <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.04em] text-[#4b1f26]">This reset link is invalid or has expired.</h1>
          <Link href={withReturnTo("/forgot-password", returnTo)} className="mt-8 inline-block text-sm underline decoration-[#aaa097] underline-offset-4">Request a new reset link</Link>
        </section>
      </AuthShell>
    );
  if (status === "success")
    return (
      <AuthShell headline="A secure return." description="Your account is ready for the spaces, objects and ideas you’ve collected.">
        <section className="w-full" aria-live="polite">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account recovery</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Password updated.</h1>
          <AuthMessage tone="success">Taking you back securely...</AuthMessage>
        </section>
      </AuthShell>
    );
  return (
    <AuthShell headline="A secure return." description="Choose a new password, then return to the pieces and spaces that inspired you.">
      <section className="w-full">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">Account recovery</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">Choose a new password.</h1>
        <p className="mt-4 text-sm leading-7 text-[#746c64]">Use a password that meets each requirement below.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <PasswordField id="reset-password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" error={passwordError} variant="boxed">
            <PasswordRequirements password={password} />
          </PasswordField>
          <PasswordField id="reset-confirm-password" label="Confirm password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Repeat password" error={confirmationError} variant="boxed" />
          {error && !passwordError && !confirmationError && <AuthMessage>{error}</AuthMessage>}
          <button type="submit" disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b1f26] disabled:cursor-wait disabled:opacity-50">
            <span>{loading ? "Updating..." : "Update password"}</span><span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
