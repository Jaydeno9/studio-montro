"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthMessage } from "@/src/components/auth/AuthMessage";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { getSafeReturnTo, withReturnTo } from "@/src/lib/authRedirect";
import { supabase } from "@/src/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const code = searchParams.get("code");
  const hasCallbackError =
    searchParams.has("error") ||
    searchParams.has("error_code") ||
    searchParams.has("error_description");
  const exchangeStarted = useRef(false);
  const [failed, setFailed] = useState(!code || hasCallbackError);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    function cleanCallbackUrl() {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("code");
      cleanUrl.searchParams.delete("error");
      cleanUrl.searchParams.delete("error_code");
      cleanUrl.searchParams.delete("error_description");
      window.history.replaceState(
        window.history.state,
        "",
        `${cleanUrl.pathname}${cleanUrl.search}`,
      );
    }

    if (!code || hasCallbackError) {
      cleanCallbackUrl();
      return;
    }

    async function completeCallback(authCode: string) {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(authCode);

        if (error || !data.session) {
          setFailed(true);
          return;
        }

        router.replace(returnTo);
        router.refresh();
      } catch {
        setFailed(true);
      } finally {
        cleanCallbackUrl();
      }
    }

    void completeCallback(code);
  }, [code, hasCallbackError, returnTo, router, searchParams]);

  if (failed) {
    return (
      <AuthShell
        headline="A secure return."
        description="This sign-in link could not be completed. You can return to sign in and try again."
      >
        <section className="w-full" aria-live="polite">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">
            Account confirmation
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.04em] text-[#4b1f26]">
            We couldn&apos;t complete this sign-in.
          </h1>
          <AuthMessage>
            This link may be invalid or expired. Please sign in or request a
            new link.
          </AuthMessage>
          <Link
            href={withReturnTo("/login", returnTo)}
            className="mt-8 inline-block text-sm underline decoration-[#aaa097] underline-offset-4"
          >
            Return to sign in
          </Link>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      headline="A secure return."
      description="We’re carefully completing your Studio MONTRO sign-in."
    >
      <section className="w-full" aria-live="polite">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#857c73]">
          Account confirmation
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-[#4b1f26]">
          Confirming your account...
        </h1>
        <AuthMessage tone="neutral">This will only take a moment.</AuthMessage>
      </section>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
