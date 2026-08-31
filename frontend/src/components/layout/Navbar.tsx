"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useCart } from "@/src/hooks/useCart";
import { supabase } from "@/src/lib/supabase";

type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: {
    name: string;
    slug: string;
  } | null;
  primary_image: string | null;
};

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

import { API_URL } from "@/src/lib/apiConfig";

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

const POPULAR_SEARCHES = ["Seating", "Tables", "Lighting", "Oak", "Black"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount } = useCart();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchProducts, setSearchProducts] = useState<SearchProduct[]>([]);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categoryLinks, setCategoryLinks] = useState<NavigationItem[]>([]);

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mobileRoomsOpen, setMobileRoomsOpen] = useState(false);

  const [megaMenu, setMegaMenu] = useState<"categories" | "rooms" | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const hideNavbar = pathname?.startsWith("/admin");
  const isHomePage = pathname === "/";

  /*
   * 首页 Navbar scroll 状态。
   *
   * 注意：
   * 不在 effect body 里面直接 setState，
   * 避免 react-hooks/set-state-in-effect warning。
   */
  useEffect(() => {
    if (!isHomePage) {
      return;
    }

    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }

    const animationFrame = requestAnimationFrame(handleScroll);

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage]);

  useEffect(() => {
    if (hideNavbar) {
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
        console.error("Unable to load navbar categories:", error);
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [hideNavbar]);

  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setUserEmail(session?.user?.email ?? null);
      }
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(target)
      ) {
        setSearchOpen(false);
      }

      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }

      if (navRef.current && !navRef.current.contains(target)) {
        setMegaMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAccountOpen(false);
        setMobileOpen(false);
        setMegaMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function ensureSearchProducts() {
    if (searchLoaded || searchLoading) {
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error("Unable to load products.");
      }

      const data = (await response.json()) as SearchProduct[];

      setSearchProducts(data);
      setSearchLoaded(true);
    } catch (error) {
      console.error("Unable to load navbar search products:", error);
    } finally {
      setSearchLoading(false);
    }
  }

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return searchProducts
      .filter((product) => {
        const haystack = [product.name, product.category?.name ?? ""]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [searchProducts, searchTerm]);

  function openSearch() {
    setAccountOpen(false);
    setMobileOpen(false);
    setSearchOpen(true);
    void ensureSearchProducts();
  }

  function submitSearch() {
    const query = searchTerm.trim();

    if (!query) {
      return;
    }

    setSearchOpen(false);
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }

  function choosePopularSearch(value: string) {
    setSearchTerm(value);
    setSearchOpen(true);
    void ensureSearchProducts();
  }

  function closeNavigationUI() {
    setSearchOpen(false);
    setAccountOpen(false);
    setMobileOpen(false);
    setMobileCategoriesOpen(false);
    setMobileRoomsOpen(false);
    setMegaMenu(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAccountOpen(false);
    setMobileOpen(false);
    router.replace("/");
    router.refresh();
  }

  if (hideNavbar) {
    return null;
  }

  const homeTransparent = isHomePage && !scrolled;

  const headerClassName = isHomePage
    ? `fixed left-0 right-0 top-0 z-[1000] transition-all duration-300 ${
        scrolled
          ? "border-b border-[#c9c1b7]/70 bg-[#f4f0e9]/96 text-[#2d2824] backdrop-blur-md"
          : "border-b border-transparent bg-transparent text-white"
      }`
    : "sticky top-0 z-[1000] border-b border-[#c9c1b7]/70 bg-[#f4f0e9]/96 text-[#2d2824] backdrop-blur-md";

  return (
    <header ref={navRef} className={headerClassName}>
      {/* 首页透明状态的顶部深色渐变 */}
      {homeTransparent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[180px] bg-gradient-to-b from-black/65 via-black/30 to-transparent"
        />
      )}

      {/* Navbar actual content */}
      <div className="relative z-10">
        {/* Primary row */}
        <div className="grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 md:px-6 lg:min-h-[78px] lg:gap-8 lg:px-8">
          <Link
            href="/"
            onClick={closeNavigationUI}
            className={`shrink-0 text-xl font-medium tracking-[-0.035em] transition-colors md:text-2xl ${
              homeTransparent ? "text-white" : "text-[#4b1f26]"
            }`}
          >
            STUDIO MONTRO
          </Link>

          {/* Desktop live search */}
          <div
            ref={desktopSearchRef}
            className="relative hidden min-w-0 lg:block"
          >
            <div
              className={`flex h-11 items-center rounded-full border px-4 transition ${
                homeTransparent
                  ? searchOpen
                    ? "border-white/60 bg-black/20 backdrop-blur-md"
                    : "border-white/35 bg-black/10 backdrop-blur-sm hover:border-white/60 hover:bg-black/15"
                  : searchOpen
                    ? "border-[#4b1f26]/55 bg-[#faf7f1]"
                    : "border-[#c9c1b762] bg-[#faf7f1] hover:border-[#9d9185]"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`mr-3 h-4 w-4 shrink-0 ${
                  homeTransparent ? "text-white/80" : "text-[#6f675f]"
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>

              <input
                type="text"
                value={searchTerm}
                onFocus={openSearch}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  openSearch();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                placeholder="Search pieces, categories..."
                className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                  homeTransparent
                    ? "text-white placeholder:text-white/60"
                    : "text-[#2d2824] placeholder:text-[#9a9188]"
                }`}
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchOpen(true);
                  }}
                  className={`ml-3 flex h-7 w-7 items-center justify-center rounded-full text-lg font-light transition ${
                    homeTransparent
                      ? "text-white/80 hover:bg-white/10 hover:text-white"
                      : "text-[#6f675f] hover:bg-[#ece6de] hover:text-[#25211d]"
                  }`}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {searchOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden border border-[#c9c1b7] bg-[#f4f0e9] text-[#2d2824] shadow-[0_20px_50px_rgba(54,39,31,0.14)]">
                <SearchPanel
                  searchTerm={searchTerm}
                  searchResults={searchResults}
                  searchLoading={searchLoading}
                  categoryLinks={categoryLinks}
                  onPopularSearch={choosePopularSearch}
                  onClose={() => setSearchOpen(false)}
                  onSubmit={submitSearch}
                />
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setAccountOpen(false);
                openSearch();
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition lg:hidden ${
                homeTransparent ? "hover:bg-white/10" : "hover:bg-[#e8e1d9]"
              }`}
              aria-label="Search"
            >
              <SearchIcon />
            </button>

            <Link
              href="/saved"
              onClick={closeNavigationUI}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                homeTransparent ? "hover:bg-white/10" : "hover:bg-[#e8e1d9]"
              }`}
              aria-label="Saved"
            >
              <HeartIcon />
            </Link>

            <div ref={accountRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setMobileOpen(false);
                  setAccountOpen((open) => !open);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  homeTransparent ? "hover:bg-white/10" : "hover:bg-[#e8e1d9]"
                }`}
                aria-label="Account"
              >
                <AccountIcon />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-[260px] border border-[#c9c1b7] bg-[#f4f0e9] p-5 text-[#2d2824] shadow-[0_18px_44px_rgba(54,39,31,0.14)]">
                  {userEmail ? (
                    <>
                      <p className="truncate text-xs text-[#7c736b]">
                        {userEmail}
                      </p>

                      <div className="mt-5 grid gap-1">
                        <AccountMenuLink
                          href="/account"
                          label="Account overview"
                          icon={<AccountOverviewIcon />}
                          onClick={closeNavigationUI}
                        />

                        <AccountMenuLink
                          href="/account/orders"
                          label="Orders"
                          icon={<OrdersIcon />}
                          onClick={closeNavigationUI}
                        />

                        <AccountMenuLink
                          href="/account/addresses"
                          label="Addresses"
                          icon={<AddressIcon />}
                          onClick={closeNavigationUI}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="mt-4 flex w-full items-center gap-3 border-t border-[#d5cdc3] pt-4 text-left text-sm text-[#6f675f] transition hover:text-[#4b1f26]"
                      >
                        <SignOutIcon />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <div className="grid gap-3">
                      <Link
                        href="/login"
                        onClick={closeNavigationUI}
                        className="bg-[#4b1f26] px-4 py-3 text-center text-sm text-[#f4efe7] transition hover:bg-[#5a2730]"
                      >
                        Sign in
                      </Link>

                      <Link
                        href="/signup"
                        onClick={closeNavigationUI}
                        className="border border-[#4b1f26] px-4 py-3 text-center text-sm text-[#4b1f26] transition hover:bg-[#eee6de]"
                      >
                        Create account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/cart"
              onClick={closeNavigationUI}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                homeTransparent ? "hover:bg-white/10" : "hover:bg-[#e8e1d9]"
              }`}
              aria-label={`Cart${
                cartCount > 0
                  ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}`
                  : ""
              }`}
            >
              <BagIcon />

              {cartCount > 0 && (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-medium leading-none ${
                    homeTransparent
                      ? "bg-white text-[#4b1f26]"
                      : "bg-[#4b1f26] text-[#f4efe7]"
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setAccountOpen(false);
                setMobileOpen((open) => !open);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition md:hidden ${
                homeTransparent ? "hover:bg-white/10" : "hover:bg-[#e8e1d9]"
              }`}
              aria-label="Menu"
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Desktop secondary navigation */}
        <div
          className={`hidden border-t lg:block ${
            homeTransparent ? "border-white/20" : "border-[#d3cbc1]/80"
          }`}
        >
          <div className="flex h-[42px] items-center gap-8 px-8">
            <div
              className="relative h-full"
              onMouseEnter={() => setMegaMenu("categories")}
              onMouseLeave={() => setMegaMenu(null)}
            >
              <button
                type="button"
                onFocus={() => setMegaMenu("categories")}
                className={`flex h-full items-center text-[11px] uppercase tracking-[0.14em] transition ${
                  homeTransparent
                    ? "text-white/85 hover:text-white"
                    : megaMenu === "categories"
                      ? "text-[#4b1f26]"
                      : "text-[#625a53] hover:text-[#4b1f26]"
                }`}
              >
                Categories
              </button>

              {megaMenu === "categories" && (
                <div className="absolute left-0 top-full z-[1100] w-[300px] border border-[#d2c9bf] bg-[#536d5d] py-2 text-[#f4efe7] shadow-[0_20px_45px_rgba(50,39,31,0.16)]">
                  {categoryLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeNavigationUI}
                      className="group flex items-center justify-between gap-5 px-5 py-3.5 transition hover:bg-[#607a69]"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] tracking-[-0.01em] text-[#f4efe7]">
                          {item.label}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm text-[#f4efe7]/45 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#f4efe7]">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div
              className="relative h-full"
              onMouseEnter={() => setMegaMenu("rooms")}
              onMouseLeave={() => setMegaMenu(null)}
            >
              <button
                type="button"
                onFocus={() => setMegaMenu("rooms")}
                className={`flex h-full items-center text-[11px] uppercase tracking-[0.14em] transition ${
                  homeTransparent
                    ? "text-white/85 hover:text-white"
                    : megaMenu === "rooms"
                      ? "text-[#4b1f26]"
                      : "text-[#625a53] hover:text-[#4b1f26]"
                }`}
              >
                Rooms
              </button>

              {megaMenu === "rooms" && (
                <div className="absolute left-0 top-full z-[1100] w-[300px] border border-[#d2c9bf] bg-[#536d5d] py-2 text-[#f4efe7] shadow-[0_20px_45px_rgba(50,39,31,0.16)]">
                  {ROOM_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeNavigationUI}
                      className="group flex items-center justify-between gap-5 px-5 py-3.5 transition hover:bg-[#607a69]"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] tracking-[-0.01em] text-[#f4efe7]">
                          {item.label}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm text-[#f4efe7]/45 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#f4efe7]">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/products?sort=newest"
              onClick={closeNavigationUI}
              onMouseEnter={() => setMegaMenu(null)}
              className={`flex h-full items-center text-[11px] uppercase tracking-[0.14em] transition ${
                homeTransparent
                  ? "text-white/85 hover:text-white"
                  : "text-[#625a53] hover:text-[#4b1f26]"
              }`}
            >
              New
            </Link>

            <Link
              href="/products"
              onClick={closeNavigationUI}
              onMouseEnter={() => setMegaMenu(null)}
              className={`ml-auto flex h-full items-center text-[11px] uppercase tracking-[0.14em] transition ${
                homeTransparent
                  ? "text-white/70 hover:text-white"
                  : "text-[#857b73] hover:text-[#4b1f26]"
              }`}
            >
              Shop all
            </Link>
          </div>
        </div>

        {/* Mobile search panel */}
        {searchOpen && (
          <div className="border-t border-[#d3cbc1] bg-[#f4f0e9] px-4 py-4 text-[#2d2824] lg:hidden">
            <div className="flex h-11 items-center rounded-full border border-[#c9c1b7] bg-[#faf7f1] px-4">
              <SearchIcon />

              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  void ensureSearchProducts();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                placeholder="Search pieces..."
                className="ml-3 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9188]"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="ml-3 text-lg font-light text-[#6f675f]"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="mt-4 overflow-hidden border border-[#d3cbc1]">
              <SearchPanel
                searchTerm={searchTerm}
                searchResults={searchResults}
                searchLoading={searchLoading}
                categoryLinks={categoryLinks}
                onPopularSearch={choosePopularSearch}
                onClose={() => setSearchOpen(false)}
                onSubmit={submitSearch}
              />
            </div>
          </div>
        )}

        {/* Mobile navigation */}
        {mobileOpen && (
          <div className="border-t border-[#d3cbc1] bg-[#f4f0e9] px-4 pb-6 pt-2 text-[#2d2824] md:hidden">
            <MobileAccordion
              label="Categories"
              open={mobileCategoriesOpen}
              onToggle={() => {
                setMobileCategoriesOpen((open) => !open);
                setMobileRoomsOpen(false);
              }}
              items={categoryLinks}
              onNavigate={closeNavigationUI}
            />

            <MobileAccordion
              label="Rooms"
              open={mobileRoomsOpen}
              onToggle={() => {
                setMobileRoomsOpen((open) => !open);
                setMobileCategoriesOpen(false);
              }}
              items={ROOM_LINKS}
              onNavigate={closeNavigationUI}
            />

            <Link
              href="/products?sort=newest"
              onClick={closeNavigationUI}
              className="flex items-center justify-between border-b border-[#d3cbc1] py-4 text-sm uppercase tracking-[0.11em]"
            >
              New
              <span>→</span>
            </Link>

            <Link
              href="/products"
              onClick={closeNavigationUI}
              className="flex items-center justify-between border-b border-[#d3cbc1] py-4 text-sm uppercase tracking-[0.11em]"
            >
              Shop all
              <span>→</span>
            </Link>

            <div className="mt-5 grid gap-2">
              {userEmail ? (
                <>
                  <Link
                    href="/account"
                    onClick={closeNavigationUI}
                    className="border border-[#4b1f26] px-4 py-3 text-center text-sm text-[#4b1f26]"
                  >
                    My account
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="bg-[#4b1f26] px-4 py-3 text-sm text-[#f4efe7]"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeNavigationUI}
                    className="bg-[#4b1f26] px-4 py-3 text-center text-sm text-[#f4efe7]"
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={closeNavigationUI}
                    className="border border-[#4b1f26] px-4 py-3 text-center text-sm text-[#4b1f26]"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function AccountMenuLink({
  href,
  label,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center justify-between gap-4 py-2.5 text-sm text-[#4f4842] transition hover:text-[#4b1f26]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#746b63] transition group-hover:text-[#4b1f26]">
          {icon}
        </span>

        <span>{label}</span>
      </span>

      <span className="text-xs text-[#9a9188] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#4b1f26]">
        →
      </span>
    </Link>
  );
}

function SearchPanel({
  searchTerm,
  searchResults,
  searchLoading,
  categoryLinks,
  onPopularSearch,
  onClose,
  onSubmit,
}: {
  searchTerm: string;
  searchResults: SearchProduct[];
  searchLoading: boolean;
  categoryLinks: NavigationItem[];
  onPopularSearch: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const query = searchTerm.trim();

  if (!query) {
    return (
      <div className="p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#8b8178]">
          Popular searches
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPopularSearch(item)}
              className="border border-[#d1c8be] px-3 py-2 text-xs text-[#625a53] transition hover:border-[#4b1f26] hover:text-[#4b1f26]"
            >
              {item}
            </button>
          ))}
        </div>

        <p className="mt-7 text-[10px] uppercase tracking-[0.15em] text-[#8b8178]">
          Browse by category
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 md:grid-cols-3">
          {categoryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="py-2 text-sm text-[#625a53] transition hover:text-[#4b1f26]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-y-auto">
      <div className="p-3">
        {searchLoading && (
          <p className="px-3 py-6 text-sm text-[#7c736b]">Searching...</p>
        )}

        {!searchLoading && searchResults.length === 0 && (
          <div className="px-3 py-7">
            <p className="text-sm text-[#514b45]">No matching pieces yet.</p>

            <p className="mt-2 text-xs leading-5 text-[#8a8178]">
              Try another product name or category.
            </p>
          </div>
        )}

        {!searchLoading &&
          searchResults.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-4 px-3 py-3 transition hover:bg-[#ece5dc]"
            >
              <div className="relative h-[68px] overflow-hidden bg-[#ddd5cc]">
                {product.primary_image ? (
                  <img
                    src={product.primary_image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#2d2824]">
                  {product.name}
                </p>

                <p className="mt-1 truncate text-xs text-[#8a8178]">
                  {product.category?.name ?? "Studio MONTRO"}
                </p>
              </div>

              <p className="text-xs text-[#625a53]">
                RM{" "}
                {Number(product.price).toLocaleString("en-MY", {
                  maximumFractionDigits: 2,
                })}
              </p>
            </Link>
          ))}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-[#6e2f35]/40 bg-[#4b1f26]">
        <button
          type="button"
          onClick={onSubmit}
          className="flex w-full items-center justify-between px-6 py-[16px] text-left text-sm tracking-[0.01em] text-[#f4f0e9] transition hover:bg-[#5a2730]"
        >
          <span>View all results for “{query}”</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

function MobileAccordion({
  label,
  open,
  onToggle,
  items,
  onNavigate,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  items: {
    label: string;
    href: string;
  }[];
  onNavigate: () => void;
}) {
  return (
    <div className="border-b border-[#d3cbc1]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left text-sm uppercase tracking-[0.11em]"
      >
        {label}
        <span className="text-xl font-light">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="block py-2.5 pl-3"
            >
              <p className="text-sm text-[#4b1f26]">{item.label}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountOverviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20c.8-3.9 3-5.9 6.5-5.9s5.7 2 6.5 5.9" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 7 7.5-3 7.5 3-7.5 3-7.5-3Z" />
      <path d="M4.5 7v9.5L12 20l7.5-3.5V7" />
      <path d="M12 10v10" />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4" />
      <path d="M8 12h9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function HeartIcon() {
  return (
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
  );
}

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[19px] w-[19px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[19px] w-[19px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 8h16" />
          <path d="M4 16h16" />
        </>
      )}
    </svg>
  );
}
