"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { useCart } from "@/src/hooks/useCart";
import AuthRequiredPrompt from "@/src/components/AuthRequiredPrompt.tsx";

export default function Navbar() {
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const accountRef = useRef<HTMLDivElement | null>(null);

  const { cartCount, cartLoading } = useCart();

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(user);
      setAuthLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (!session) {
        setAccountOpen(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  async function handleLogout() {
    try {
      setLogoutLoading(true);
      setLogoutError("");

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      setAccountOpen(false);
      setMobileOpen(false);

      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);

      setLogoutError(err instanceof Error ? err.message : "Unable to log out.");
    } finally {
      setLogoutLoading(false);
    }
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const displayCartCount = cartLoading ? 0 : cartCount;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#cec6bc]/80 bg-[#f4f0e9]/95 backdrop-blur-md">
        <div className="flex h-[72px] items-center px-8">
          <Link
            href="/"
            className="shrink-0 text-[19px] font-semibold tracking-[-0.035em] text-[#25211d] transition hover:opacity-60"
          >
            MONTRO
          </Link>

          {/* Long product search — UI only for now */}
          <div className="hidden min-w-0 flex-1 px-10 lg:block">
            <button
              type="button"
              aria-label="Search products"
              className="group flex w-full items-center justify-between border-b border-[#bdb4aa] pb-2 text-left transition hover:border-[#71685f]"
            >
              <span className="text-sm text-[#91877e] transition group-hover:text-[#6b6259]">
                Search products
              </span>

              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] shrink-0 text-[#514b45]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
          </div>

          <nav className="hidden shrink-0 items-center gap-6 lg:flex">
            <Link
              href="/products"
              className={`text-sm transition ${
                pathname.startsWith("/products")
                  ? "text-[#25211d]"
                  : "text-[#625a53] hover:text-[#25211d]"
              }`}
            >
              Shop
            </Link>

            {!authLoading && user && (
              <>
                <Link
                  href="/saved"
                  aria-label="Saved products"
                  title="Saved"
                  className={`flex h-8 w-8 items-center justify-center transition ${
                    pathname === "/saved"
                      ? "text-[#25211d]"
                      : "text-[#625a53] hover:text-[#25211d]"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[19px] w-[19px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                  </svg>
                </Link>

                <div className="h-4 w-px bg-[#cec6bc]" />
              </>
            )}

            {!authLoading &&
              (user ? (
                <div ref={accountRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((current) => !current)}
                    aria-label="Account"
                    aria-expanded={accountOpen}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                      accountOpen
                        ? "bg-[#e6dfd6] text-[#25211d]"
                        : "text-[#625a53] hover:bg-[#e9e2d9] hover:text-[#25211d]"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-[19px] w-[19px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" />
                    </svg>
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 top-[46px] w-[270px] border border-[#cec6bc] bg-[#f4f0e9] shadow-[0_18px_50px_rgba(37,33,29,0.12)]">
                      <div className="border-b border-[#cec6bc] px-5 py-5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                          Signed in as
                        </p>

                        <p className="mt-2 truncate text-sm text-[#25211d]">
                          {user.email}
                        </p>
                      </div>

                      <div className="p-2">
                        <Link
                          href="/account"
                          onClick={() => setAccountOpen(false)}
                          className="flex w-full items-center justify-between px-3 py-3 text-sm text-[#514b45] transition hover:bg-[#e9e2d9] hover:text-[#25211d]"
                        >
                          <span>Account overview</span>
                          <span>→</span>
                        </Link>

                        <Link
                          href="/account/orders"
                          onClick={() => setAccountOpen(false)}
                          className="flex w-full items-center justify-between px-3 py-3 text-sm text-[#514b45] transition hover:bg-[#e9e2d9] hover:text-[#25211d]"
                        >
                          <span>Orders</span>
                          <span>→</span>
                        </Link>

                        <Link
                          href="/account/addresses"
                          onClick={() => setAccountOpen(false)}
                          className="flex w-full items-center justify-between px-3 py-3 text-sm text-[#514b45] transition hover:bg-[#e9e2d9] hover:text-[#25211d]"
                        >
                          <span>Addresses</span>
                          <span>→</span>
                        </Link>

                        <Link
                          href="/account/profile"
                          onClick={() => setAccountOpen(false)}
                          className="flex w-full items-center justify-between border-b border-[#ddd5cc] px-3 py-3 text-sm text-[#514b45] transition hover:bg-[#e9e2d9] hover:text-[#25211d]"
                        >
                          <span>Profile & security</span>
                          <span>→</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          disabled={logoutLoading}
                          className="flex w-full items-center justify-between px-3 py-3 text-left text-sm text-[#514b45] transition hover:bg-[#e9e2d9] hover:text-[#25211d] disabled:cursor-wait disabled:opacity-50"
                        >
                          <span>
                            {logoutLoading ? "Logging out..." : "Log out"}
                          </span>
                          <span>→</span>
                        </button>

                        {logoutError && (
                          <p className="px-3 pb-3 pt-1 text-xs text-[#8b3a34]">
                            {logoutError}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-[#625a53] transition hover:text-[#25211d]"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    className="border border-[#25211d] px-4 py-2 text-sm text-[#25211d] transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
                  >
                    Sign up
                  </Link>
                </>
              ))}

            {!authLoading && user && (
              <Link
                href="/cart"
                className="flex items-center gap-2 text-sm text-[#625a53] transition hover:text-[#25211d]"
              >
                <span>Bag</span>

                <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-[#aaa097] px-1.5 text-[10px]">
                  {displayCartCount}
                </span>
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-4 lg:hidden">
            <button
              type="button"
              aria-label="Search products"
              className="text-[#514b45]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((current) => !current)}
              className="flex h-8 w-8 flex-col items-center justify-center gap-[6px]"
            >
              <span
                className={`block h-px w-5 bg-[#25211d] transition ${
                  mobileOpen ? "translate-y-[3.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-px w-5 bg-[#25211d] transition ${
                  mobileOpen ? "-translate-y-[3.5px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <AuthRequiredPrompt />

      {mobileOpen && (
        <div className="fixed inset-x-0 top-[72px] z-40 border-b border-[#cec6bc] bg-[#f4f0e9] px-8 pb-8 pt-5 lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-[#bdb4aa] pb-3 text-left"
          >
            <span className="text-sm text-[#91877e]">Search products</span>
            <span>⌕</span>
          </button>

          <nav className="mt-7">
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-b border-[#cec6bc] py-4 text-base text-[#25211d]"
            >
              <span>Shop</span>
              <span>→</span>
            </Link>

            {!authLoading && user && (
              <>
                <Link
                  href="/saved"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b border-[#cec6bc] py-4 text-base text-[#25211d]"
                >
                  <span>Saved</span>
                  <span>♡</span>
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b border-[#cec6bc] py-4 text-base text-[#25211d]"
                >
                  <span>Bag</span>
                  <span className="text-sm text-[#756d65]">
                    {displayCartCount}
                  </span>
                </Link>
              </>
            )}
          </nav>

          {!authLoading && (
            <div className="mt-7">
              {user ? (
                <>
                  <div className="border-b border-[#cec6bc] pb-5">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                      Signed in as
                    </p>
                    <p className="mt-2 break-all text-sm text-[#25211d]">
                      {user.email}
                    </p>
                  </div>

                  <div className="mt-4 border-b border-[#cec6bc] pb-4">
                    <Link
                      href="/account"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between py-2 text-sm text-[#514b45]"
                    >
                      <span>Account overview</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/account/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between py-2 text-sm text-[#514b45]"
                    >
                      <span>Orders</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/account/addresses"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between py-2 text-sm text-[#514b45]"
                    >
                      <span>Addresses</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/account/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between py-2 text-sm text-[#514b45]"
                    >
                      <span>Profile & security</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={logoutLoading}
                    className="mt-5 flex w-full items-center justify-between text-sm text-[#514b45] disabled:cursor-wait disabled:opacity-50"
                  >
                    <span>{logoutLoading ? "Logging out..." : "Log out"}</span>
                    <span>→</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center border border-[#25211d] px-4 py-3 text-sm text-[#25211d]"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9]"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
