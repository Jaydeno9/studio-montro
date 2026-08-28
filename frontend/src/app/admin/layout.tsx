"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "@/src/lib/adminFetch";
import { supabase } from "@/src/lib/supabase";
import { AdminUnsavedChangesProvider } from "@/src/context/AdminUnsavedChangesProvider";
import { useAdminInactivityTimeout } from "@/src/hooks/useAdminInactivityTimeout";

type AdminOrder = {
  status: string;
  payment_status: string;
  payment_proof_url?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/admin",
    icon: DashboardIcon,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: OrdersIcon,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: CustomersIcon,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: CategoriesIcon,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: ProductsIcon,
  },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authorizationStatus, setAuthorizationStatus] = useState<
    "checking" | "authorized" | "error"
  >("checking");

  const isLoginPage = pathname === "/admin/login";

  const checkAdminAccess = useCallback(async () => {
    if (isLoginPage) {
      return;
    }

    setAuthorizationStatus((current) =>
      current === "authorized" ? current : "checking",
    );

    try {
      const response = await adminFetch(`${API_URL}/admin/me`);
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.is_admin !== true) {
        throw new Error("ADMIN_CHECK_FAILED");
      }

      setAuthorizationStatus("authorized");
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "AUTH_REQUIRED" ||
          error.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setAuthorizationStatus("error");
    }
  }, [isLoginPage]);

  const handleSessionExpired = useCallback(async () => {
    setAuthorizationStatus("checking");
    setMobileOpen(false);
    setReviewCount(0);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      router.replace("/admin/login?reason=session_expired");
      router.refresh();
    }
  }, [router]);

  useAdminInactivityTimeout({
    enabled: !isLoginPage && authorizationStatus === "authorized",
    pathname,
    onExpire: handleSessionExpired,
  });

  const loadReviewCount = useCallback(async () => {
    try {
      const response = await adminFetch(`${API_URL}/admin/orders`);

      if (!response.ok) {
        return;
      }

      const data = await response.json().catch(() => null);

      const orders: AdminOrder[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : [];

      const count = orders.filter(
        (order) =>
          order.status === "pending_payment" &&
          order.payment_status === "pending" &&
          Boolean(order.payment_proof_url),
      ).length;

      setReviewCount(count);
    } catch {
      // Sidebar badge is optional. The page itself still handles data errors.
    }
  }, []);

  useEffect(() => {
    if (isLoginPage || authorizationStatus !== "authorized") {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadReviewCount();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authorizationStatus, isLoginPage, loadReviewCount, pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAdminAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkAdminAccess, pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to sign out of MONTRO Admin?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoggingOut(true);
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authorizationStatus !== "authorized") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e9] px-6 text-[#25211d]">
        <div className="text-center">
          <p className="text-sm text-[#756d65]">
            {authorizationStatus === "error"
              ? "Unable to verify admin access."
              : "Checking admin access..."}
          </p>

          {authorizationStatus === "error" && (
            <button
              type="button"
              onClick={() => void checkAdminAccess()}
              className="mt-5 border border-[#8f867d] px-4 py-2 text-sm"
            >
              Try again
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <AdminUnsavedChangesProvider>
      <div className="min-h-screen bg-[#f4f0e9] text-[#25211d]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-[70] hidden w-[250px] border-r border-[#cec6bc] bg-[#eee8df] lg:flex lg:flex-col">
          <SidebarContent
            pathname={pathname}
            reviewCount={reviewCount}
            loggingOut={loggingOut}
            onLogout={handleLogout}
          />
        </aside>

        {/* Mobile header */}
        <header className="fixed inset-x-0 top-0 z-[80] flex h-[68px] items-center justify-between border-b border-[#cec6bc] bg-[#eee8df] px-5 lg:hidden">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-[0.18em]"
          >
            MONTRO
            <span className="ml-2 text-[9px] font-normal tracking-[0.13em] text-[#827970]">
              ADMIN
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
            className="flex h-9 w-9 items-center justify-center border border-[#9a9086]"
          >
            <MenuIcon />
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-[#25211d]/25"
            />

            <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[330px] flex-col border-r border-[#cec6bc] bg-[#eee8df] shadow-[24px_0_60px_rgba(37,33,29,0.12)]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin navigation"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-2xl font-light"
              >
                ×
              </button>

              <SidebarContent
                pathname={pathname}
                reviewCount={reviewCount}
                loggingOut={loggingOut}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </aside>
          </div>
        )}

        {/* Page content */}
        <div className="min-h-screen pt-[68px] lg:ml-[250px] lg:pt-0">
          {children}
        </div>
      </div>
    </AdminUnsavedChangesProvider>
  );
}

function SidebarContent({
  pathname,
  reviewCount,
  loggingOut,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  reviewCount: number;
  loggingOut: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="border-b border-[#cec6bc] px-6 py-7">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="inline-flex items-baseline gap-2"
        >
          <span className="text-base font-semibold tracking-[0.18em]">
            MONTRO
          </span>

          <span className="text-[9px] uppercase tracking-[0.14em] text-[#857c73]">
            Admin
          </span>
        </Link>

        <p className="mt-3 text-xs leading-5 text-[#817870]">
          Store operations
        </p>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="px-3 pb-3 text-[9px] uppercase tracking-[0.16em] text-[#91877e]">
          Manage
        </p>

        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex min-h-11 items-center justify-between border px-3.5 py-2.5 text-sm transition ${
                  active
                    ? "border-[#a89f96] bg-[#f4f0e9] text-[#25211d]"
                    : "border-transparent text-[#655e57] hover:bg-[#f4f0e9]/70 hover:text-[#25211d]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon />

                  <span>{item.label}</span>
                </span>

                {item.label === "Orders" && reviewCount > 0 && (
                  <span className="min-w-6 border border-[#7f756c] bg-[#25211d] px-1.5 py-0.5 text-center text-[9px] font-medium text-[#f4f0e9]">
                    {reviewCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 border-t border-[#d4ccc3] pt-5">
          <p className="px-3 pb-3 text-[9px] uppercase tracking-[0.16em] text-[#91877e]">
            Store
          </p>

          <a
            href="/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            onClick={onNavigate}
            className="group flex min-h-11 items-center gap-3 border border-transparent px-3.5 py-2.5 text-sm text-[#655e57] transition hover:bg-[#f4f0e9]/70 hover:text-[#25211d]"
          >
            <StorefrontIcon />
            <span>View storefront</span>
            <span className="ml-auto text-sm">↗</span>
          </a>
        </div>
      </nav>

      <div className="border-t border-[#cec6bc] p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex min-h-11 w-full items-center gap-3 border border-transparent px-3.5 py-2.5 text-left text-sm text-[#655e57] transition hover:bg-[#f4f0e9]/70 hover:text-[#25211d] disabled:cursor-wait disabled:opacity-40"
        >
          <LogoutIcon />
          <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </>
  );
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" />
    </svg>
  );
}

function StorefrontIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 9h16l-1.5-5h-13z" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5 8h14M5 16h14" />
    </svg>
  );
}
