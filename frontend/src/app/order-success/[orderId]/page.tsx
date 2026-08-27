"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";
import CustomerOrderPayment from "@/src/components/CustomerOrderPayment";

type Address = {
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  country: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  color_name: string | null;
};

type Order = {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_proof_url: string | null;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
  addresses: Address | Address[] | null;
  order_items: OrderItem[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const MONTRO_WHATSAPP =
  process.env.NEXT_PUBLIC_MONTRO_WHATSAPP ?? "601110620470";

export default function OrderSuccessPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showWhatsAppNotice, setShowWhatsAppNotice] = useState(false);

  async function loadOrder() {
    const response = await authFetch(`${API_URL}/orders/${orderId}`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail ?? "Unable to load your order.");
    }

    setError("");
    setOrder(data as Order);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setIsAuthenticated(false);
          }
          return;
        }

        const response = await authFetch(`${API_URL}/orders/${orderId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail ?? "Unable to load your order.");
        }

        if (!cancelled) {
          setIsAuthenticated(true);
          setOrder(data as Order);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load your order.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (orderId) {
      void initialLoad();
    }

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading || isAuthenticated === null) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Confirming your order...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="border-b border-[#cec6bc] pb-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
            Order access
          </p>
          <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Sign in to view this order.
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[460px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              This order is connected to your account.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Sign in with the account used at checkout to continue payment or
              review this order.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="bg-[#765149] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="bg-[#5f6f59] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#8b3a34]">{error || "Order not found."}</p>

        <Link
          href="/products"
          className="mt-7 inline-block border-b border-[#25211d] pb-1 text-sm"
        >
          Return to shop
        </Link>
      </main>
    );
  }

  const address = Array.isArray(order.addresses)
    ? (order.addresses[0] ?? null)
    : order.addresses;

  const whatsappMessage = [
    "Hi Studio MONTRO,",
    "",
    "I have completed the payment step for my order.",
    "",
    `Order reference: ${order.id}`,
    `Amount: RM ${Number(order.total).toLocaleString("en-MY", {
      maximumFractionDigits: 2,
    })}`,
    "Payment proof: Submitted on Studio MONTRO website",
    address?.recipient_name ? `Customer: ${address.recipient_name}` : null,
    address?.phone ? `Phone: ${address.phone}` : null,
    "",
    "Please verify my payment when available. Thank you.",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/${MONTRO_WHATSAPP}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-28 pt-8 md:pt-10 text-[#25211d]">
      <section className="border-b border-[#cec6bc] pb-12">
        <p className="text-[11px] uppercase tracking-[0.17em] text-[#817870]">
          Order received
        </p>

        <p className="mt-5 max-w-4xl text-5xl font-medium leading-[0.98] tracking-[-0.045em] md:text-7xl">
          Thank you.
        </p>

        <p className="mt-7 max-w-xl text-sm leading-7 text-[#6f675f]">
          Your order is reserved. Complete payment within the payment window,
          then you can follow verification and delivery from your account.
        </p>
      </section>

      <section className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="grid gap-8 border-b border-[#cec6bc] pb-9 sm:grid-cols-2">
            <Info label="Order reference">
              <p className="mt-3 break-all text-sm">{order.id}</p>
            </Info>

            <Info label="Status">
              <p className="mt-3 text-sm capitalize">
                {order.status.replaceAll("_", " ")}
              </p>
            </Info>

            <Info label="Payment">
              <p className="mt-3 text-sm capitalize">{order.payment_status}</p>
            </Info>

            <Info label="Placed">
              <p className="mt-3 text-sm">
                {new Date(order.created_at).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Info>
          </div>

          <div className="py-9">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
              Pieces
            </p>

            <div className="mt-5 divide-y divide-[#d5cec5] border-y border-[#cec6bc]">
              {(order.order_items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-6 py-5"
                >
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>

                    <p className="mt-1 text-xs text-[#817870]">
                      Qty {item.quantity}
                      {item.color_name ? ` · ${item.color_name}` : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm">
                    RM{" "}
                    {(
                      Number(item.unit_price) * Number(item.quantity)
                    ).toLocaleString("en-MY", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#cec6bc] pt-7">
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/account/orders/${order.id}`}
                className="inline-flex items-center gap-3 border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                View order details
                <span>→</span>
              </Link>

              <Link
                href="/products"
                className="inline-flex items-center gap-3 border border-[#25211d] px-5 py-3.5 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
              >
                Continue shopping
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        <aside>
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                Payment
              </p>

              <div className="mt-4">
                <CustomerOrderPayment
                  orderId={order.id}
                  total={Number(order.total)}
                  createdAt={order.created_at}
                  status={order.status}
                  paymentStatus={order.payment_status}
                  paymentProofUrl={order.payment_proof_url}
                  onUpdated={loadOrder}
                  onProofSubmitted={() => {
                    setShowWhatsAppNotice(true);
                  }}
                  autoOpen
                  showReminder
                />
              </div>
            </div>

            {address && (
              <div className="border-b border-[#cec6bc] py-6">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                  Delivery address
                </p>

                <p className="mt-4 text-sm font-medium">
                  {address.recipient_name}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#756d65]">
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ""}
                  <br />
                  {address.postcode} {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  <br />
                  {address.country}
                </p>

                <p className="mt-2 text-sm text-[#756d65]">{address.phone}</p>
              </div>
            )}

            <div className="py-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#756d65]">Total</p>

                <p className="text-xl font-medium">
                  RM{" "}
                  {Number(order.total).toLocaleString("en-MY", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {showWhatsAppNotice && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-[#25211d]/20 px-6 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[430px] border border-[#cfc7bd] bg-[#f4f0e9] px-7 py-7 text-center shadow-[0_24px_70px_rgba(37,33,29,0.18)]">
            <button
              type="button"
              onClick={() => setShowWhatsAppNotice(false)}
              aria-label="Close notification"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-xl font-light leading-none text-[#7b726a] transition hover:text-[#25211d]"
            >
              ×
            </button>

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#9f968d]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4 4L19 7" />
              </svg>
            </div>

            <p className="mt-5 text-lg font-medium tracking-[-0.02em]">
              Payment proof received
            </p>

            <p className="mt-3 text-sm leading-6 text-[#756d65]">
              Your payment proof is safely stored with this order. You can also
              notify Studio MONTRO on WhatsApp so the team sees your order
              reference and payment details right away.
            </p>

            <p className="mt-4 text-xs leading-5 text-[#8a8178]">
              This step is optional. WhatsApp will open with a prepared message
              for you to review before sending.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShowWhatsAppNotice(false)}
              className="mt-6 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d]"
            >
              <span>Notify studio on WhatsApp</span>
              <span>→</span>
            </a>

            <button
              type="button"
              onClick={() => setShowWhatsAppNotice(false)}
              className="mt-3 text-xs text-[#756d65] underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
        {label}
      </p>
      {children}
    </div>
  );
}
