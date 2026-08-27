"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { authFetch } from "@/src/lib/authFetch";

type CTAState = "loading" | "guest" | "first-order" | "member";

type OrderSummary = {
  id: string;
};

type EditorialCTAProps = {
  imageSrc?: string;
  imageAlt?: string;
  tone?: "green" | "wine";
  className?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TONES = {
  green: {
    background: "bg-[#536d5d]",
    button: "bg-[#f4efe7] text-[#31463a] hover:bg-white",
    eyebrow: "text-[#e8dfd4]/70",
    body: "text-[#f4efe7]/78",
  },
  wine: {
    background: "bg-[#4b1f26]",
    button: "bg-[#f4efe7] text-[#4b1f26] hover:bg-white",
    eyebrow: "text-[#f4efe7]/65",
    body: "text-[#f4efe7]/78",
  },
};

export default function EditorialCTA({
  imageSrc = "/cta.webp",
  imageAlt = "Studio MONTRO interior",
  tone = "green",
  className = "",
}: EditorialCTAProps) {
  const [state, setState] = useState<CTAState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function resolveState() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (!session?.user) {
          setState("guest");
          return;
        }

        const response = await authFetch(`${API_URL}/orders`);
        const data = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok || !Array.isArray(data)) {
          // If order history cannot be verified, do not promise
          // a first-order benefit that may not be valid.
          setState("member");
          return;
        }

        const orders = data as OrderSummary[];

        setState(orders.length === 0 ? "first-order" : "member");
      } catch (error) {
        console.error("Unable to resolve CTA state:", error);

        if (!cancelled) {
          setState("guest");
        }
      }
    }

    void resolveState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolveState();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const toneClasses = TONES[tone];

  return (
    <section
      className={`bg-[#f4f0e9] px-4 py-10 md:px-6 md:py-14 lg:px-8 lg:py-16 ${className}`}
    >
      <div className="overflow-hidden rounded-[26px] md:grid md:min-h-[350px] md:grid-cols-[0.95fr_2.05fr] lg:min-h-[390px]">
        <div className="relative min-h-[260px] overflow-hidden md:min-h-full">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 34vw"
            className="object-cover transition-transform duration-[1200ms] hover:scale-[1.025]"
          />
        </div>

        <div
          className={`flex items-center px-7 py-10 md:px-12 md:py-12 lg:px-16 ${toneClasses.background}`}
        >
          {state === "loading" ? (
            <LoadingState />
          ) : state === "guest" ? (
            <GuestContent toneClasses={toneClasses} />
          ) : state === "first-order" ? (
            <FirstOrderContent toneClasses={toneClasses} />
          ) : (
            <MemberContent toneClasses={toneClasses} />
          )}
        </div>
      </div>
    </section>
  );
}

function GuestContent({
  toneClasses,
}: {
  toneClasses: (typeof TONES)[keyof typeof TONES];
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={`text-[10px] uppercase tracking-[0.17em] ${toneClasses.eyebrow}`}
      >
        Studio MONTRO
      </p>

      <h2 className="mt-5 max-w-2xl text-4xl font-normal leading-[1.02] tracking-[-0.04em] md:text-5xl lg:text-[56px]">
        <span className="text-[#f4efe7]">
          A quieter way to discover your space.
        </span>
      </h2>

      <p
        className={`mt-5 max-w-xl text-sm leading-7 md:text-[15px] ${toneClasses.body}`}
      >
        Create an account to save pieces, keep track of orders and return to the
        things that caught your eye.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Link
          href="/signup"
          className={`inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition ${toneClasses.button}`}
        >
          Create an account
          <span>→</span>
        </Link>

        <Link
          href="/login"
          className="text-sm text-[#f4efe7]/75 underline decoration-[#f4efe7]/35 underline-offset-4 transition hover:text-[#f4efe7]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

function FirstOrderContent({
  toneClasses,
}: {
  toneClasses: (typeof TONES)[keyof typeof TONES];
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={`text-[10px] uppercase tracking-[0.17em] ${toneClasses.eyebrow}`}
      >
        A welcome from the studio
      </p>

      <h2 className="mt-5 max-w-2xl text-4xl font-normal leading-[1.02] tracking-[-0.04em] md:text-5xl lg:text-[56px]">
        <span className="text-[#f4efe7]">
          Your first order comes with a little something.
        </span>
      </h2>

      <p
        className={`mt-5 max-w-xl text-sm leading-7 md:text-[15px] ${toneClasses.body}`}
      >
        A complimentary Studio MONTRO gift will be included with your first
        order — no code, no discount mechanics, just a small welcome from us.
      </p>

      <Link
        href="/products"
        className={`mt-8 inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition ${toneClasses.button}`}
      >
        Explore the collection
        <span>→</span>
      </Link>
    </div>
  );
}

function MemberContent({
  toneClasses,
}: {
  toneClasses: (typeof TONES)[keyof typeof TONES];
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={`text-[10px] uppercase tracking-[0.17em] ${toneClasses.eyebrow}`}
      >
        Back in the studio
      </p>

      <h2 className="mt-5 max-w-2xl text-4xl font-normal leading-[1.02] tracking-[-0.04em] md:text-5xl lg:text-[56px]">
        <span className="text-[#f4efe7]">
          There is always another piece to notice.
        </span>
      </h2>

      <p
        className={`mt-5 max-w-xl text-sm leading-7 md:text-[15px] ${toneClasses.body}`}
      >
        Return to saved pieces, explore what is new, or find something that
        changes the feeling of a room.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Link
          href="/products"
          className={`inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition ${toneClasses.button}`}
        >
          Explore pieces
          <span>→</span>
        </Link>

        <Link
          href="/saved"
          className="text-sm text-[#f4efe7]/75 underline decoration-[#f4efe7]/35 underline-offset-4 transition hover:text-[#f4efe7]"
        >
          View saved
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="w-full max-w-2xl">
      <div className="h-3 w-28 animate-pulse rounded-full bg-white/15" />
      <div className="mt-6 h-12 w-4/5 animate-pulse rounded bg-white/12" />
      <div className="mt-3 h-12 w-2/3 animate-pulse rounded bg-white/12" />
      <div className="mt-7 h-11 w-40 animate-pulse rounded-full bg-white/15" />
    </div>
  );
}
