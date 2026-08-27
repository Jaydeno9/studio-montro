"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";

type Props = {
  orderId: string;
  total: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentProofUrl: string | null;
  onUpdated: () => void | Promise<void>;
  onProofSubmitted?: (storagePath: string) => void | Promise<void>;
  autoOpen?: boolean;
  showReminder?: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function CustomerOrderPayment({
  orderId,
  total,
  createdAt,
  status,
  paymentStatus,
  paymentProofUrl,
  onUpdated,
  onProofSubmitted,
  autoOpen = false,
  showReminder = false,
}: Props) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      if (active) {
        setCurrentTimeMs(Date.now());
      }
    }, 0);

    const interval = window.setInterval(() => {
      if (active) {
        setCurrentTimeMs(Date.now());
      }
    }, 60_000);

    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;

  const expired =
    currentTimeMs !== null &&
    status === "pending_payment" &&
    paymentStatus === "pending" &&
    !paymentProofUrl &&
    currentTimeMs >= deadline;

  const canPay =
    status === "pending_payment" &&
    paymentStatus === "pending" &&
    !paymentProofUrl &&
    !expired;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (autoOpen && !autoOpenHandled && canPay) {
        setOpen(true);
        setAutoOpenHandled(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoOpen, autoOpenHandled, canPay]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (paymentProofUrl || paymentStatus === "verified" || expired) {
        setOpen(false);
        setLeaveConfirmOpen(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [expired, paymentProofUrl, paymentStatus]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setMessage("");

    if (!file) {
      setProofFile(null);
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    ) {
      setProofFile(null);
      setMessage("Please upload JPG, PNG, WEBP, or PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProofFile(null);
      setMessage("Payment proof must be 10 MB or smaller.");
      return;
    }

    setProofFile(file);
  }

  async function submitProof() {
    if (!proofFile || uploading || expired) return;

    let storagePath: string | null = null;

    try {
      setUploading(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please sign in again.");
      }

      const safeName = proofFile.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-");

      storagePath = `${session.user.id}/${orderId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(storagePath, proofFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const response = await authFetch(
        `${API_URL}/orders/${orderId}/payment-proof`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_proof_url: storagePath,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        await supabase.storage.from("payment-proofs").remove([storagePath]);

        throw new Error(data?.detail ?? "Unable to submit payment proof.");
      }

      setProofFile(null);
      setOpen(false);
      setLeaveConfirmOpen(false);
      setMessage(
        "Payment proof submitted. Studio MONTRO will review it shortly.",
      );

      await onUpdated();

      if (onProofSubmitted) {
        await onProofSubmitted(storagePath);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit payment proof.",
      );
    } finally {
      setUploading(false);
    }
  }

  function requestClose() {
    if (canPay) {
      setLeaveConfirmOpen(true);
      return;
    }

    setOpen(false);
  }

  if (status === "cancelled") {
    return null;
  }

  if (paymentStatus === "verified") {
    return (
      <div className="border border-[#9ea794] p-4">
        <p className="text-sm font-medium text-[#485342]">Payment verified</p>
        <p className="mt-2 text-xs leading-5 text-[#756d65]">
          Your payment has been confirmed and the order can continue.
        </p>
      </div>
    );
  }

  if (paymentProofUrl) {
    return (
      <div className="border border-[#c3bcae] p-4">
        <p className="text-sm font-medium">Proof received</p>
        <p className="mt-2 text-xs leading-5 text-[#756d65]">
          Your payment proof is waiting for studio verification.
        </p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="border border-[#b48b83] p-4">
        <p className="text-sm font-medium text-[#713f38]">
          Payment window expired
        </p>
        <p className="mt-2 text-xs leading-5 text-[#756d65]">
          Payment proof can no longer be submitted. The order will be
          automatically cancelled and reserved stock released.
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <p className="text-sm leading-6 text-[#756d65]">
          Complete your bank transfer and submit proof before the 24-hour
          payment window ends.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d]"
        >
          <span>Complete payment</span>
          <span>→</span>
        </button>

        {message && (
          <p className="mt-3 text-xs leading-5 text-[#756d65]">{message}</p>
        )}
      </div>

      {showReminder && canPay && !open && (
        <div className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-2.5rem)] max-w-[560px] -translate-x-1/2 border border-[#bdb4aa] bg-[#f4f0e9] p-4 shadow-[0_18px_50px_rgba(37,33,29,0.14)] md:flex md:items-center md:justify-between md:gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
              Payment required
            </p>
            <p className="mt-1 text-sm text-[#625a53]">
              Complete your bank transfer and submit proof within the payment
              window.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 w-full border border-[#25211d] bg-[#25211d] px-5 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] md:mt-0 md:w-auto"
          >
            Complete payment
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#25211d]/40 px-4 pb-4 pt-22 backdrop-blur-[3px] md:px-6 md:pt-22">
          <div className="mx-auto flex min-h-full max-w-[760px] items-start justify-center">
            <div className="relative z-[1] w-full border border-[#c9c0b6] bg-[#f4f0e9] shadow-[0_28px_90px_rgba(37,33,29,0.18)]">
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close payment"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center text-2xl font-light text-[#746c64] transition hover:text-[#25211d]"
              >
                ×
              </button>

              <div className="border-b border-[#cec6bc] px-6 py-6 md:px-8">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
                  Payment
                </p>

                <div className="mt-3 flex flex-col gap-3 pr-10 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-2xl font-medium tracking-[-0.025em]">
                      Complete your bank transfer
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#756d65]">
                      Your order is reserved while we wait for payment proof.
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#91877e]">
                      Exact amount
                    </p>
                    <p className="mt-1 text-xl font-medium">
                      RM{" "}
                      {Number(total).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-b border-[#cec6bc] p-6 md:border-b-0 md:border-r md:p-8">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                    Step 1 · Transfer
                  </p>

                  <div className="mt-5 overflow-hidden border border-[#cec6bc] bg-white p-3">
                    <img
                      src="/payment/maybank-qr.jpeg"
                      alt="Maybank payment QR"
                      className="aspect-square w-full object-contain"
                    />
                  </div>

                  <div className="mt-5 border-t border-[#d8d0c7] pt-5">
                    <p className="text-xs text-[#8a8178]">Maybank</p>

                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-lg font-medium tracking-[0.04em]">
                        1520 9603 0550
                      </p>

                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText("152096030550");
                          setMessage("Bank account number copied.");
                        }}
                        className="text-xs underline decoration-[#9c9289] underline-offset-4"
                      >
                        Copy
                      </button>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-[#817870]">
                      Transfer the exact amount shown above, then upload your
                      receipt or payment screenshot.
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                    Step 2 · Payment proof
                  </p>

                  <p className="mt-4 text-sm leading-6 text-[#756d65]">
                    Upload a clear screenshot, image, or PDF showing your
                    completed transfer.
                  </p>

                  <label className="mt-6 block cursor-pointer border border-dashed border-[#a99f95] px-5 py-7 text-center transition hover:bg-[#eee8df]">
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={chooseFile}
                    />

                    <p className="text-sm font-medium">
                      {proofFile ? proofFile.name : "Choose payment proof"}
                    </p>
                    <p className="mt-2 text-xs text-[#8a8178]">
                      JPG, PNG, WEBP or PDF · Max 10MB
                    </p>
                  </label>

                  {message && (
                    <p className="mt-4 text-xs leading-5 text-[#6f675f]">
                      {message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void submitProof()}
                    disabled={!proofFile || uploading}
                    className="mt-6 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>
                      {uploading
                        ? "Submitting payment proof..."
                        : "Submit payment proof"}
                    </span>
                    <span>→</span>
                  </button>

                  <p className="mt-4 text-center text-[11px] leading-5 text-[#91877e]">
                    Your proof will be attached securely to this order for admin
                    review.
                  </p>
                </div>
              </div>

              {leaveConfirmOpen && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#25211d]/20 p-5 backdrop-blur-[2px]">
                  <div className="w-full max-w-[420px] border border-[#c9c0b6] bg-[#f4f0e9] p-6 text-center shadow-[0_22px_60px_rgba(37,33,29,0.18)]">
                    <p className="text-lg font-medium">
                      Payment is not completed yet
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#756d65]">
                      Your order remains reserved during the payment window. You
                      can reopen payment from this page before it expires.
                    </p>

                    <button
                      type="button"
                      onClick={() => setLeaveConfirmOpen(false)}
                      className="mt-6 w-full bg-[#25211d] px-5 py-3.5 text-sm text-[#f4f0e9]"
                    >
                      Continue payment
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLeaveConfirmOpen(false);
                        setOpen(false);
                      }}
                      className="mt-3 text-xs text-[#756d65] underline decoration-[#aaa198] underline-offset-4"
                    >
                      Leave for now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
