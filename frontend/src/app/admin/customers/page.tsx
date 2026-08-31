"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/src/lib/adminFetch";

type AdminCustomer = {
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  joined_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch(`${API_URL}/admin/customers`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to load customers.");
      }

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "AUTH_REQUIRED" ||
          err.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Customers
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
          Customers
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#756d65]">
          View customer activity and order history.
        </p>
      </header>

      {error && (
        <div className="mt-8 max-w-xl bg-[#efe0dc] p-5 text-[#6d4039]">
          <p className="text-sm leading-6">{error}</p>
          <button
            type="button"
            onClick={() => void loadCustomers()}
            className="mt-4 border border-[#765149] px-4 py-2.5 text-xs uppercase tracking-[0.1em]"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <p className="text-sm text-[#756d65]">Loading customers...</p>
        </div>
      ) : !error && customers.length === 0 ? (
        <div className="py-20">
          <p className="text-lg font-medium">No customers yet</p>
          <p className="mt-2 text-sm text-[#817870]">
            Customer profiles will appear here when they are created.
          </p>
        </div>
      ) : !error ? (
        <section aria-label="Customer list">
          <div className="hidden xl:block">
            <div className="grid grid-cols-[minmax(260px,1.3fr)_110px_150px_160px_140px_28px] gap-5 border-b border-[#8f867d] py-4 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
              <span>Customer</span>
              <span>Orders</span>
              <span>Total spent</span>
              <span>Last order</span>
              <span>Joined</span>
              <span />
            </div>

            <div>
              {customers.map((customer) => (
                <DesktopCustomerRow
                  key={customer.customer_id}
                  customer={customer}
                />
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#cec6bc] xl:hidden">
            {customers.map((customer) => (
              <MobileCustomerRow
                key={customer.customer_id}
                customer={customer}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DesktopCustomerRow({ customer }: { customer: AdminCustomer }) {
  return (
    <Link
      href={`/admin/customers/${customer.customer_id}`}
      className="group grid grid-cols-[minmax(260px,1.3fr)_110px_150px_160px_140px_28px] gap-5 border-b border-[#ddd5cc] py-6 transition hover:bg-[#f7f2eb]"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-medium tracking-[-0.015em]">
          {customer.full_name || "Customer"}
        </p>
        <p className="mt-1 truncate text-xs text-[#817870]">
          {customer.email || "Email unavailable"}
        </p>
        {customer.phone && (
          <p className="mt-1 truncate text-xs text-[#91877e]">
            {customer.phone}
          </p>
        )}
      </div>

      <p className="text-sm">{customer.order_count}</p>

      <p className="text-sm font-medium">
        {formatCurrency(customer.total_spent)}
      </p>

      <p className="text-sm text-[#625a53]">
        {formatDate(customer.last_order_at)}
      </p>

      <p className="text-sm text-[#625a53]">
        {formatDate(customer.joined_at)}
      </p>

      <span className="flex items-center justify-end text-lg text-[#756d65] transition group-hover:translate-x-0.5 group-hover:text-[#25211d]">
        →
      </span>
    </Link>
  );
}

function MobileCustomerRow({ customer }: { customer: AdminCustomer }) {
  return (
    <Link
      href={`/admin/customers/${customer.customer_id}`}
      className="block py-7"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">
            {customer.full_name || "Customer"}
          </p>
          <p className="mt-1 break-words text-xs text-[#817870]">
            {customer.email || "Email unavailable"}
          </p>
        </div>

        <span className="shrink-0 text-lg text-[#625a53]">→</span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[#ddd5cc] pt-4">
        <Metric label="Orders" value={String(customer.order_count)} />
        <Metric label="Total spent" value={formatCurrency(customer.total_spent)} />
        <Metric label="Last order" value={formatDate(customer.last_order_at)} />
        <Metric label="Joined" value={formatDate(customer.joined_at)} />
      </dl>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] uppercase tracking-[0.12em] text-[#91877e]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-[#514b45]">{value}</dd>
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
