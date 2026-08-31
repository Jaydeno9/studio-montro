"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { API_URL } from "@/src/lib/apiConfig";
import { supabase } from "@/src/lib/supabase";

type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  active_product_count: number;
};

type NavigationItem = {
  label: string;
  href: string;
};

const ROOM_LINKS: NavigationItem[] = [
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

const GUEST_LINKS: NavigationItem[] = [
  {
    label: "Sign in",
    href: "/login",
  },
  {
    label: "Create account",
    href: "/signup",
  },
];

const USER_LINKS: NavigationItem[] = [
  {
    label: "Account overview",
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
];

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();

  const [categoryLinks, setCategoryLinks] = useState<NavigationItem[]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const hideFooter = pathname?.startsWith("/admin");

  /*
   * Keep footer categories in sync with Navbar.
   * Same endpoint, same active-product rule, same generated href.
   */
  useEffect(() => {
    if (hideFooter) {
      return;
    }

    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`);

        if (!response.ok) {
          throw new Error("Unable to load categories.");
        }

        const data = (await response.json()) as StorefrontCategory[];

        if (!cancelled) {
          setCategoryLinks(
            data
              .filter((category) => category.active_product_count > 0)
              .map((category) => ({
                label: category.name,
                href: `/products?category=${encodeURIComponent(category.slug)}`,
              })),
          );
        }
      } catch (error) {
        console.error("Unable to load footer categories:", error);
      } finally {
        if (!cancelled) {
          setCategoriesReady(true);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [hideFooter]);

  /*
   * Keep footer auth state in sync with Navbar.
   */
  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setUserEmail(session?.user?.email ?? null);
        setAuthReady(true);
      }
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  if (hideFooter) {
    return null;
  }

  const year = new Date().getFullYear();
  const loggedIn = Boolean(userEmail);
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
            {!categoriesReady ? (
              <>
                <FooterPlaceholder />
                <FooterPlaceholder />
                <FooterPlaceholder />
                <FooterPlaceholder />
              </>
            ) : (
              categoryLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))
            )}

            <FooterLink href="/products?sort=newest">New</FooterLink>

            <FooterLink href="/products">Shop all</FooterLink>
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
              <>
                {accountLinks.map((link) => (
                  <FooterLink key={link.href} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}

                {loggedIn && (
                  <FooterButton onClick={() => void handleLogout()}>
                    Sign out
                  </FooterButton>
                )}
              </>
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

function FooterButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        cursor-pointer
        text-left
        text-sm
        tracking-[-0.01em]
        text-[#f4efe7]/62
        transition-colors
        duration-300
        hover:text-[#f4efe7]
      "
    >
      {children}
    </button>
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
