"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/src/lib/adminFetch";

type OrderStatus =
  | "pending_payment"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentStatus = "pending" | "verified";

type CustomerProfile = {
  full_name?: string | null;
  phone?: string | null;
};

type Address = {
  recipient_name?: string | null;
  phone?: string | null;
};

type OrderItem = {
  id?: string;
  quantity?: number;
};

type CancellationRequestSummary = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  created_at: string;
};

type AdminOrder = {
  id: string;
  user_id?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  refund_status?: "not_required" | "required" | "completed";
  order_cancellation_requests?: CancellationRequestSummary[];
  payment_proof_url?: string | null;
  total: number;
  subtotal?: number;
  created_at: string;
  updated_at?: string | null;
  customer_profiles?: CustomerProfile | CustomerProfile[] | null;
  addresses?: Address | Address[] | null;
  order_items?: OrderItem[] | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  processing: "Processing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type StatusFilter = "all" | OrderStatus;
type PaymentFilter =
  | "all"
  | "proof_submitted"
  | "awaiting_proof"
  | "refund_required"
  | "cancellation_requested"
  | PaymentStatus;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const loadOrders = useCallback(async () => {
    try {
      setError("");

      const response = await adminFetch(`${API_URL}/admin/orders`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to load orders.");
      }

      const nextOrders = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : [];

      setOrders(nextOrders);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...orders]
      .filter((order) => {
        if (statusFilter !== "all" && order.status !== statusFilter) {
          return false;
        }

        if (paymentFilter === "verified") {
          if (order.payment_status !== "verified") {
            return false;
          }
        }

        if (paymentFilter === "pending") {
          if (order.payment_status !== "pending") {
            return false;
          }
        }

        if (paymentFilter === "proof_submitted") {
          if (order.payment_status !== "pending" || !order.payment_proof_url) {
            return false;
          }
        }

        if (paymentFilter === "awaiting_proof") {
          if (
            order.status !== "pending_payment" ||
            order.payment_status !== "pending" ||
            order.payment_proof_url
          ) {
            return false;
          }
        }

        if (paymentFilter === "refund_required") {
          if (order.refund_status !== "required") {
            return false;
          }
        }

        if (paymentFilter === "cancellation_requested") {
          const hasPendingCancellationRequest =
            order.order_cancellation_requests?.some(
              (request) => request.status === "pending",
            ) ?? false;

          if (!hasPendingCancellationRequest) {
            return false;
          }
        }

        if (!query) {
          return true;
        }

        const customer = getCustomer(order);
        const address = getAddress(order);

        return [
          order.id,
          order.user_id,
          customer?.full_name,
          customer?.phone,
          address?.recipient_name,
          address?.phone,
          order.status,
          order.payment_status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const priorityDifference = getPriority(a) - getPriority(b);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [orders, paymentFilter, search, statusFilter]);

  const reviewCount = orders.filter(
    (order) =>
      order.status === "pending_payment" &&
      order.payment_status === "pending" &&
      Boolean(order.payment_proof_url),
  ).length;

  const fulfilmentCount = orders.filter((order) =>
    ["processing", "ready_to_ship", "shipped"].includes(order.status),
  ).length;

  const awaitingPaymentCount = orders.filter(
    (order) =>
      order.status === "pending_payment" &&
      order.payment_status === "pending" &&
      !order.payment_proof_url,
  ).length;

  const refundRequiredCount = orders.filter(
    (order) => order.refund_status === "required",
  ).length;

  const cancellationRequestCount = orders.filter(
    (order) =>
      order.order_cancellation_requests?.some(
        (request) => request.status === "pending",
      ) ?? false,
  ).length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Operations
        </p>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              Orders
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c64]">
              Review payments, prepare confirmed orders, and move each delivery
              through fulfilment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadOrders();
            }}
            disabled={loading}
            className="w-fit border border-[#8f867d] px-4 py-2.5 text-xs uppercase tracking-[0.1em] transition hover:bg-[#25211d] hover:text-[#f4f0e9] disabled:cursor-wait disabled:opacity-40"
          >
            {loading ? "Refreshing" : "Refresh orders"}
          </button>
        </div>
      </header>

      <section className="grid gap-4 border-b border-[#cec6bc] py-8 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric
          label="Needs payment review"
          value={reviewCount}
          detail="Proof received, waiting for verification"
          tone="priority"
          active={reviewCount > 0}
          onClick={() => {
            setPaymentFilter("proof_submitted");
            setStatusFilter("all");
          }}
        />

        <SummaryMetric
          label="In fulfilment"
          value={fulfilmentCount}
          detail="Processing, ready to ship, or shipped"
          tone="neutral"
          onClick={() => {
            setPaymentFilter("all");
            setStatusFilter("all");
          }}
        />

        <SummaryMetric
          label="Awaiting customer"
          value={awaitingPaymentCount}
          detail="No payment proof submitted yet"
          tone="soft"
          onClick={() => {
            setPaymentFilter("awaiting_proof");
            setStatusFilter("all");
          }}
        />

        <SummaryMetric
          label="Refund required"
          value={refundRequiredCount}
          detail="Cancelled paid orders still needing refund"
          tone="priority"
          active={refundRequiredCount > 0}
          onClick={() => {
            setPaymentFilter("refund_required");
            setStatusFilter("all");
          }}
        />

        <SummaryMetric
          label="Cancellation requests"
          value={cancellationRequestCount}
          detail="Customer requests waiting for review"
          tone="priority"
          active={cancellationRequestCount > 0}
          onClick={() => {
            setPaymentFilter("cancellation_requested");
            setStatusFilter("all");
          }}
        />
      </section>

      <section className="border-b border-[#cec6bc] py-8">
        <div className="border border-[#d8d0c7] bg-[#f8f4ee] p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_220px_220px_auto]">
            <FieldWrapper label="Search">
              <div className="flex h-12 items-center border border-[#b8aea4] bg-[#f4f0e9] px-4">
                <svg
                  viewBox="0 0 24 24"
                  className="mr-3 h-4 w-4 shrink-0 text-[#7d746b]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order ID, customer, phone"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-[#aaa198]"
                />
              </div>
            </FieldWrapper>

            <FilterSelect
              label="Order status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending_payment">Pending payment</option>
              <option value="processing">Processing</option>
              <option value="ready_to_ship">Ready to ship</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </FilterSelect>

            <FilterSelect
              label="Payment"
              value={paymentFilter}
              onChange={(value) => setPaymentFilter(value as PaymentFilter)}
            >
              <option value="all">All payment states</option>
              <option value="proof_submitted">Proof submitted</option>
              <option value="awaiting_proof">Awaiting proof</option>
              <option value="refund_required">Refund required</option>
              <option value="cancellation_requested">
                Cancellation requested
              </option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </FilterSelect>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="h-12 border border-[#8f867d] px-4 text-xs uppercase tracking-[0.08em] text-[#5d5550] transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#ddd5cc] pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-[#817870]">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>

            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter("proof_submitted");
                  setStatusFilter("all");
                }}
                className="w-fit text-xs font-medium text-[#25211d] underline decoration-[#8f867d] underline-offset-4"
              >
                Review {reviewCount} payment
                {reviewCount === 1 ? "" : "s"} first
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="my-6 border border-[#a77d75] px-5 py-4">
          <p className="text-sm text-[#713f38]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <p className="text-sm text-[#756d65]">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">No matching orders</p>

          <p className="mt-2 text-sm text-[#817870]">
            Try clearing the current search or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden xl:block">
            <div className="grid grid-cols-[minmax(260px,1.3fr)_minmax(180px,0.8fr)_160px_180px_150px_28px] gap-5 border-b border-[#8f867d] py-4 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
              <span>Order / Customer</span>
              <span>Attention</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div>
              {filteredOrders.map((order) => (
                <DesktopOrderRow key={order.id} order={order} />
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#cec6bc] xl:hidden">
            {filteredOrders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function DesktopOrderRow({ order }: { order: AdminOrder }) {
  const customer = getCustomer(order);
  const attention = getAttention(order);
  const itemCount = getItemCount(order);

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="group grid grid-cols-[minmax(260px,1.3fr)_minmax(180px,0.8fr)_160px_180px_150px_28px] gap-5 border-b border-[#ddd5cc] py-6 transition hover:bg-[#f7f2eb]"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-medium tracking-[-0.015em]">
          {customer?.full_name || "Customer"}
        </p>

        <p className="mt-1 truncate font-mono text-[11px] text-[#817870]">
          {shortOrderId(order.id)}
        </p>

        <p className="mt-2 text-xs text-[#91877e]">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      </div>

      <div>
        <AttentionLabel type={attention.type}>{attention.label}</AttentionLabel>

        <p className="mt-2 text-xs leading-5 text-[#817870]">
          {attention.detail}
        </p>
      </div>

      <div className="flex items-start">
        <RectStatus>{STATUS_LABELS[order.status]}</RectStatus>
      </div>

      <div>
        <p className="text-sm">
          {new Date(order.created_at).toLocaleDateString("en-MY", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>

        <p className="mt-1 text-xs text-[#8a8178]">
          {new Date(order.created_at).toLocaleTimeString("en-MY", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="text-right">
        <p className="text-base font-medium">
          RM{" "}
          {Number(order.total).toLocaleString("en-MY", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>

        <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#91877e]">
          {order.payment_status}
        </p>
      </div>

      <div className="flex items-center justify-end text-lg text-[#756d65] transition group-hover:translate-x-0.5 group-hover:text-[#25211d]">
        →
      </div>
    </Link>
  );
}

function MobileOrderCard({ order }: { order: AdminOrder }) {
  const customer = getCustomer(order);
  const attention = getAttention(order);
  const itemCount = getItemCount(order);

  return (
    <Link href={`/admin/orders/${order.id}`} className="block py-7">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">
            {customer?.full_name || "Customer"}
          </p>

          <p className="mt-1 truncate font-mono text-[11px] text-[#817870]">
            {shortOrderId(order.id)}
          </p>
        </div>

        <p className="shrink-0 text-base font-medium">
          RM{" "}
          {Number(order.total).toLocaleString("en-MY", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <RectStatus>{STATUS_LABELS[order.status]}</RectStatus>
        <RectStatus>Payment: {order.payment_status}</RectStatus>
      </div>

      <div className="mt-5 border-t border-[#ddd5cc] pt-4">
        <AttentionLabel type={attention.type}>{attention.label}</AttentionLabel>

        <p className="mt-2 text-xs leading-5 text-[#817870]">
          {attention.detail}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-[#8a8178]">
        <span>
          {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
          {new Date(order.created_at).toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>

        <span className="text-base text-[#4f4842]">→</span>
      </div>
    </Link>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  active = false,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  active?: boolean;
  onClick: () => void;
  tone: "priority" | "neutral" | "soft";
}) {
  const toneClass =
    tone === "priority"
      ? "border-[#d5c8bb] bg-[#f2ece4]"
      : tone === "soft"
        ? "border-[#ddd5cc] bg-[#f8f4ee]"
        : "border-[#ddd5cc] bg-[#f6f1ea]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-6 text-left transition ${toneClass} ${
        active ? "ring-1 ring-[#b5aaa0]" : "hover:bg-[#f1ebe3]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.13em] text-[#8a8178]">
        {label}
      </p>

      <p className="mt-4 text-4xl font-medium tracking-[-0.04em]">{value}</p>

      <p className="mt-3 max-w-[26ch] text-sm leading-6 text-[#756d65]">
        {detail}
      </p>
    </button>
  );
}

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.13em] text-[#8a8178]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <FieldWrapper label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

function RectStatus({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border border-[#8f867d] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-[#4d4640]">
      {children}
    </span>
  );
}

function AttentionLabel({
  children,
  type,
}: {
  children: React.ReactNode;
  type:
    | "cancellation"
    | "refund"
    | "review"
    | "customer"
    | "fulfilment"
    | "complete"
    | "cancelled";
}) {
  const className =
    type === "review" || type === "refund" || type === "cancellation"
      ? "border-[#796b5f] bg-[#25211d] text-[#f4f0e9]"
      : "border-[#9b9187] text-[#4f4842]";

  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.09em] ${className}`}
    >
      {children}
    </span>
  );
}

function getCustomer(order: AdminOrder) {
  if (!order.customer_profiles) {
    return null;
  }

  return Array.isArray(order.customer_profiles)
    ? (order.customer_profiles[0] ?? null)
    : order.customer_profiles;
}

function getAddress(order: AdminOrder) {
  if (!order.addresses) {
    return null;
  }

  return Array.isArray(order.addresses)
    ? (order.addresses[0] ?? null)
    : order.addresses;
}

function getItemCount(order: AdminOrder) {
  return (order.order_items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0,
  );
}

function getPriority(order: AdminOrder) {
  const hasPendingCancellationRequest =
    order.order_cancellation_requests?.some(
      (request) => request.status === "pending",
    ) ?? false;

  if (hasPendingCancellationRequest) {
    return 0;
  }

  if (order.refund_status === "required") {
    return 1;
  }

  if (
    order.status === "pending_payment" &&
    order.payment_status === "pending" &&
    order.payment_proof_url
  ) {
    return 2;
  }

  if (order.status === "ready_to_ship") {
    return 3;
  }

  if (order.status === "processing") {
    return 4;
  }

  if (order.status === "shipped") {
    return 5;
  }

  if (order.status === "pending_payment" && !order.payment_proof_url) {
    return 6;
  }

  if (order.status === "delivered") {
    return 7;
  }

  return 8;
}

function getAttention(order: AdminOrder): {
  type:
    | "cancellation"
    | "refund"
    | "review"
    | "customer"
    | "fulfilment"
    | "complete"
    | "cancelled";
  label: string;
  detail: string;
} {
  const pendingCancellationRequest =
    order.order_cancellation_requests
      ?.filter((request) => request.status === "pending")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0] ?? null;

  if (pendingCancellationRequest) {
    return {
      type: "cancellation",
      label: "Cancellation requested",
      detail: pendingCancellationRequest.reason,
    };
  }

  if (order.refund_status === "required") {
    return {
      type: "refund",
      label: "Refund required",
      detail: "Payment was verified before cancellation.",
    };
  }

  if (
    order.status === "pending_payment" &&
    order.payment_status === "pending" &&
    order.payment_proof_url
  ) {
    return {
      type: "review",
      label: "Review payment",
      detail: "Proof submitted. Admin action required.",
    };
  }

  if (order.status === "pending_payment" && !order.payment_proof_url) {
    return {
      type: "customer",
      label: "Waiting for customer",
      detail: "Payment proof has not been submitted.",
    };
  }

  if (order.status === "processing") {
    return {
      type: "fulfilment",
      label: "Prepare order",
      detail: "Payment verified. Prepare pieces for dispatch.",
    };
  }

  if (order.status === "ready_to_ship") {
    return {
      type: "fulfilment",
      label: "Dispatch required",
      detail: "Order is ready and waiting to be shipped.",
    };
  }

  if (order.status === "shipped") {
    return {
      type: "fulfilment",
      label: "In transit",
      detail: "Waiting for delivery completion.",
    };
  }

  if (order.status === "delivered") {
    return {
      type: "complete",
      label: "Complete",
      detail: "Order has been delivered.",
    };
  }

  if (order.refund_status === "completed") {
    return {
      type: "complete",
      label: "Refunded",
      detail: "Cancelled order refund has been completed.",
    };
  }

  return {
    type: "cancelled",
    label: "Closed",
    detail: "Order was cancelled and stock was released.",
  };
}

function shortOrderId(id: string) {
  if (id.length <= 18) {
    return id;
  }

  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}
