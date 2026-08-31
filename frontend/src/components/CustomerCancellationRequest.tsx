"use client";

import { useMemo, useState } from "react";
import { authFetch } from "@/src/lib/authFetch";

type RequestStatus = "pending" | "approved" | "rejected";

export type CancellationRequest = {
  id: string;
  order_id: string;
  user_id: string;
  status: RequestStatus;
  reason: string;
  resolution_message: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type CustomerCancellationRequestProps = {
  orderId: string;
  orderStatus:
    | "pending_payment"
    | "processing"
    | "ready_to_ship"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentStatus: "pending" | "verified";
  requests?: CancellationRequest[];
  onUpdated?: () => void | Promise<void>;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function CustomerCancellationRequest({
  orderId,
  orderStatus,
  paymentStatus,
  requests = [],
  onUpdated,
}: CustomerCancellationRequestProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const latestRequest = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0] ?? null,
    [requests],
  );

  const pendingRequest =
    requests.find((request) => request.status === "pending") ?? null;

  const canRequest =
    ["pending_payment", "processing", "ready_to_ship"].includes(orderStatus) &&
    !pendingRequest;

  async function submitRequest() {
    if (!reason.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await authFetch(
        `${API_URL}/orders/${orderId}/cancellation-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ?? "Unable to submit cancellation request.",
        );
      }

      setOpen(false);
      setReason("");
      setMessage("Your cancellation request has been sent for review.");

      await onUpdated?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit cancellation request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (
    !latestRequest &&
    !["pending_payment", "processing", "ready_to_ship"].includes(orderStatus)
  ) {
    return null;
  }

  return (
    <>
      <section className="border-t border-black/15 pt-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-black/50">
          Cancellation
        </p>

        {pendingRequest ? (
          <div className="mt-4 border border-black/20 p-5">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-medium">Request under review</p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Your order has not been cancelled yet. Studio MONTRO will
                  review your request before fulfilment continues.
                </p>
              </div>

              <span className="border border-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em]">
                Pending
              </span>
            </div>

            <div className="mt-5 border-t border-black/10 pt-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-black/45">
                Your reason
              </p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                {pendingRequest.reason}
              </p>
            </div>
          </div>
        ) : latestRequest?.status === "approved" ? (
          <div className="mt-4 border border-black/20 p-5">
            <p className="text-sm font-medium">Cancellation approved</p>
            <p className="mt-2 text-sm leading-6 text-black/60">
              {latestRequest.resolution_message ??
                "Your order cancellation has been approved."}
            </p>

            {paymentStatus === "verified" && (
              <p className="mt-3 text-xs leading-5 text-black/50">
                Your payment was previously verified. Any required refund is
                handled separately by Studio MONTRO.
              </p>
            )}
          </div>
        ) : latestRequest?.status === "rejected" ? (
          <div className="mt-4 border border-black/20 p-5">
            <p className="text-sm font-medium">
              Previous request was not approved
            </p>

            <p className="mt-2 text-sm leading-6 text-black/60">
              {latestRequest.resolution_message ??
                "Your cancellation request could not be approved."}
            </p>

            {canRequest && (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setOpen(true);
                }}
                className="mt-5 border border-black/60 px-4 py-3 text-sm transition hover:bg-black hover:text-white"
              >
                Submit another request
              </button>
            )}
          </div>
        ) : canRequest ? (
          <div className="mt-4">
            <p className="max-w-xl text-sm leading-6 text-black/60">
              Need to cancel? Send a request before the order is shipped. The
              order remains active until Studio MONTRO approves it.
            </p>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setOpen(true);
              }}
              className="mt-4 border border-black/60 px-4 py-3 text-sm transition hover:bg-black hover:text-white"
            >
              Request cancellation
            </button>
          </div>
        ) : null}

        {message && (
          <p className="mt-4 text-xs leading-5 text-black/60">{message}</p>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-black/35 bg-[#f4f0e9] p-6 shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.15em] text-black/50">
              Cancellation request
            </p>

            <p className="mt-3 text-2xl font-medium">
              Request to cancel this order?
            </p>

            <p className="mt-3 text-sm leading-6 text-black/60">
              This does not cancel the order immediately. Studio MONTRO will
              review your request first.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium">
                Why would you like to cancel? *
              </span>

              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="I ordered the wrong finish..."
                className="w-full resize-none border border-black/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-black/60"
              />
            </label>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setReason("");
                }}
                className="border border-black/40 px-4 py-3 text-sm"
              >
                Keep order
              </button>

              <button
                type="button"
                onClick={() => void submitRequest()}
                disabled={submitting || reason.trim().length < 3}
                className="bg-black px-4 py-3 text-sm text-white disabled:opacity-35"
              >
                {submitting ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
