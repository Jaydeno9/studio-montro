"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { authFetch } from "@/src/lib/authFetch";
import CustomerCancellationRequest, {
  type CancellationRequest,
} from "@/src/components/CustomerCancellationRequest";
import CustomerOrderPayment from "@/src/components/CustomerOrderPayment";
import CustomerOrderProgress from "@/src/components/CustomerOrderProgress";

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
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  color_name: string | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  primary_image: string | null;
};

type OrderHistory = {
  id: string;
  status: string;
  changed_at: string;
};

type RefundHistory = {
  id: string;
  event: "required" | "completed";
  amount: number;
  reference: string | null;
  created_at: string;
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
  payment_method: string | null;
  payment_proof_url: string | null;
  payment_proof_submitted_at: string | null;
  refund_status: "not_required" | "required" | "completed";
  refund_reference: string | null;
  refund_note: string | null;
  refunded_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
  addresses: Address | Address[] | null;
  order_items: OrderItem[];
  order_status_history: OrderHistory[];
  order_refund_history: RefundHistory[];
  order_cancellation_requests: CancellationRequest[];
};

type TimelineEvent = {
  key: string;
  label: string;
  detail?: string;
  at: string;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function AccountOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/orders/${orderId}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to load your order.");
      }

      setError("");
      setOrder(data as Order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your order.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await authFetch(`${API_URL}/orders/${orderId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail ?? "Unable to load your order.");
        }

        if (!cancelled) {
          setError("");
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

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

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

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!order) return [];

    const events: TimelineEvent[] = [
      {
        key: "created",
        label: "Order placed",
        detail: "Your order was created and inventory reserved.",
        at: order.created_at,
      },
    ];

    if (order.payment_proof_submitted_at) {
      events.push({
        key: "payment-proof-submitted",
        label: "Payment proof submitted",
        detail: "Your transfer receipt was received for studio verification.",
        at: order.payment_proof_submitted_at,
      });
    }

    for (const item of order.order_status_history ?? []) {
      if (item.status === "pending_payment") continue;

      events.push({
        key: `status-${item.id}`,
        label: formatStatusEvent(item.status),
        at: item.changed_at,
      });
    }

    for (const request of order.order_cancellation_requests ?? []) {
      events.push({
        key: `cancel-${request.id}`,
        label:
          request.status === "pending"
            ? "Cancellation requested"
            : request.status === "approved"
              ? "Cancellation request approved"
              : "Cancellation request declined",
        detail:
          request.status === "pending"
            ? request.reason
            : (request.resolution_message ?? undefined),
        at: request.reviewed_at ?? request.created_at,
      });
    }

    for (const refund of order.order_refund_history ?? []) {
      events.push({
        key: `refund-${refund.id}`,
        label:
          refund.event === "required" ? "Refund required" : "Refund completed",
        detail:
          refund.event === "completed" && refund.reference
            ? `Reference: ${refund.reference}`
            : undefined,
        at: refund.created_at,
      });
    }

    return events.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [order]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 text-[#25211d] md:pt-10">
        <p className="text-sm text-[#756d65]">Loading order...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 text-[#25211d] md:pt-10">
        <p className="text-sm text-[#713f38]">{error || "Order not found."}</p>

        <Link
          href="/account/orders"
          className="mt-6 inline-block border-b border-[#25211d] pb-1 text-sm"
        >
          Back to orders
        </Link>
      </main>
    );
  }

  const address = Array.isArray(order.addresses)
    ? (order.addresses[0] ?? null)
    : order.addresses;

  function resolveProduct(item: OrderItem) {
    if (item.product_id) {
      const product = catalogById.get(item.product_id);
      if (product) return product;
    }

    return catalogByName.get(item.product_name.trim().toLowerCase()) ?? null;
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 text-[#25211d] md:pt-10">
      <header className="border-b border-[#cec6bc] pb-9">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link
            href="/account/orders"
            className="text-[#6f675f] transition hover:text-[#25211d]"
          >
            ← Your orders
          </Link>

          <span className="text-[#b2a89e]">/</span>

          <Link
            href="/account"
            className="text-[#817870] transition hover:text-[#25211d]"
          >
            My account
          </Link>
        </div>

        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              Order detail
            </p>

            <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              <span className="text-[#4b1f26]">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </h1>

            <p className="mt-3 text-sm text-[#756d65]">
              Placed{" "}
              {new Date(order.created_at).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <span className="w-fit border border-[#8f867d] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em]">
            {order.status.replaceAll("_", " ")}
          </span>
        </div>
      </header>

      <div className="py-9">
        <CustomerOrderProgress
          status={order.status}
          paymentStatus={order.payment_status}
          hasPaymentProof={Boolean(order.payment_proof_url)}
          refundStatus={order.refund_status}
        />
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-12">
          <section>
            <SectionLabel>Pieces</SectionLabel>

            <div className="mt-5 divide-y divide-[#d8d0c7] border-y border-[#cec6bc]">
              {order.order_items.map((item) => {
                const product = resolveProduct(item);

                const content = (
                  <>
                    <div className="h-28 w-24 shrink-0 overflow-hidden bg-[#e5dfd6] sm:h-32 sm:w-28">
                      {product?.primary_image ? (
                        <img
                          src={product.primary_image}
                          alt={item.product_name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center">
                          <span className="text-[8px] uppercase tracking-[0.12em] text-[#9a9188]">
                            Studio MONTRO
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium">
                        {item.product_name}
                      </p>

                      <p className="mt-2 text-xs text-[#817870]">
                        Qty {item.quantity}
                        {item.color_name ? ` · ${item.color_name}` : ""}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm">
                      RM{" "}
                      {(
                        Number(item.unit_price) * Number(item.quantity)
                      ).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </>
                );

                if (product?.slug) {
                  return (
                    <Link
                      key={item.id}
                      href={`/products/${product.slug}`}
                      className="group flex items-center gap-5 py-5"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="group flex items-center gap-5 py-5"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </section>

          <CustomerCancellationRequest
            orderId={order.id}
            orderStatus={order.status}
            paymentStatus={order.payment_status}
            requests={order.order_cancellation_requests ?? []}
            onUpdated={loadOrder}
          />

          {order.status === "cancelled" && (
            <section className="border-t border-[#cec6bc] pt-6">
              <SectionLabel>Cancellation & refund</SectionLabel>

              {order.cancellation_reason && (
                <div className="mt-5">
                  <p className="text-xs text-[#91877e]">Cancellation reason</p>
                  <p className="mt-2 text-sm leading-6 text-[#625a53]">
                    {order.cancellation_reason}
                  </p>
                </div>
              )}

              <div className="mt-5 border border-[#cec6bc] p-5">
                <p className="text-sm font-medium">
                  {order.refund_status === "required"
                    ? "Refund pending"
                    : order.refund_status === "completed"
                      ? "Refund completed"
                      : "No refund required"}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#756d65]">
                  {order.refund_status === "required"
                    ? "Studio MONTRO is arranging the return of your verified payment."
                    : order.refund_status === "completed"
                      ? "The required refund has been completed."
                      : "No verified payment needs to be returned for this order."}
                </p>

                {order.refund_reference && (
                  <p className="mt-3 text-xs text-[#625a53]">
                    Refund reference: {order.refund_reference}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="border-t border-[#cec6bc] pt-6">
            <SectionLabel>Order history</SectionLabel>

            <div className="mt-5 border-t border-[#cec6bc]">
              {timeline.map((event, index) => (
                <div
                  key={event.key}
                  className="grid grid-cols-[22px_minmax(0,1fr)] gap-4 border-b border-[#ddd5cc] py-5"
                >
                  <div className="relative flex justify-center">
                    <div className="mt-1 h-2 w-2 bg-[#25211d]" />

                    {index < timeline.length - 1 && (
                      <div className="absolute top-4 h-[calc(100%+4px)] w-px bg-[#cec6bc]" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{event.label}</p>

                      {event.detail && (
                        <p className="mt-1 text-xs leading-5 text-[#756d65]">
                          {event.detail}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 text-xs text-[#91877e]">
                      {new Date(event.at).toLocaleString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-6">
              <SectionLabel>Payment</SectionLabel>

              <div className="mt-4">
                <CustomerOrderPayment
                  orderId={order.id}
                  total={Number(order.total)}
                  createdAt={order.created_at}
                  status={order.status}
                  paymentStatus={order.payment_status}
                  paymentProofUrl={order.payment_proof_url}
                  onUpdated={loadOrder}
                />
              </div>
            </div>

            <div className="border-b border-[#cec6bc] py-6">
              <SectionLabel>Order total</SectionLabel>

              <div className="mt-4 flex justify-between gap-5 text-sm">
                <span className="text-[#756d65]">Subtotal</span>

                <span>
                  RM{" "}
                  {Number(order.subtotal).toLocaleString("en-MY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="mt-4 flex justify-between gap-5 border-t border-[#ddd5cc] pt-4">
                <span className="text-sm font-medium">Total</span>

                <span className="text-xl font-medium">
                  RM{" "}
                  {Number(order.total).toLocaleString("en-MY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {address && (
              <div className="py-6">
                <SectionLabel>Delivery address</SectionLabel>

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
          </div>
        </aside>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
      {children}
    </p>
  );
}

function formatStatusEvent(status: string) {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting payment",
    processing: "Payment verified · Order preparation started",
    ready_to_ship: "Order ready to ship",
    shipped: "Order shipped",
    delivered: "Order delivered",
    cancelled: "Order cancelled",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}
