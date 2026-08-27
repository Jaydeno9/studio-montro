"use client";

type OrderStatus =
  | "pending_payment"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

type Props = {
  status: OrderStatus;
  paymentStatus: "pending" | "verified";
  hasPaymentProof: boolean;
  refundStatus?: "not_required" | "required" | "completed";
};

const steps = [
  { key: "placed", label: "Order placed" },
  { key: "payment", label: "Payment" },
  { key: "processing", label: "Preparing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

export default function CustomerOrderProgress({
  status,
  paymentStatus,
  hasPaymentProof,
  refundStatus = "not_required",
}: Props) {
  if (status === "cancelled") {
    return (
      <div className="border-y border-[#cec6bc] py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
              Order progress
            </p>
            <p className="mt-3 text-lg font-medium">Order cancelled</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#756d65]">
              This order is no longer being fulfilled.
              {refundStatus === "required"
                ? " A refund is still being processed."
                : refundStatus === "completed"
                  ? " The required refund has been completed."
                  : " No refund is required."}
            </p>
          </div>

          <span className="border border-[#8f867d] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em]">
            Cancelled
          </span>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentStepIndex(
    status,
    paymentStatus,
    hasPaymentProof,
  );

  return (
    <div className="border-y border-[#cec6bc] py-6">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
        Order progress
      </p>

      <div className="mt-6 grid gap-0 sm:grid-cols-5">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;

          return (
            <div key={step.key} className="relative pb-5 sm:pb-0">
              <div className="flex items-center sm:block">
                <div
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center border text-[10px] ${
                    complete
                      ? "border-[#25211d] bg-[#25211d] text-[#f4f0e9]"
                      : current
                        ? "border-[#25211d] bg-[#f4f0e9] text-[#25211d]"
                        : "border-[#bdb4aa] bg-[#f4f0e9] text-[#91877e]"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[13px] top-7 h-[calc(100%-7px)] w-px sm:left-7 sm:top-[13px] sm:h-px sm:w-[calc(100%-28px)] ${
                      complete ? "bg-[#25211d]" : "bg-[#cec6bc]"
                    }`}
                  />
                )}

                <div className="ml-4 sm:ml-0 sm:mt-3 sm:pr-4">
                  <p
                    className={`text-xs font-medium ${
                      current || complete ? "text-[#25211d]" : "text-[#91877e]"
                    }`}
                  >
                    {step.label}
                  </p>

                  {current && (
                    <p className="mt-1 text-[11px] leading-4 text-[#817870]">
                      {getCurrentStepDetail(
                        step.key,
                        paymentStatus,
                        hasPaymentProof,
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCurrentStepIndex(
  status: OrderStatus,
  paymentStatus: "pending" | "verified",
  hasPaymentProof: boolean,
) {
  if (status === "delivered") return 4;
  if (status === "shipped") return 3;
  if (status === "processing" || status === "ready_to_ship") {
    return 2;
  }

  if (
    status === "pending_payment" &&
    (paymentStatus === "verified" || hasPaymentProof)
  ) {
    return 1;
  }

  return 1;
}

function getCurrentStepDetail(
  key: (typeof steps)[number]["key"],
  paymentStatus: "pending" | "verified",
  hasPaymentProof: boolean,
) {
  if (key === "payment") {
    if (paymentStatus === "verified") {
      return "Payment verified";
    }

    if (hasPaymentProof) {
      return "Proof under review";
    }

    return "Awaiting payment";
  }

  if (key === "processing") {
    return "Studio preparation";
  }

  if (key === "shipped") {
    return "On the way";
  }

  if (key === "delivered") {
    return "Delivered";
  }

  return "";
}
