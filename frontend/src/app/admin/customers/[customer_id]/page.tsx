"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/src/lib/adminFetch";

type OrderStatus =
  | "pending_payment"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

type CustomerDetail = {
  customer: {
    customer_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    joined_at: string;
  };
  summary: {
    order_count: number;
    total_spent: number;
    last_order_at: string | null;
  };
  orders: Array<{
    id: string;
    created_at: string;
    status: OrderStatus;
    payment_status: "pending" | "verified";
    total: number;
    refund_status: "not_required" | "required" | "completed" | null;
  }>;
  addresses: Array<{
    recipient_name: string;
    phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string | null;
    postcode: string;
    country: string;
    is_default: boolean;
  }>;
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

export default function AdminCustomerDetailPage() {
  const params = useParams<{ customer_id: string }>();
  const customerId = params.customer_id;

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const loadCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setNotFound(false);

      const response = await adminFetch(
        `${API_URL}/admin/customers/${encodeURIComponent(customerId)}`,
      );
      const responseData = await response.json().catch(() => null);

      if (response.status === 404) {
        setData(null);
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error(responseData?.detail ?? "Unable to load customer.");
      }

      setData(responseData as CustomerDetail);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "AUTH_REQUIRED" ||
          err.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to load customer.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomer();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomer]);

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <p className="text-sm text-[#756d65]">Loading customer...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Customers
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
          Customer not found
        </h1>
        <p className="mt-4 text-sm text-[#756d65]">
          This customer profile does not exist or is not available here.
        </p>
        <Link
          href="/admin/customers"
          className="mt-7 inline-block border-b border-[#25211d] pb-1 text-sm"
        >
          ← Back to customers
        </Link>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Customers
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
          Unable to load customer
        </h1>
        <div className="mt-8 max-w-xl bg-[#efe0dc] p-5 text-[#6d4039]">
          <p className="text-sm leading-6">{error}</p>
          <button
            type="button"
            onClick={() => void loadCustomer()}
            className="mt-4 border border-[#765149] px-4 py-2.5 text-xs uppercase tracking-[0.1em]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const customerName = data.customer.full_name || "Customer";

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/admin/customers"
            className="text-[#6f675f] transition hover:text-[#25211d]"
          >
            Customers
          </Link>
          <span className="text-[#b2a89e]">/</span>
          <span className="text-[#817870]">{customerName}</span>
        </div>

        <h1 className="mt-7 break-words text-4xl font-medium tracking-[-0.04em] md:text-6xl">
          {customerName}
        </h1>

        <div className="mt-5 flex flex-col gap-1 text-sm text-[#756d65] sm:flex-row sm:flex-wrap sm:gap-x-6">
          <span>{data.customer.email || "Email unavailable"}</span>
          <span>{data.customer.phone || "Phone unavailable"}</span>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-[#cec6bc] md:grid-cols-4">
        <SummaryMetric label="Orders" value={String(data.summary.order_count)} />
        <SummaryMetric
          label="Total spent"
          value={formatCurrency(data.summary.total_spent)}
        />
        <SummaryMetric label="Joined" value={formatDate(data.customer.joined_at)} />
        <SummaryMetric
          label="Last order"
          value={formatDate(data.summary.last_order_at)}
        />
      </dl>

      <section className="py-10">
        <SectionHeader eyebrow="Order history" title="Orders" />

        {data.orders.length === 0 ? (
          <div className="mt-6 border-t border-[#cec6bc] py-10">
            <p className="text-sm text-[#756d65]">
              This customer has not placed any orders.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="hidden md:block">
              <div className="grid grid-cols-[minmax(180px,1fr)_150px_150px_150px_120px_28px] gap-5 border-b border-[#8f867d] py-4 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
                <span>Order</span>
                <span>Date</span>
                <span>Status</span>
                <span>Payment</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="group grid grid-cols-[minmax(180px,1fr)_150px_150px_150px_120px_28px] gap-5 border-b border-[#ddd5cc] py-5 transition hover:bg-[#f7f2eb]"
                >
                  <span className="font-mono text-xs text-[#514b45]">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-sm text-[#625a53]">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="text-sm">{STATUS_LABELS[order.status]}</span>
                  <span className="text-sm capitalize text-[#625a53]">
                    {order.payment_status}
                  </span>
                  <span className="text-right text-sm font-medium">
                    {formatCurrency(order.total)}
                  </span>
                  <span className="text-right text-lg text-[#756d65] transition group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ))}
            </div>

            <div className="divide-y divide-[#cec6bc] md:hidden">
              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block py-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-[#514b45]">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-2 text-sm">
                        {STATUS_LABELS[order.status]}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs capitalize text-[#817870]">
                    {formatDate(order.created_at)} · Payment {order.payment_status}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-[#cec6bc] py-10">
        <SectionHeader eyebrow="Addresses" title="Saved addresses" />

        {data.addresses.length === 0 ? (
          <p className="mt-6 text-sm text-[#756d65]">
            This customer has no saved addresses.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.addresses.map((address, index) => (
              <article
                key={`${address.address_line1}-${address.postcode}-${index}`}
                className="border border-[#cec6bc] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">{address.recipient_name}</p>
                  {address.is_default && (
                    <span className="border border-[#8f867d] px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-[#625a53]">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#756d65]">
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ""}
                  <br />
                  {address.postcode} {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  <br />
                  {address.country}
                </p>
                <p className="mt-3 text-sm text-[#756d65]">{address.phone}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[#cec6bc] py-6 pr-4 even:border-r-0 even:pl-4 md:px-6 md:first:pl-0 md:last:border-r-0">
      <dt className="text-[9px] uppercase tracking-[0.13em] text-[#8a8178]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-lg font-medium">{value}</dd>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em]">{title}</h2>
    </div>
  );
}

function formatCurrency(value: number) {
  return `RM ${Number(value).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
