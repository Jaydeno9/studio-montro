"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/src/lib/adminFetch";

type OrderStatus =
  | "pending_payment"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

type DashboardData = {
  period: {
    days: number;
    starts_at: string;
    ends_at: string;
  };
  metrics: {
    revenue: number;
    orders: number;
    average_order_value: number;
    needs_attention: number;
  };
  attention: {
    payment_reviews: number;
    cancellation_requests: number;
    refunds_required: number;
    low_stock_products: number;
  };
  sales_trend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  top_products: Array<{
    product_id: string | null;
    product_name: string;
    units_sold: number;
    revenue: number;
    image_url: string | null;
  }>;
  recent_orders: Array<{
    id: string;
    customer: string;
    total: number;
    status: OrderStatus;
    payment_status: "pending" | "verified";
    created_at: string;
  }>;
  low_stock_products: Array<{
    id: string;
    name: string;
    stock_quantity: number;
    status: "active" | "inactive";
  }>;
};

import { API_URL } from "@/src/lib/apiConfig";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  processing: "Processing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendDays, setTrendDays] = useState<7 | 30>(30);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch(`${API_URL}/admin/dashboard`);
      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.detail ?? "Unable to load the overview.");
      }

      setData(responseData as DashboardData);
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_REQUIRED") {
        router.replace("/admin/login");
        return;
      }

      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load the overview.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const visibleTrend = useMemo(
    () => data?.sales_trend.slice(-trendDays) ?? [],
    [data, trendDays],
  );

  if (loading && !data) {
    return <DashboardLoading />;
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Store overview
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
          Overview
        </h1>
        <div className="mt-8 max-w-xl bg-[#efe0dc] p-5 text-[#6d4039]">
          <p className="text-sm leading-6">{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
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

  const attentionItems = [
    {
      label: "Payment proofs",
      detail: "Awaiting review",
      value: data.attention.payment_reviews,
      href: "/admin/orders",
      tone: "amber" as const,
    },
    {
      label: "Cancellation requests",
      detail: "Waiting for a decision",
      value: data.attention.cancellation_requests,
      href: "/admin/orders",
      tone: "burgundy" as const,
    },
    {
      label: "Refund actions",
      detail: "Paid cancellations to complete",
      value: data.attention.refunds_required,
      href: "/admin/orders",
      tone: "burgundy" as const,
    },
    {
      label: "Low stock",
      detail: "Active products at five or fewer",
      value: data.attention.low_stock_products,
      href: "/admin/products",
      tone: "amber" as const,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="pb-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Store overview
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              Overview
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c64]">
              Sales performance and the operational work that needs attention.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="w-fit border border-[#8f867d] px-4 py-2.5 text-xs uppercase tracking-[0.1em] transition hover:bg-[#25211d] hover:text-[#f4f0e9] disabled:cursor-wait disabled:opacity-40"
          >
            {loading ? "Refreshing" : "Refresh overview"}
          </button>
        </div>
      </header>

      <section
        aria-label="Last 30 days summary"
        className="grid grid-cols-2 gap-px bg-[#d5ccc2] lg:grid-cols-4"
      >
        <Metric
          label="Revenue"
          value={formatCurrency(data.metrics.revenue)}
          detail="Last 30 days"
          tone="positive"
        />
        <Metric
          label="Orders"
          value={String(data.metrics.orders)}
          detail="Valid sales · 30 days"
        />
        <Metric
          label="Average order"
          value={formatCurrency(data.metrics.average_order_value)}
          detail="Valid sales · 30 days"
        />
        <Metric
          label="Needs attention"
          value={String(data.metrics.needs_attention)}
          detail="Open operational actions"
          tone={data.metrics.needs_attention > 0 ? "attention" : "positive"}
        />
      </section>

      <section className="mt-10 bg-[#eee8df] p-5 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionEyebrow>Operations</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
              Needs attention
            </h2>
          </div>
          <Link
            href="/admin/orders"
            className="text-sm underline decoration-[#aaa097] underline-offset-4"
          >
            Review all orders →
          </Link>
        </div>

        {data.metrics.needs_attention === 0 ? (
          <div className="mt-6 bg-[#e6ebe2] px-4 py-5 text-sm text-[#46523f]">
            Nothing is waiting for action right now.
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attentionItems.map((item) => (
              <AttentionLink key={item.label} {...item} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <section>
          <div className="flex items-end justify-between gap-5">
            <div>
              <SectionEyebrow>Performance</SectionEyebrow>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                Sales trend
              </h2>
            </div>
            <div className="flex border border-[#b8aea4] p-1 text-xs">
              {[7, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTrendDays(days as 7 | 30)}
                  className={`px-3 py-2 transition ${
                    trendDays === days
                      ? "bg-[#25211d] text-[#f4f0e9]"
                      : "text-[#756d65] hover:text-[#25211d]"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
          <SalesChart data={visibleTrend} />
        </section>

        <section>
          <SectionEyebrow>Product performance</SectionEyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
            Top selling
          </h2>
          <div className="mt-6 space-y-2">
            {data.top_products.length > 0 ? (
              data.top_products.map((product, index) => (
                <div
                  key={product.product_id ?? product.product_name}
                  className="grid grid-cols-[24px_44px_minmax(0,1fr)_auto] items-center gap-3 bg-[#f8f4ee] px-4 py-3"
                >
                  <span className="text-xs text-[#91877e]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center bg-[#e8e1d8] bg-cover bg-center text-xs font-medium text-[#817870]"
                    style={
                      product.image_url
                        ? {
                            backgroundImage: `url(${JSON.stringify(product.image_url)})`,
                          }
                        : undefined
                    }
                  >
                    {!product.image_url && product.product_name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    {product.product_id ? (
                      <Link
                        href={`/admin/products/${product.product_id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {product.product_name}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">
                        {product.product_name}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#817870]">
                      {product.units_sold} unit
                      {product.units_sold === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState>No valid sales in this period yet.</EmptyState>
            )}
          </div>
        </section>
      </div>

      <div className="mt-14 grid gap-12 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <section>
          <div className="flex items-end justify-between gap-5">
            <div>
              <SectionEyebrow>Latest activity</SectionEyebrow>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                Recent orders
              </h2>
            </div>
            <Link href="/admin/orders" className="text-sm hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-6 space-y-2">
            {data.recent_orders.length > 0 ? (
              data.recent_orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="grid gap-3 bg-[#f8f4ee] px-4 py-4 transition hover:bg-[#eee8df] sm:grid-cols-[minmax(0,1fr)_140px_120px] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#817870]">
                      {order.customer} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <p className="text-sm tabular-nums sm:text-right">
                    {formatCurrency(order.total)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState>No orders have been placed yet.</EmptyState>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-5">
            <div>
              <SectionEyebrow>Inventory</SectionEyebrow>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                Low stock
              </h2>
            </div>
            <Link href="/admin/products" className="text-sm hover:underline">
              Manage →
            </Link>
          </div>
          <div className="mt-6 space-y-2">
            {data.low_stock_products.length > 0 ? (
              data.low_stock_products.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center justify-between gap-5 bg-[#f8f4ee] px-4 py-4 transition hover:bg-[#eee8df]"
                >
                  <p className="min-w-0 truncate text-sm font-medium">
                    {product.name}
                  </p>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
                      product.stock_quantity === 0
                        ? "bg-[#efe0dc] text-[#6d4039]"
                        : "bg-[#efe5cf] text-[#725624]"
                    }`}
                  >
                    {product.stock_quantity === 0
                      ? "Out of stock"
                      : `${product.stock_quantity} left`}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState>All active products are above five units.</EmptyState>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "attention";
}) {
  const valueColor =
    tone === "positive"
      ? "text-[#53634d]"
      : tone === "attention"
        ? "text-[#765149]"
        : "text-[#25211d]";

  return (
    <div className="bg-[#eee8df] px-4 py-5 md:px-5">
      <p className="text-[10px] uppercase tracking-[0.13em] text-[#817870]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-medium tracking-[-0.03em] tabular-nums md:text-3xl ${valueColor}`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-5 text-[#8a8178]">{detail}</p>
    </div>
  );
}

function AttentionLink({
  label,
  detail,
  value,
  href,
  tone,
}: {
  label: string;
  detail: string;
  value: number;
  href: string;
  tone: "amber" | "burgundy";
}) {
  const colors =
    value === 0
      ? "bg-[#f8f4ee] text-[#6f685f]"
      : tone === "burgundy"
        ? "bg-[#efe0dc] text-[#6d4039]"
        : "bg-[#efe5cf] text-[#725624]";

  return (
    <Link
      href={href}
      className={`flex min-h-28 flex-col justify-between p-4 transition hover:brightness-[0.98] ${colors}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-2xl font-medium tabular-nums">{value}</span>
      </div>
      <p className="mt-4 text-xs leading-5 opacity-75">{detail} →</p>
    </Link>
  );
}

function SalesChart({
  data,
}: {
  data: DashboardData["sales_trend"];
}) {
  const maxRevenue = Math.max(...data.map((item) => item.revenue), 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="mt-6 bg-[#f8f4ee] p-5 md:p-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs text-[#817870]">Revenue in view</p>
          <p className="mt-1 text-xl font-medium tabular-nums">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <p className="text-right text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
          Verified · not cancelled
        </p>
      </div>

      <div
        role="img"
        aria-label={`Daily revenue for the last ${data.length} days`}
        className="mt-8 flex h-44 items-end gap-1 border-b border-[#cfc6bc]"
      >
        {data.map((item) => {
          const height =
            maxRevenue === 0
              ? 2
              : item.revenue === 0
                ? 2
                : Math.max(5, (item.revenue / maxRevenue) * 100);

          return (
            <div
              key={item.date}
              title={`${formatShortDate(item.date)}: ${formatCurrency(item.revenue)} · ${item.orders} order${item.orders === 1 ? "" : "s"}`}
              className="min-w-0 flex-1 bg-[#697860] transition hover:bg-[#53634d]"
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.08em] text-[#91877e]">
        <span>{data[0] ? formatShortDate(data[0].date) : "—"}</span>
        <span>
          {data[data.length - 1]
            ? formatShortDate(data[data.length - 1].date)
            : "—"}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors =
    status === "delivered"
      ? "bg-[#e6ebe2] text-[#46523f]"
      : status === "cancelled"
        ? "bg-[#efe0dc] text-[#6d4039]"
        : status === "pending_payment"
          ? "bg-[#efe5cf] text-[#725624]"
          : "bg-[#e8e4de] text-[#5f5750]";

  return (
    <span
      className={`w-fit px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${colors}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
      {children}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-[#eee8df] px-4 py-6 text-sm leading-6 text-[#746c64]">
      {children}
    </p>
  );
}

function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10"
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
        Store overview
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
        Overview
      </h1>
      <p className="mt-5 text-sm text-[#817870]">Preparing store activity…</p>
      <div className="mt-8 grid grid-cols-2 gap-px bg-[#d5ccc2] lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse bg-[#eee8df]" />
        ))}
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
