"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { authFetch } from "@/src/lib/authFetch";

type CancellationRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type OrderItem = {
  id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
};

type Order = {
  id: string;
  status:
    | "pending_payment"
    | "processing"
    | "ready_to_ship"
    | "shipped"
    | "delivered"
    | "cancelled";
  payment_status: "pending" | "verified";
  payment_proof_url: string | null;
  refund_status?: "not_required" | "required" | "completed";
  total: number;
  created_at: string;
  order_items: OrderItem[];
  order_cancellation_requests?: CancellationRequest[];
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  primary_image: string | null;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const response = await authFetch(`${API_URL}/orders`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail ?? "Unable to load your orders.");
        }

        if (!cancelled) {
          setOrders(data as Order[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load your orders.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) return;

        const data = (await response.json()) as CatalogProduct[];

        if (!cancelled) {
          setCatalog(data);
        }
      } catch (err) {
        console.error("Unable to load order product images:", err);
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "delivered" && order.status !== "cancelled",
      ),
    [orders],
  );

  const catalogById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );

  const catalogByName = useMemo(
    () =>
      new Map(
        catalog.map((product) => [product.name.trim().toLowerCase(), product]),
      ),
    [catalog],
  );

  function resolveProduct(item: OrderItem) {
    if (item.product_id) {
      const product = catalogById.get(item.product_id);
      if (product) return product;
    }

    return catalogByName.get(item.product_name.trim().toLowerCase()) ?? null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 text-[#25211d] md:pt-10">
        <p className="text-sm text-[#756d65]">Loading your orders...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 text-[#25211d] md:pt-10">
      <header className="border-b border-[#cec6bc] pb-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/account"
              className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178] transition hover:text-[#25211d]"
            >
              ← My account
            </Link>

            <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              <span className="text-[#4b1f26]">Your orders</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#756d65]">
              Follow payment, preparation, delivery and any cancellation or
              refund activity in one place.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex w-fit items-center gap-3 border border-[#25211d] px-5 py-3 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
          >
            Continue shopping
            <span>→</span>
          </Link>
        </div>
      </header>

      {error && (
        <div className="mt-8 border border-[#b48b83] bg-[#efe0dc] p-4 text-sm text-[#713f38]">
          {error}
        </div>
      )}

      {!error && orders.length === 0 ? (
        <section className="py-16">
          <p className="text-2xl font-medium">No orders yet.</p>

          <p className="mt-3 text-sm text-[#756d65]">
            Pieces you purchase will appear here.
          </p>

          <Link
            href="/products"
            className="mt-7 inline-flex border border-[#5f6f59] bg-[#5f6f59] px-5 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
          >
            Explore collection
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 border-b border-[#cec6bc] py-8 sm:grid-cols-3">
            <Metric label="All orders" value={orders.length} />
            <Metric label="Active" value={activeOrders.length} />
            <Metric
              label="Completed"
              value={
                orders.filter((order) => order.status === "delivered").length
              }
            />
          </section>

          <section>
            {orders.map((order) => {
              const pendingCancellation =
                order.order_cancellation_requests?.some(
                  (request) => request.status === "pending",
                ) ?? false;

              const attention = getOrderLabel(order, pendingCancellation);

              const pieceCount =
                order.order_items?.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                ) ?? 0;

              const visibleItems = order.order_items.slice(0, 3);
              const hiddenCount = Math.max(
                order.order_items.length - visibleItems.length,
                0,
              );

              return (
                <article
                  key={order.id}
                  className="border-b border-[#cec6bc] py-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                        Order
                      </p>

                      <p className="mt-2 text-base font-medium">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>

                      <p className="mt-1 text-xs text-[#817870]">
                        {new Date(order.created_at).toLocaleDateString(
                          "en-MY",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit border px-3 py-1.5 text-[10px] uppercase tracking-[0.09em] ${getStatusTone(
                        attention.type,
                      )}`}
                    >
                      {attention.label}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_190px]">
                    <div>
                      <div className="space-y-4">
                        {visibleItems.map((item) => {
                          const product = resolveProduct(item);

                          return (
                            <div
                              key={item.id}
                              className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4"
                            >
                              <div className="h-20 overflow-hidden bg-[#e5dfd6]">
                                {product?.primary_image ? (
                                  <img
                                    src={product.primary_image}
                                    alt={item.product_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center px-2 text-center">
                                    <span className="text-[8px] uppercase tracking-[0.12em] text-[#9a9188]">
                                      Studio MONTRO
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {item.product_name}
                                </p>

                                <p className="mt-1 text-xs text-[#817870]">
                                  Qty {item.quantity}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hiddenCount > 0 && (
                        <p className="mt-4 text-xs text-[#817870]">
                          + {hiddenCount} more item
                          {hiddenCount === 1 ? "" : "s"}
                        </p>
                      )}

                      <p className="mt-5 text-xs leading-5 text-[#756d65]">
                        {attention.detail}
                      </p>
                    </div>

                    <div className="flex flex-col justify-between border-t border-[#cec6bc] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:text-right">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                          Total
                        </p>

                        <p className="mt-2 text-xl font-medium">
                          RM{" "}
                          {Number(order.total).toLocaleString("en-MY", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>

                        <p className="mt-2 text-xs text-[#91877e]">
                          {pieceCount} {pieceCount === 1 ? "piece" : "pieces"}
                        </p>
                      </div>

                      <Link
                        href={`/account/orders/${order.id}`}
                        className="mt-6 inline-flex items-center gap-3 text-sm text-[#4b1f26] lg:justify-end"
                      >
                        View order
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-[#25211d] pt-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-medium">{value}</p>
    </div>
  );
}

function getOrderLabel(order: Order, pendingCancellation: boolean) {
  if (pendingCancellation) {
    return {
      type: "attention" as const,
      label: "Cancellation requested",
      detail: "Your request is waiting for studio review.",
    };
  }

  if (order.status === "cancelled" && order.refund_status === "required") {
    return {
      type: "attention" as const,
      label: "Refund pending",
      detail: "Your order was cancelled and a refund is due.",
    };
  }

  if (order.status === "cancelled" && order.refund_status === "completed") {
    return {
      type: "complete" as const,
      label: "Refund completed",
      detail: "The refund for this cancelled order is complete.",
    };
  }

  if (order.status === "cancelled") {
    return {
      type: "muted" as const,
      label: "Cancelled",
      detail: "This order has been closed.",
    };
  }

  if (order.status === "delivered") {
    return {
      type: "complete" as const,
      label: "Delivered",
      detail: "Your order has been delivered.",
    };
  }

  if (order.status === "shipped") {
    return {
      type: "progress" as const,
      label: "Shipped",
      detail: "Your order is on the way.",
    };
  }

  if (order.status === "ready_to_ship") {
    return {
      type: "progress" as const,
      label: "Ready to ship",
      detail: "Your order is prepared for dispatch.",
    };
  }

  if (order.status === "processing") {
    return {
      type: "progress" as const,
      label: "Preparing",
      detail: "Studio MONTRO is preparing your order.",
    };
  }

  if (order.payment_status === "verified") {
    return {
      type: "complete" as const,
      label: "Payment verified",
      detail: "Payment is confirmed.",
    };
  }

  if (order.payment_proof_url) {
    return {
      type: "progress" as const,
      label: "Payment review",
      detail: "Your payment proof is awaiting verification.",
    };
  }

  return {
    type: "attention" as const,
    label: "Awaiting payment",
    detail: "Complete payment within the 24-hour window.",
  };
}

function getStatusTone(type: "attention" | "progress" | "complete" | "muted") {
  if (type === "attention") {
    return "border-[#765149] bg-[#765149] text-[#f4f0e9]";
  }

  if (type === "progress") {
    return "border-[#8c795f] bg-[#8c795f] text-[#f4f0e9]";
  }

  if (type === "complete") {
    return "border-[#5f6f59] bg-[#5f6f59] text-[#f4f0e9]";
  }

  return "border-[#9a9086] text-[#6f675f]";
}
