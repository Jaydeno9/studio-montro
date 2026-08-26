"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type AuthPromptDetail = {
  title: string;
  message: string;
  loginHref?: string;
  signupHref?: string;
};

const EVENT_NAME = "montro:auth-required";

export function requestAuthPrompt(detail: AuthPromptDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthPromptDetail>(EVENT_NAME, {
      detail,
    }),
  );
}

export default function AuthRequiredPrompt() {
  const [prompt, setPrompt] = useState<AuthPromptDetail | null>(null);

  useEffect(() => {
    function handleAuthRequired(event: Event) {
      const customEvent = event as CustomEvent<AuthPromptDetail>;

      setPrompt(customEvent.detail);
    }

    window.addEventListener(EVENT_NAME, handleAuthRequired);

    return () => {
      window.removeEventListener(EVENT_NAME, handleAuthRequired);
    };
  }, []);

  if (!prompt) {
    return null;
  }

  const loginHref = prompt.loginHref ?? "/login";
  const signupHref = prompt.signupHref ?? "/signup";

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-[#25211d]/30 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
    >
      <button
        type="button"
        aria-label="Close sign in prompt"
        onClick={() => setPrompt(null)}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-[430px] border border-[#b9afa5] bg-[#f4f0e9] p-7 shadow-[0_26px_90px_rgba(37,33,29,0.2)]">
        <button
          type="button"
          onClick={() => setPrompt(null)}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-2xl font-light text-[#7c736b] transition hover:text-[#25211d]"
        >
          ×
        </button>

        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Studio MONTRO
        </p>

        <p
          id="auth-required-title"
          className="mt-4 pr-10 text-2xl font-medium tracking-[-0.03em]"
        >
          {prompt.title}
        </p>

        <p className="mt-3 text-sm leading-7 text-[#756d65]">
          {prompt.message}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={loginHref}
            onClick={() => setPrompt(null)}
            className="flex items-center justify-center border border-[#765149] bg-[#765149] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
          >
            Log in
          </Link>

          <Link
            href={signupHref}
            onClick={() => setPrompt(null)}
            className="flex items-center justify-center border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
          >
            Create account
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setPrompt(null)}
          className="mt-4 w-full text-xs text-[#817870] underline decoration-[#aaa198] underline-offset-4"
        >
          Continue browsing
        </button>
      </div>
    </div>
  );
}
