"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/src/lib/adminFetch";
import { supabase } from "@/src/lib/supabase";
import AdminCancellationRequestPanel, {
  type AdminCancellationRequest,
} from "@/src/app/admin/AdminCancellationRequestPanel";

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

type CustomerProfile = {
  full_name: string | null;
  phone: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  selected_color_id: string | null;
  color_name: string | null;
};

type OrderHistory = {
  id: string;
  status: string;
  changed_by: string | null;
  changed_at: string;
};

type RefundStatus = "not_required" | "required" | "completed";

type RefundHistory = {
  id: string;
  order_id: string;
  event: "required" | "completed";
  amount: number;
  reference: string | null;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

type Order = {
  id: string;
  user_id: string;
  status:
    | "pending_payment"
    | "processing"
    | "ready_to_ship"
    | "shipped"
    | "delivered"
    | "cancelled";
  payment_status: "pending" | "verified";
  refund_status: RefundStatus;
  refund_reference: string | null;
  refund_note: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  payment_method: string | null;
  payment_proof_url: string | null;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  order_items: OrderItem[];
  addresses: Address | Address[] | null;
  customer_profiles: CustomerProfile | CustomerProfile[] | null;
  order_status_history: OrderHistory[];
  order_refund_history: RefundHistory[];
  order_cancellation_requests: AdminCancellationRequest[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending_payment: "Pending payment",
  processing: "Processing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Partial<Record<Order["status"], Order["status"]>> = {
  processing: "ready_to_ship",
  ready_to_ship: "shipped",
  shipped: "delivered",
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReference, setRefundReference] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      setError("");

      const response = await adminFetch(`${API_URL}/admin/orders/${orderId}`);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to load this order.");
      }

      setOrder(data as Order);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load this order.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOrder]);

  useEffect(() => {
    let cancelled = false;
    const proofPath = order?.payment_proof_url ?? null;

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      if (!proofPath) {
        setProofSignedUrl(null);
        setProofError("");
        setProofLoading(false);
        return;
      }

      async function loadProof(path: string) {
        try {
          setProofLoading(true);
          setProofError("");

          const { data, error: signedUrlError } = await supabase.storage
            .from("payment-proofs")
            .createSignedUrl(path, 300);

          if (signedUrlError) {
            throw signedUrlError;
          }

          if (!cancelled) {
            setProofSignedUrl(data.signedUrl);
          }
        } catch (err) {
          console.error(err);

          if (!cancelled) {
            setProofError(
              err instanceof Error
                ? err.message
                : "Unable to load payment proof.",
            );
          }
        } finally {
          if (!cancelled) {
            setProofLoading(false);
          }
        }
      }

      void loadProof(proofPath);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [order?.payment_proof_url]);

  const address = order?.addresses
    ? Array.isArray(order.addresses)
      ? (order.addresses[0] ?? null)
      : order.addresses
    : null;

  const customer = order?.customer_profiles
    ? Array.isArray(order.customer_profiles)
      ? (order.customer_profiles[0] ?? null)
      : order.customer_profiles
    : null;

  async function verifyPayment() {
    if (!order || busyAction) return;

    try {
      setBusyAction("verify");
      setActionMessage("");

      const response = await adminFetch(
        `${API_URL}/admin/orders/${order.id}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_status: "verified" }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to verify payment.");
      }

      setActionMessage("Payment verified. Order moved to processing.");

      await loadOrder();
    } catch (err) {
      console.error(err);
      setActionMessage(
        err instanceof Error ? err.message : "Unable to verify payment.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function updateStatus(
    nextStatus: Order["status"],
    cancellationReason?: string,
  ) {
    if (!order || busyAction) return;

    try {
      setBusyAction(nextStatus);
      setActionMessage("");

      const response = await adminFetch(
        `${API_URL}/admin/orders/${order.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            cancellation_reason:
              nextStatus === "cancelled"
                ? cancellationReason?.trim() || null
                : null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to update order status.");
      }

      setActionMessage(
        `Order moved to ${STATUS_LABELS[nextStatus].toLowerCase()}.`,
      );

      await loadOrder();
    } catch (err) {
      console.error(err);
      setActionMessage(
        err instanceof Error ? err.message : "Unable to update order status.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmCancelOrder() {
    if (!order || busyAction) return;

    setCancelOpen(false);
    await updateStatus("cancelled", cancelReason);
    setCancelReason("");
  }

  async function completeRefund() {
    if (!order || busyAction || !refundReference.trim()) {
      return;
    }

    try {
      setBusyAction("refund");
      setActionMessage("");

      const response = await adminFetch(
        `${API_URL}/admin/orders/${order.id}/refund`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: refundReference.trim(),
            note: refundNote.trim() || null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to complete refund.");
      }

      setRefundOpen(false);
      setRefundReference("");
      setRefundNote("");
      setActionMessage("Refund marked as completed.");

      await loadOrder();
    } catch (err) {
      console.error(err);
      setActionMessage(
        err instanceof Error ? err.message : "Unable to complete refund.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-28 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Loading order...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-28 text-[#25211d]">
        <p className="text-sm text-[#8b3a34]">{error || "Order not found."}</p>

        <Link
          href="/admin/orders"
          className="mt-6 inline-flex border-b border-[#25211d] pb-1 text-sm"
        >
          Back to orders
        </Link>
      </main>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const canCancel =
    order.status === "pending_payment" ||
    order.status === "processing" ||
    order.status === "ready_to_ship";
  const canVerify =
    order.status === "pending_payment" &&
    order.payment_status === "pending" &&
    Boolean(order.payment_proof_url);

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-28 pt-28 text-[#25211d]">
      <div className="border-b border-[#cec6bc] pb-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-[#6f675f] transition hover:text-[#25211d]"
        >
          <span>←</span>
          Orders
        </Link>

        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
              Order detail
            </p>

            <p className="mt-3 break-all text-3xl font-medium tracking-[-0.03em] md:text-5xl">
              {order.id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="order" value={order.status}>
              {STATUS_LABELS[order.status]}
            </StatusPill>

            <StatusPill kind="payment" value={order.payment_status}>
              Payment: {order.payment_status}
            </StatusPill>

            {order.refund_status !== "not_required" && (
              <StatusPill>
                Refund: {order.refund_status.replaceAll("_", " ")}
              </StatusPill>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-12 pt-10 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-12">
          <section>
            <div className="flex items-end justify-between gap-6">
              <div>
                <SectionLabel>Pieces</SectionLabel>
                <p className="mt-2 text-sm text-[#746c64]">
                  {order.order_items?.reduce(
                    (sum, item) => sum + Number(item.quantity),
                    0,
                  ) ?? 0}{" "}
                  item
                  {(order.order_items?.reduce(
                    (sum, item) => sum + Number(item.quantity),
                    0,
                  ) ?? 0) === 1
                    ? ""
                    : "s"}{" "}
                  in this order
                </p>
              </div>

              <p className="text-sm font-medium">
                RM{" "}
                {Number(order.subtotal).toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="mt-5 divide-y divide-[#d4ccc3] border-y border-[#cec6bc]">
              {(order.order_items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="grid gap-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div>
                    <p className="text-lg font-medium tracking-[-0.015em] md:text-xl">
                      {item.product_name}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#756d65]">
                      <span>
                        Quantity{" "}
                        <span className="font-medium text-[#25211d]">
                          {item.quantity}
                        </span>
                      </span>

                      {item.color_name && (
                        <>
                          <span className="text-[#aaa198]">·</span>
                          <span>
                            Finish{" "}
                            <span className="font-medium text-[#25211d]">
                              {item.color_name}
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-[#91877e]">
                      RM{" "}
                      {Number(item.unit_price).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      each
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                      Line total
                    </p>

                    <p className="mt-1 text-xl font-medium tracking-[-0.02em]">
                      RM{" "}
                      {(
                        Number(item.unit_price) * Number(item.quantity)
                      ).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5">
              <SectionLabel>Customer & delivery</SectionLabel>
              <p className="mt-2 text-sm text-[#746c64]">
                Information to use for fulfilment and customer contact.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="mt-5 border-t border-[#cec6bc] pt-5">
                  <p className="text-sm font-medium">
                    {customer?.full_name || "Customer"}
                  </p>

                  {customer?.phone && (
                    <p className="mt-2 text-sm text-[#756d65]">
                      {customer.phone}
                    </p>
                  )}

                  <p className="mt-3 break-all text-xs text-[#938a81]">
                    User ID: {order.user_id}
                  </p>
                </div>
              </div>

              <div>
                <SectionLabel>Delivery address</SectionLabel>

                <div className="mt-5 border-t border-[#cec6bc] pt-5">
                  {address ? (
                    <>
                      <p className="text-sm font-medium">
                        {address.recipient_name}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#756d65]">
                        {address.address_line1}
                        {address.address_line2
                          ? `, ${address.address_line2}`
                          : ""}
                        <br />
                        {address.postcode} {address.city}
                        {address.state ? `, ${address.state}` : ""}
                        <br />
                        {address.country}
                      </p>

                      <p className="mt-2 text-sm text-[#756d65]">
                        {address.phone}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#8a8178]">
                      No delivery address.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-5">
              <div>
                <SectionLabel>Order history</SectionLabel>
                <p className="mt-2 text-sm text-[#746c64]">
                  A chronological record of the order lifecycle.
                </p>
              </div>

              <p className="text-xs text-[#91877e]">
                Last updated{" "}
                {new Date(order.updated_at ?? order.created_at).toLocaleString(
                  "en-MY",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </p>
            </div>

            <div className="mt-5 border-t border-[#cec6bc]">
              {[...(order.order_status_history ?? [])]
                .sort(
                  (a, b) =>
                    new Date(a.changed_at).getTime() -
                    new Date(b.changed_at).getTime(),
                )
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-6 border-b border-[#ddd5cc] py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6e655d]" />
                      <p className="text-sm font-medium capitalize">
                        {entry.status.replaceAll("_", " ")}
                      </p>
                    </div>

                    <p className="text-xs text-[#8a8178]">
                      {new Date(entry.changed_at).toLocaleString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
            </div>
          </section>

          {order.order_refund_history?.length > 0 && (
            <section>
              <div>
                <SectionLabel>Refund history</SectionLabel>
                <p className="mt-2 text-sm text-[#746c64]">
                  Manual refund actions recorded for this cancelled order.
                </p>
              </div>

              <div className="mt-5 border-t border-[#cec6bc]">
                {[...order.order_refund_history]
                  .sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime(),
                  )
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="grid gap-4 border-b border-[#ddd5cc] py-4 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          Refund {entry.event}
                        </p>

                        <p className="mt-1 text-xs text-[#756d65]">
                          RM{" "}
                          {Number(entry.amount).toLocaleString("en-MY", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>

                        {entry.reference && (
                          <p className="mt-2 text-xs text-[#756d65]">
                            Reference: {entry.reference}
                          </p>
                        )}

                        {entry.note && (
                          <p className="mt-1 text-xs leading-5 text-[#817870]">
                            {entry.note}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-[#8a8178] md:text-right">
                        {new Date(entry.created_at).toLocaleString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <SectionLabel>Payment review</SectionLabel>
                  <p className="mt-2 text-sm font-medium">
                    {order.payment_proof_url
                      ? order.payment_status === "verified"
                        ? "Payment verified"
                        : "Proof ready for review"
                      : "Waiting for proof"}
                  </p>
                </div>

                <StatusPill kind="payment" value={order.payment_status}>
                  {order.payment_status}
                </StatusPill>
              </div>
            </div>

            {!order.payment_proof_url ? (
              <div className="border-b border-[#cec6bc] py-7">
                <p className="text-sm font-medium">Waiting for customer</p>

                <p className="mt-2 text-sm leading-6 text-[#756d65]">
                  No payment proof has been submitted yet.
                </p>
              </div>
            ) : (
              <div className="border-b border-[#cec6bc] py-6">
                {proofLoading ? (
                  <div className="aspect-[4/5] bg-[#e8e1d8] p-5">
                    <p className="text-sm text-[#756d65]">Loading proof...</p>
                  </div>
                ) : proofError ? (
                  <div className="border border-[#a97068] p-4">
                    <p className="text-sm leading-6 text-[#7f3932]">
                      {proofError}
                    </p>
                  </div>
                ) : proofSignedUrl ? (
                  <>
                    {order.payment_proof_url.toLowerCase().endsWith(".pdf") ? (
                      <div className="border border-[#cec6bc] p-6 text-center">
                        <p className="text-sm font-medium">PDF payment proof</p>

                        <a
                          href={proofSignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex border-b border-[#25211d] pb-1 text-sm"
                        >
                          Open PDF →
                        </a>
                      </div>
                    ) : (
                      <a
                        href={proofSignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden border border-[#cec6bc] bg-[#e7e0d7]"
                      >
                        <img
                          src={proofSignedUrl}
                          alt="Customer payment proof"
                          className="max-h-[560px] w-full object-contain"
                        />
                      </a>
                    )}

                    <p className="mt-3 text-[11px] leading-5 text-[#8a8178]">
                      Private preview · signed link expires in 5 minutes.
                    </p>
                  </>
                ) : null}
              </div>
            )}

            <div className="border-b border-[#cec6bc] py-6">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                    Order total
                  </p>

                  <p className="mt-2 text-xs text-[#8a8178]">
                    {new Date(order.created_at).toLocaleString("en-MY", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <p className="text-2xl font-medium tracking-[-0.025em]">
                  RM{" "}
                  {Number(order.total).toLocaleString("en-MY", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {order.note && (
              <div className="border-b border-[#cec6bc] py-6">
                <SectionLabel>Customer note</SectionLabel>
                <p className="mt-3 text-sm leading-6 text-[#625a53]">
                  {order.note}
                </p>
              </div>
            )}

            {(order.order_cancellation_requests ?? []).some(
              (request) => request.status === "pending",
            ) && (
              <div className="border-b border-[#cec6bc] py-6">
                <AdminCancellationRequestPanel
                  orderId={order.id}
                  paymentStatus={order.payment_status}
                  requests={order.order_cancellation_requests ?? []}
                  onUpdated={loadOrder}
                />
              </div>
            )}

            {order.status === "cancelled" && (
              <div className="border-b border-[#cec6bc] py-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <SectionLabel>Cancellation & refund</SectionLabel>
                    <p className="mt-2 text-sm font-medium">
                      {order.refund_status === "required"
                        ? "Refund required"
                        : order.refund_status === "completed"
                          ? "Refund completed"
                          : "No refund required"}
                    </p>
                  </div>

                  <StatusPill>
                    {order.refund_status.replaceAll("_", " ")}
                  </StatusPill>
                </div>

                {order.cancellation_reason && (
                  <div className="mt-5 border-t border-[#ddd5cc] pt-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                      Cancellation reason
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#625a53]">
                      {order.cancellation_reason}
                    </p>
                  </div>
                )}

                {order.refund_status === "required" && (
                  <div className="mt-5 border border-[#b99690] p-5">
                    <p className="text-sm font-medium text-[#713f38]">
                      RM{" "}
                      {Number(order.total).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      still needs to be returned.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#756d65]">
                      Complete the bank transfer manually, then record the
                      transfer reference here.
                    </p>

                    <button
                      type="button"
                      onClick={() => setRefundOpen(true)}
                      disabled={Boolean(busyAction)}
                      className="mt-4 w-full bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] disabled:opacity-40"
                    >
                      Record completed refund
                    </button>
                  </div>
                )}

                {order.refund_status === "completed" && (
                  <div className="mt-5 border border-[#9fa894] p-5">
                    <p className="text-sm font-medium text-[#485342]">
                      Refund completed
                    </p>

                    {order.refund_reference && (
                      <p className="mt-2 text-xs text-[#756d65]">
                        Reference: {order.refund_reference}
                      </p>
                    )}

                    {order.refunded_at && (
                      <p className="mt-1 text-xs text-[#91877e]">
                        {new Date(order.refunded_at).toLocaleString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    {order.refund_note && (
                      <p className="mt-3 text-xs leading-5 text-[#756d65]">
                        {order.refund_note}
                      </p>
                    )}
                  </div>
                )}

                {order.refund_status === "not_required" && (
                  <p className="mt-4 text-xs leading-5 text-[#756d65]">
                    Payment was not verified before cancellation, so there is no
                    manual refund action outstanding.
                  </p>
                )}
              </div>
            )}

            <div className="py-6">
              <div className="mb-5">
                <SectionLabel>Admin actions</SectionLabel>
                <p className="mt-2 text-xs leading-5 text-[#817870]">
                  Only move the order forward when the current step has been
                  completed.
                </p>
              </div>

              {canVerify && (
                <button
                  type="button"
                  onClick={() => {
                    void verifyPayment();
                  }}
                  disabled={Boolean(busyAction)}
                  className="flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-45"
                >
                  <span>
                    {busyAction === "verify"
                      ? "Verifying..."
                      : "Verify payment & start processing"}
                  </span>
                  <span>✓</span>
                </button>
              )}

              {order.status === "pending_payment" &&
                !order.payment_proof_url && (
                  <div className="border border-[#cec6bc] px-5 py-4">
                    <p className="text-sm font-medium">
                      Awaiting payment proof
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#756d65]">
                      Verification becomes available after the customer submits
                      a proof.
                    </p>
                  </div>
                )}

              {nextStatus && (
                <button
                  type="button"
                  onClick={() => {
                    void updateStatus(nextStatus);
                  }}
                  disabled={Boolean(busyAction)}
                  className="mt-3 flex w-full items-center justify-between border border-[#25211d] px-5 py-4 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9] disabled:cursor-wait disabled:opacity-45"
                >
                  <span>
                    {busyAction === nextStatus
                      ? "Updating..."
                      : `Mark as ${STATUS_LABELS[nextStatus].toLowerCase()}`}
                  </span>
                  <span>→</span>
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelOpen(true);
                  }}
                  disabled={Boolean(busyAction)}
                  className="mt-4 w-full py-2 text-xs text-[#7c4c46] underline decoration-[#b99791] underline-offset-4 transition hover:text-[#582f2b] disabled:cursor-wait disabled:opacity-40"
                >
                  Cancel order and restore stock
                </button>
              )}

              {order.status === "delivered" && (
                <div className="border border-[#9fa894] px-5 py-4">
                  <p className="text-sm font-medium text-[#485342]">
                    Order delivered
                  </p>
                </div>
              )}

              {order.status === "cancelled" && (
                <div className="border border-[#b99690] px-5 py-4">
                  <p className="text-sm font-medium text-[#713f38]">
                    Order cancelled
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#756d65]">
                    Reserved stock has been returned to inventory.
                    {order.refund_status === "required"
                      ? " A manual refund is still required."
                      : ""}
                  </p>
                </div>
              )}

              {actionMessage && (
                <p className="mt-4 text-xs leading-5 text-[#625a53]">
                  {actionMessage}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {cancelOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-[#25211d]/35 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-[#9f958b] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.22)] md:p-7">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Cancel order
            </p>

            <p className="mt-3 text-2xl font-medium tracking-[-0.025em]">
              Cancel this order?
            </p>

            <p className="mt-3 text-sm leading-6 text-[#746c64]">
              Reserved stock will be restored.
              {order.payment_status === "verified"
                ? " Because payment is verified, this order will also be marked as refund required."
                : ""}
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium">
                Cancellation reason
              </span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                placeholder="Customer requested cancellation, item unavailable..."
                className="w-full resize-none border border-[#b8aea4] bg-[#f8f4ee] px-4 py-3 text-sm outline-none"
              />
            </label>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelReason("");
                }}
                className="border border-[#8f867d] px-4 py-3 text-sm"
              >
                Keep order
              </button>

              <button
                type="button"
                onClick={() => {
                  void confirmCancelOrder();
                }}
                disabled={Boolean(busyAction)}
                className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9] disabled:opacity-40"
              >
                Cancel order
              </button>
            </div>
          </div>
        </div>
      )}

      {refundOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-[#25211d]/35 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-[#9f958b] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.22)] md:p-7">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Manual refund
            </p>

            <p className="mt-3 text-2xl font-medium tracking-[-0.025em]">
              Record completed refund
            </p>

            <p className="mt-3 text-sm leading-6 text-[#746c64]">
              Confirm only after RM{" "}
              {Number(order.total).toLocaleString("en-MY", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              has actually been returned to the customer.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium">
                Transfer reference *
              </span>
              <input
                value={refundReference}
                onChange={(event) => setRefundReference(event.target.value)}
                placeholder="Bank transfer reference"
                className="h-12 w-full border border-[#b8aea4] bg-[#f8f4ee] px-4 text-sm outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium">
                Note
                <span className="ml-2 font-normal text-[#91877e]">
                  Optional
                </span>
              </span>
              <textarea
                value={refundNote}
                onChange={(event) => setRefundNote(event.target.value)}
                rows={3}
                placeholder="Refunded via Maybank..."
                className="w-full resize-none border border-[#b8aea4] bg-[#f8f4ee] px-4 py-3 text-sm outline-none"
              />
            </label>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRefundOpen(false)}
                className="border border-[#8f867d] px-4 py-3 text-sm"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={() => {
                  void completeRefund();
                }}
                disabled={Boolean(busyAction) || !refundReference.trim()}
                className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9] disabled:opacity-40"
              >
                Mark refund completed
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
      {children}
    </p>
  );
}

function StatusPill({
  children,
}: {
  children: React.ReactNode;
  kind?: "order" | "payment";
  value?: string;
}) {
  return (
    <span className="inline-flex items-center border border-[#8f867d] bg-transparent px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[#4d4640]">
      {children}
    </span>
  );
}
