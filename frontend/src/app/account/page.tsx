"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";

type Order = {
  id: string;
  status: string;
  payment_status: string;
  payment_proof_url: string | null;
  refund_status?: "not_required" | "required" | "completed";
  total: number;
  created_at: string;
  order_cancellation_requests?: {
    id: string;
    status: "pending" | "approved" | "rejected";
  }[];
};

import { API_URL } from "@/src/lib/apiConfig";

export default function AccountOverviewPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [addressCount, setAddressCount] = useState(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadAccount() {
        try {
          const [sessionResponse, ordersResponse, addressesResponse] =
            await Promise.all([
              supabase.auth.getSession(),
              authFetch(`${API_URL}/orders`),
              authFetch(`${API_URL}/addresses`),
            ]);

          const [ordersData, addressData] = await Promise.all([
            ordersResponse.json().catch(() => []),
            addressesResponse.json().catch(() => []),
          ]);

          if (cancelled) {
            return;
          }

          setEmail(sessionResponse.data.session?.user.email ?? "");

          setOrders(
            ordersResponse.ok && Array.isArray(ordersData) ? ordersData : [],
          );

          setAddressCount(
            addressesResponse.ok && Array.isArray(addressData)
              ? addressData.length
              : 0,
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void loadAccount();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const latestOrder = orders[0] ?? null;

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "delivered" && order.status !== "cancelled",
      ),
    [orders],
  );

  const attentionOrder = useMemo(
    () =>
      orders.find((order) => {
        const cancellationPending =
          order.order_cancellation_requests?.some(
            (request) => request.status === "pending",
          ) ?? false;

        return (
          cancellationPending ||
          order.refund_status === "required" ||
          (order.status === "pending_payment" &&
            order.payment_status === "pending" &&
            !order.payment_proof_url)
        );
      }) ?? null,
    [orders],
  );

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
      <header className="border-b border-[#cec6bc] pb-10">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
              My account
            </p>

            <p className="mt-4 max-w-4xl text-5xl font-medium leading-[0.96] tracking-[-0.05em] md:text-7xl">
              Welcome back.
            </p>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#70675f]">
              Keep track of your orders and the delivery details connected to
              your Studio MONTRO account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#9f958b] bg-[#eee8df] transition hover:bg-[#e6ddd2]"
            aria-label="Open account settings"
            title="Account settings"
          >
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="grid gap-5 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-5">
          {attentionOrder && (
            <Link
              href={`/account/orders/${attentionOrder.id}`}
              className="group block border border-[#765149] bg-[#765149] p-6 text-[#f4f0e9] transition hover:bg-[#67443e] md:p-7"
            >
              <div className="flex items-start justify-between gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#eaded8]">
                    Needs attention
                  </p>

                  <p className="mt-3 text-2xl font-medium tracking-[-0.03em]">
                    {getAttentionTitle(attentionOrder)}
                  </p>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#eaded8]">
                    {getAttentionDetail(attentionOrder)}
                  </p>
                </div>

                <span className="text-2xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          )}

          <div className="border border-[#b9afa5] bg-[#eee8df] p-6 md:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
                  Latest order
                </p>

                <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                  {latestOrder
                    ? `#${latestOrder.id.slice(0, 8).toUpperCase()}`
                    : "Nothing here yet"}
                </p>
              </div>

              <Link
                href="/account/orders"
                className="w-fit text-xs underline decoration-[#9f958b] underline-offset-4"
              >
                View order history
              </Link>
            </div>

            {latestOrder ? (
              <div className="mt-6 grid gap-6 border-t border-[#cfc6bd] pt-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <span className="inline-flex border border-[#5f6f59] bg-[#5f6f59] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[#f4f0e9]">
                    {latestOrder.status.replaceAll("_", " ")}
                  </span>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-[#6f675f]">
                    {getOrderSummary(latestOrder)}
                  </p>

                  <p className="mt-3 text-xs text-[#91877e]">
                    Placed{" "}
                    {new Date(latestOrder.created_at).toLocaleDateString(
                      "en-MY",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-[#91877e]">
                    Total
                  </p>

                  <p className="mt-2 text-2xl font-medium">
                    RM{" "}
                    {Number(latestOrder.total).toLocaleString("en-MY", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>

                  <Link
                    href={`/account/orders/${latestOrder.id}`}
                    className="mt-4 inline-flex items-center gap-3 border border-[#25211d] px-4 py-3 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
                  >
                    View order
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-[#cfc6bd] pt-6">
                <p className="text-sm text-[#756d65]">
                  Your purchases will appear here.
                </p>

                <Link
                  href="/products"
                  className="mt-4 inline-flex border border-[#25211d] px-4 py-3 text-sm"
                >
                  Explore collection
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/account/orders"
            className="group border border-[#8c795f] bg-[#8c795f] p-6 text-[#f4f0e9] transition hover:bg-[#786850]"
          >
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#f0e8de]">
              Order history
            </p>

            <p className="mt-5 text-5xl font-medium tracking-[-0.05em]">
              {loading ? "—" : orders.length}
            </p>

            <p className="mt-4 text-sm leading-6 text-[#f0e8de]">
              Review current and past purchases in one place.
            </p>

            <span className="mt-7 inline-block text-xl transition group-hover:translate-x-1">
              →
            </span>
          </Link>

          <Link
            href="/account/addresses"
            className="group border border-[#5f6f59] bg-[#5f6f59] p-6 text-[#f4f0e9] transition hover:bg-[#52604d]"
          >
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#e4eadf]">
              Delivery details
            </p>

            <p className="mt-5 text-5xl font-medium tracking-[-0.05em]">
              {loading ? "—" : addressCount}
            </p>

            <p className="mt-4 text-sm leading-6 text-[#e4eadf]">
              Keep your preferred delivery information ready.
            </p>

            <span className="mt-7 inline-block text-xl transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>

      <section className="border-t border-[#cec6bc] pt-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              Your activity
            </p>

            <p className="mt-2 text-xl font-medium">A quieter overview</p>
          </div>

          <div className="flex gap-7 text-sm">
            <p>
              <span className="font-medium">
                {loading ? "—" : activeOrders.length}
              </span>{" "}
              <span className="text-[#817870]">active orders</span>
            </p>

            <p>
              <span className="font-medium">
                {loading ? "—" : orders.length}
              </span>{" "}
              <span className="text-[#817870]">total orders</span>
            </p>
          </div>
        </div>
      </section>

      {settingsOpen && (
        <div className="fixed inset-0 z-[170]">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-[#25211d]/30 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-[min(420px,92vw)] flex-col border-l border-[#b9afa5] bg-[#eee8df] shadow-[-24px_0_80px_rgba(37,33,29,0.16)]">
            <div className="flex items-start justify-between border-b border-[#cfc6bd] px-6 py-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
                  Account settings
                </p>

                <p className="mt-2 text-xl font-medium">Your details</p>

                {email && (
                  <p className="mt-2 text-xs text-[#817870]">{email}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-9 w-9 items-center justify-center border border-[#aaa097] text-xl font-light"
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <div className="flex-1 px-6 py-5">
              <SettingsLink
                href="/account/profile"
                title="Profile & security"
                detail="Name, phone, email and password"
              />

              <SettingsLink
                href="/account/addresses"
                title="Addresses"
                detail="Saved delivery details"
              />

              <SettingsLink
                href="/account/orders"
                title="Order history"
                detail="Past and current purchases"
              />

              <SettingsLink
                href="/saved"
                title="Saved pieces"
                detail="Return to your saved collection"
              />
            </div>

            <div className="border-t border-[#cfc6bd] p-6">
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="flex w-full items-center justify-between border border-[#765149] bg-[#765149] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#67443e] disabled:opacity-40"
              >
                <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                <span>→</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function SettingsLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-5 border-b border-[#d6cec5] py-5"
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#817870]">{detail}</p>
      </div>

      <span className="transition group-hover:translate-x-1">→</span>
    </Link>
  );
}

function getAttentionTitle(order: Order) {
  const cancellationPending =
    order.order_cancellation_requests?.some(
      (request) => request.status === "pending",
    ) ?? false;

  if (cancellationPending) {
    return "Cancellation request under review";
  }

  if (order.refund_status === "required") {
    return "Refund still pending";
  }

  return "Payment still required";
}

function getAttentionDetail(order: Order) {
  const cancellationPending =
    order.order_cancellation_requests?.some(
      (request) => request.status === "pending",
    ) ?? false;

  if (cancellationPending) {
    return "Studio MONTRO has received your request. Your order remains active until the review is complete.";
  }

  if (order.refund_status === "required") {
    return "Your cancelled order still has a verified payment waiting to be refunded.";
  }

  return "Complete your bank transfer and submit payment proof before the 24-hour payment window expires.";
}

function getOrderSummary(order: Order) {
  if (order.status === "delivered") {
    return "Delivered. The full order history remains available whenever you need it.";
  }

  if (order.status === "shipped") {
    return "Your order has left the studio and is on the way.";
  }

  if (order.status === "ready_to_ship") {
    return "Your pieces are prepared and waiting for dispatch.";
  }

  if (order.status === "processing") {
    return "Studio MONTRO is preparing your pieces.";
  }

  if (order.payment_proof_url) {
    return "Your payment proof is waiting for studio verification.";
  }

  return "Your order is reserved while we wait for payment.";
}
