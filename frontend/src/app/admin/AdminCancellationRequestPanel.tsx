"use client";

import { useMemo, useState } from "react";
import { adminFetch } from "@/src/lib/adminFetch";

export type AdminCancellationRequest = {
  id: string;
  order_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  resolution_message: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Props = {
  orderId: string;
  paymentStatus: "pending" | "verified";
  requests?: AdminCancellationRequest[];
  onUpdated: () => void | Promise<void>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function AdminCancellationRequestPanel({
  orderId,
  paymentStatus,
  requests = [],
  onUpdated,
}: Props) {
  const pendingRequest = useMemo(
    () =>
      [...requests]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .find((request) => request.status === "pending") ?? null,
    [requests],
  );

  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!pendingRequest) {
    return null;
  }

  async function resolveRequest(action: "approve" | "reject") {
    if (!pendingRequest || busy) {
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      const response = await adminFetch(
        `${API_URL}/admin/orders/${orderId}/cancellation-request/${pendingRequest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            resolution_message: customerMessage.trim() || null,
            admin_note: adminNote.trim() || null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ?? "Unable to resolve cancellation request.",
        );
      }

      setMode(null);
      setCustomerMessage("");
      setAdminNote("");
      await onUpdated();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to resolve cancellation request.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="border border-[#9f958b] bg-[#eee8df] p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Customer request
            </p>
            <p className="mt-2 text-lg font-medium">Cancellation requested</p>
          </div>

          <span className="border border-[#625a53] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em]">
            Action required
          </span>
        </div>

        <div className="mt-5 border-t border-[#cec6bc] pt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
            Customer reason
          </p>
          <p className="mt-2 text-sm leading-6 text-[#625a53]">
            {pendingRequest.reason}
          </p>
        </div>

        {paymentStatus === "verified" && (
          <div className="mt-5 border border-[#b99690] px-4 py-4">
            <p className="text-sm font-medium text-[#713f38]">
              Approving this request will require a refund.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#756d65]">
              Stock will be restored immediately. The refund remains outstanding
              until you record the manual transfer.
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setCustomerMessage(
                "Your cancellation request has been approved.",
              );
              setMode("approve");
            }}
            className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9]"
          >
            Approve cancellation
          </button>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setCustomerMessage(
                "Your cancellation request could not be approved.",
              );
              setMode("reject");
            }}
            className="border border-[#8f867d] px-4 py-3 text-sm"
          >
            Reject request
          </button>
        </div>

        {message && <p className="mt-4 text-xs text-[#713f38]">{message}</p>}
      </section>

      {mode && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-[#25211d]/35 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-[#9f958b] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.22)]">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              {mode === "approve"
                ? "Approve cancellation"
                : "Reject cancellation"}
            </p>

            <p className="mt-3 text-2xl font-medium tracking-[-0.025em]">
              {mode === "approve"
                ? "Approve this request?"
                : "Reject this request?"}
            </p>

            {mode === "approve" && (
              <p className="mt-3 text-sm leading-6 text-[#746c64]">
                The order will be cancelled and stock restored.
                {paymentStatus === "verified"
                  ? " A manual refund will then be required."
                  : " No refund will be required because payment is not verified."}
              </p>
            )}

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium">
                Message to customer
              </span>
              <textarea
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                rows={3}
                className="w-full resize-none border border-[#b8aea4] bg-[#f8f4ee] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium">
                Internal note
                <span className="ml-2 font-normal text-[#91877e]">
                  Not shown to customer
                </span>
              </span>
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={3}
                className="w-full resize-none border border-[#b8aea4] bg-[#f8f4ee] px-4 py-3 text-sm outline-none"
              />
            </label>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="border border-[#8f867d] px-4 py-3 text-sm"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={() => void resolveRequest(mode)}
                disabled={busy}
                className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9] disabled:opacity-40"
              >
                {busy
                  ? "Updating..."
                  : mode === "approve"
                    ? "Approve request"
                    : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
