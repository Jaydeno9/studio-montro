"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/src/lib/supabase";

const SHOP_LINKS = [
  {
    label: "Furniture",
    href: "/products?category=furniture",
  },
  {
    label: "Seating",
    href: "/products?category=seating",
  },
  {
    label: "Tables",
    href: "/products?category=tables",
  },
  {
    label: "Lighting",
    href: "/products?category=lighting",
  },
  {
    label: "Decor",
    href: "/products?category=decor",
  },
];

const ROOM_LINKS = [
  {
    label: "Kids' Room",
    href: "/products?room=kids-room",
  },
  {
    label: "Green Space",
    href: "/products?room=outdoor",
  },
  {
    label: "Living Room",
    href: "/products?room=living-room",
  },
  {
    label: "Kitchen",
    href: "/products?room=kitchen",
  },
];

const GUEST_LINKS = [
  {
    label: "Sign in",
    href: "/login",
  },
  {
    label: "Create account",
    href: "/signup",
  },
  {
    label: "Cart",
    href: "/cart",
  },
];

const USER_LINKS = [
  {
    label: "Overview",
    href: "/account",
  },
  {
    label: "Orders",
    href: "/account/orders",
  },
  {
    label: "Addresses",
    href: "/account/addresses",
  },
  {
    label: "Saved pieces",
    href: "/saved",
  },
  {
    label: "Cart",
    href: "/cart",
  },
];

export default function Footer() {
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setLoggedIn(Boolean(data.session));
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const year = new Date().getFullYear();

  const accountLinks = loggedIn ? USER_LINKS : GUEST_LINKS;

  return (
    <footer className="overflow-hidden bg-[#4b1f26] text-[#f4efe7]">
      {/* ==================================================
          FOOTER CONTENT
          ================================================== */}

      <section className="border-b border-[#f4efe7]/15">
        <div
          className="
            grid
            gap-x-10
            gap-y-12
            px-4
            py-12

            sm:grid-cols-2

            md:px-6
            md:py-14

            lg:grid-cols-[2.5fr_1fr_1fr_1fr]
            lg:px-8
            lg:py-16
          "
        >
          {/* Brand */}
          <div>
            <FooterLabel>Studio MONTRO</FooterLabel>

            <h2
              className="
                mt-6
                max-w-[520px]
                text-[clamp(2.4rem,4vw,4.3rem)]
                font-normal
                leading-[0.94]
                tracking-[-0.045em]
                !text-[#f4efe7]
              "
            >
              Pieces that make
              <br />a space feel yours.
            </h2>

            <p
              className="
                mt-6
                max-w-[300px]
                text-sm
                leading-6
                text-[#f4efe7]/50
              "
            >
              Design-led furniture and objects for warm, personal Malaysian
              homes.
            </p>

            <p className="mt-7 text-[10px] uppercase tracking-[0.16em] text-[#f4efe7]/28">
              Malaysia
            </p>
          </div>

          {/* Shop */}
          <FooterColumn title="Shop">
            {SHOP_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}

            <FooterLink href="/products">View all</FooterLink>
          </FooterColumn>

          {/* Rooms */}
          <FooterColumn title="By room">
            {ROOM_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          {/* Account */}
          <FooterColumn title={loggedIn ? "Your account" : "Account"}>
            {!authReady ? (
              <>
                <FooterPlaceholder />
                <FooterPlaceholder />
                <FooterPlaceholder />
              </>
            ) : (
              accountLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))
            )}
          </FooterColumn>
        </div>
      </section>

      {/* ==================================================
          MOVING BRAND ROW
          ================================================== */}

      <section
        className="
          overflow-hidden
          border-b
          border-[#f4efe7]/15
          py-6

          sm:py-7
          md:py-8
        "
      >
        <div className="montro-marquee flex w-max">
          <MarqueeContent />

          <div aria-hidden="true">
            <MarqueeContent />
          </div>
        </div>
      </section>

      {/* ==================================================
          BOTTOM
          ================================================== */}

      <section className="px-4 py-6 md:px-6 lg:px-8">
        <div
          className="
            flex
            flex-col
            gap-4
            text-[10px]
            uppercase
            tracking-[0.14em]
            text-[#f4efe7]/32

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <span>© {year} Studio MONTRO</span>

          <button
            type="button"
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
            className="
              w-fit
              cursor-pointer
              text-[#f4efe7]/35
              transition-colors
              duration-300
              hover:text-[#f4efe7]/75
            "
          >
            Back to top ↑
          </button>
        </div>
      </section>

      {/* <section className="border-b border-[#f4efe7]/15">
        <div
          className="
            relative
            h-[180px]
            bg-cover
            bg-center

            sm:h-[210px]
            md:h-[240px]
            lg:h-[280px]
          "
          style={{
            backgroundImage: "url('/hero-livingroom.jpeg')",
          }}
        >
          <div className="absolute inset-0 bg-[#4b1f26]/10" />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-[#4b1f26]/18
              via-transparent
              to-[#4b1f26]/8
            "
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent" />
        </div>
      </section> */}

      <style>{`
        .montro-marquee {
          animation: montro-footer-marquee 36s linear infinite;
          will-change: transform;
        }

        @keyframes montro-footer-marquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .montro-marquee {
            animation: none;
          }
        }
      `}</style>
    </footer>
  );
}

/* ========================================================
   MARQUEE
   ======================================================== */

function MarqueeContent() {
  return (
    <div
      className="
        flex
        shrink-0
        items-center
        whitespace-nowrap
        pr-8

        md:pr-12
      "
    >
      <MarqueeWord />
      <MarqueeDot />

      <MarqueeWord />
      <MarqueeDot />

      <MarqueeWord />
      <MarqueeDot />

      <MarqueeWord />
      <MarqueeDot />
    </div>
  );
}

function MarqueeWord() {
  return (
    <span
      className="
        px-5
        text-[clamp(1.9rem,3.8vw,3.8rem)]
        font-medium
        leading-none
        tracking-[-0.05em]
        text-[#f4efe7]/88

        md:px-7
      "
    >
      STUDIO MONTRO
    </span>
  );
}

function MarqueeDot() {
  return (
    <span
      aria-hidden="true"
      className="
        mx-1
        h-1.5
        w-1.5
        shrink-0
        rounded-full
        bg-[#f4efe7]/28

        md:h-2
        md:w-2
      "
    />
  );
}

/* ========================================================
   HELPERS
   ======================================================== */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FooterLabel>{title}</FooterLabel>

      <nav className="mt-5 flex flex-col items-start gap-3">{children}</nav>
    </div>
  );
}

function FooterLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4efe7]/38">
      {children}
    </p>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="
        text-sm
        tracking-[-0.01em]
        text-[#f4efe7]/62
        transition-colors
        duration-300
        hover:text-[#f4efe7]
      "
    >
      {children}
    </Link>
  );
}

function FooterPlaceholder() {
  return (
    <span
      aria-hidden="true"
      className="block h-5 w-20 rounded-sm bg-[#f4efe7]/5"
    />
  );
}
