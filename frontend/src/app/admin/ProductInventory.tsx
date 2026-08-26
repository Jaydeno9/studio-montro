"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/src/lib/adminFetch";

type AdjustmentMode = "add" | "remove" | "set";
type AdjustmentReason =
  | "restock"
  | "manual_correction"
  | "damaged"
  | "return"
  | "other";

type InventoryAdjustment = {
  id: string;
  product_id: string;
  previous_quantity: number;
  adjustment: number;
  new_quantity: number;
  mode: AdjustmentMode;
  reason: AdjustmentReason;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

type ProductInventoryProps = {
  productId: string;
  currentStock: number;
  onStockChanged: (newStock: number) => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const reasonLabels: Record<AdjustmentReason, string> = {
  restock: "Restock",
  manual_correction: "Manual correction",
  damaged: "Damaged / lost",
  return: "Customer return",
  other: "Other",
};

export default function ProductInventory({
  productId,
  currentStock,
  onStockChanged,
}: ProductInventoryProps) {
  const [mode, setMode] = useState<AdjustmentMode>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("restock");
  const [note, setNote] = useState("");

  const [history, setHistory] = useState<InventoryAdjustment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadHistory() {
        try {
          const response = await adminFetch(
            `${API_URL}/admin/products/${productId}/inventory-adjustments`,
          );

          if (!response.ok) {
            const data = await response.json().catch(() => null);

            throw new Error(
              data?.detail || "Failed to load inventory history.",
            );
          }

          const data: InventoryAdjustment[] = await response.json();

          if (!cancelled) {
            setHistory(data);
          }
        } catch (error) {
          console.error(error);

          if (!cancelled) {
            setIsError(true);
            setMessage(
              error instanceof Error
                ? error.message
                : "Failed to load inventory history.",
            );
          }
        } finally {
          if (!cancelled) {
            setHistoryLoading(false);
          }
        }
      }

      void loadHistory();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productId]);

  const numericQuantity = Number(quantity);

  const projectedStock = useMemo(() => {
    if (
      quantity.trim().length === 0 ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 0
    ) {
      return null;
    }

    if (mode === "add") {
      return currentStock + numericQuantity;
    }

    if (mode === "remove") {
      return currentStock - numericQuantity;
    }

    return numericQuantity;
  }, [currentStock, mode, numericQuantity, quantity]);

  const canAdjust =
    quantity.trim().length > 0 &&
    Number.isInteger(numericQuantity) &&
    numericQuantity >= 0 &&
    projectedStock !== null &&
    projectedStock >= 0 &&
    reason.length > 0 &&
    !adjusting;

  function handleModeChange(nextMode: AdjustmentMode) {
    setMode(nextMode);
    setMessage("");
    setIsError(false);

    if (nextMode === "add" && reason === "damaged") {
      setReason("restock");
    }

    if (nextMode === "remove" && reason === "restock") {
      setReason("damaged");
    }
  }

  function requestAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAdjust) {
      return;
    }

    setConfirmOpen(true);
  }

  async function refreshHistory() {
    const response = await adminFetch(
      `${API_URL}/admin/products/${productId}/inventory-adjustments`,
    );

    if (!response.ok) {
      return;
    }

    const data: InventoryAdjustment[] = await response.json();
    setHistory(data);
  }

  async function confirmAdjustment() {
    if (!canAdjust || projectedStock === null) {
      return;
    }

    setAdjusting(true);
    setConfirmOpen(false);
    setMessage("");
    setIsError(false);

    try {
      const response = await adminFetch(
        `${API_URL}/admin/products/${productId}/inventory-adjustments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode,
            quantity: numericQuantity,
            reason,
            note: note.trim() || null,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to adjust inventory.");
      }

      const newStock = Number(data.new_quantity);

      onStockChanged(newStock);

      setQuantity("");
      setNote("");
      setMessage(
        `Inventory updated from ${data.previous_quantity} to ${newStock}.`,
      );

      await refreshHistory();
    } catch (error) {
      console.error(error);

      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Failed to adjust inventory.",
      );
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ModeButton
              active={mode === "add"}
              label="Add stock"
              description="Restock or return"
              onClick={() => handleModeChange("add")}
            />
            <ModeButton
              active={mode === "remove"}
              label="Remove stock"
              description="Damage or correction"
              onClick={() => handleModeChange("remove")}
            />
            <ModeButton
              active={mode === "set"}
              label="Set exact"
              description="Replace quantity"
              onClick={() => handleModeChange("set")}
            />
          </div>

          <form
            onSubmit={requestAdjustment}
            className="mt-5 border border-[#d8d0c7] bg-[#f8f4ee] p-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="inventoryQuantity"
                  className="mb-2 block text-sm font-medium"
                >
                  {mode === "set" ? "New stock quantity" : "Quantity"}
                </label>

                <input
                  id="inventoryQuantity"
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={mode === "set" ? String(currentStock) : "1"}
                  className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none focus:border-[#5f5750]"
                />
              </div>

              <div>
                <label
                  htmlFor="inventoryReason"
                  className="mb-2 block text-sm font-medium"
                >
                  Reason
                </label>

                <select
                  id="inventoryReason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as AdjustmentReason)
                  }
                  className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none focus:border-[#5f5750]"
                >
                  <option value="restock">Restock</option>
                  <option value="manual_correction">Manual correction</option>
                  <option value="damaged">Damaged / lost</option>
                  <option value="return">Customer return</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="inventoryNote"
                className="mb-2 block text-sm font-medium"
              >
                Note
                <span className="ml-2 font-normal text-[#91877e]">
                  Optional
                </span>
              </label>

              <textarea
                id="inventoryNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Supplier restock, damaged during handling, stock count correction..."
                className="w-full resize-none border border-[#b8aea4] bg-[#f4f0e9] px-4 py-3 text-sm outline-none focus:border-[#5f5750]"
              />
            </div>

            {projectedStock !== null && (
              <div
                className={`mt-5 border px-4 py-4 ${
                  projectedStock < 0
                    ? "border-[#ad7d74] bg-[#f2e7e3]"
                    : "border-[#d8d0c7] bg-[#f4f0e9]"
                }`}
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
                      Result
                    </p>
                    <p className="mt-2 text-sm text-[#756d65]">
                      {currentStock} units →{" "}
                      <span className="font-medium text-[#25211d]">
                        {projectedStock} units
                      </span>
                    </p>
                  </div>

                  <p className="text-xs text-[#756d65]">
                    {getStockLabel(projectedStock)}
                  </p>
                </div>

                {projectedStock < 0 && (
                  <p className="mt-3 text-xs text-[#713f38]">
                    Inventory cannot go below zero.
                  </p>
                )}
              </div>
            )}

            {message && (
              <div
                className={`mt-5 border px-4 py-3 text-sm ${
                  isError
                    ? "border-[#ad7d74] bg-[#f2e7e3] text-[#713f38]"
                    : "border-[#a9b09f] bg-[#edf0e8] text-[#485342]"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={!canAdjust}
              className="mt-5 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span>
                {adjusting ? "Updating inventory..." : "Review adjustment"}
              </span>
              <span>→</span>
            </button>
          </form>
        </div>

        <aside className="border-t border-[#25211d]">
          <div className="border-b border-[#cec6bc] py-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Current inventory
            </p>
          </div>

          <div className="border-b border-[#cec6bc] py-6">
            <p className="text-5xl font-medium tracking-[-0.04em]">
              {currentStock}
            </p>
            <p className="mt-2 text-sm text-[#756d65]">
              {getStockLabel(currentStock)}
            </p>
          </div>

          <div className="py-5">
            <p className="text-xs leading-5 text-[#817870]">
              Orders already reserve and reduce stock when they are placed. Use
              this tool only for deliberate inventory corrections or
              replenishment.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 border-t border-[#cec6bc] pt-6">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium">Inventory history</p>
            <p className="mt-1 text-xs text-[#817870]">
              Recent manual stock adjustments.
            </p>
          </div>

          <p className="text-xs text-[#91877e]">
            {history.length} adjustment
            {history.length === 1 ? "" : "s"}
          </p>
        </div>

        {historyLoading ? (
          <p className="mt-5 text-sm text-[#817870]">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="mt-5 border border-[#d8d0c7] px-4 py-5 text-sm text-[#817870]">
            No manual inventory adjustments yet.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-[#ddd5cc] border-y border-[#ddd5cc]">
            {history.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 py-5 md:grid-cols-[130px_minmax(0,1fr)_140px]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatAdjustment(item.adjustment)}
                  </p>
                  <p className="mt-1 text-xs text-[#91877e]">
                    {item.previous_quantity} → {item.new_quantity}
                  </p>
                </div>

                <div>
                  <p className="text-sm">
                    {reasonLabels[item.reason] ?? item.reason}
                  </p>

                  {item.note && (
                    <p className="mt-1 text-xs leading-5 text-[#756d65]">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="md:text-right">
                  <p className="text-xs text-[#756d65]">
                    {new Date(item.created_at).toLocaleDateString("en-MY", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-[#91877e]">
                    {new Date(item.created_at).toLocaleTimeString("en-MY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmOpen && projectedStock !== null && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-[#25211d]/35 px-5">
          <div className="w-full max-w-md border border-[#9f958b] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.22)] md:p-7">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Inventory adjustment
            </p>

            <p className="mt-3 text-2xl font-medium tracking-[-0.025em]">
              Confirm stock change?
            </p>

            <p className="mt-3 text-sm leading-6 text-[#746c64]">
              Inventory will change from <strong>{currentStock}</strong> to{" "}
              <strong>{projectedStock}</strong> units. This adjustment will be
              recorded in inventory history.
            </p>

            <div className="mt-5 border-y border-[#cec6bc] py-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[#817870]">Reason</span>
                <span className="font-medium">{reasonLabels[reason]}</span>
              </div>

              {note.trim() && (
                <div className="mt-3 flex justify-between gap-4">
                  <span className="text-[#817870]">Note</span>
                  <span className="max-w-[240px] text-right">
                    {note.trim()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="border border-[#8f867d] px-4 py-3 text-sm transition hover:bg-[#ebe4db]"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={() => void confirmAdjustment()}
                disabled={adjusting}
                className="bg-[#25211d] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] disabled:opacity-40"
              >
                Confirm adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModeButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-4 text-left transition ${
        active
          ? "border-[#25211d] bg-[#ebe4db]"
          : "border-[#d8d0c7] bg-[#f8f4ee] hover:border-[#a79d93]"
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-[#817870]">{description}</p>
    </button>
  );
}

function getStockLabel(quantity: number) {
  if (quantity <= 0) {
    return "Out of stock";
  }

  if (quantity <= 5) {
    return "Low stock";
  }

  return "In stock";
}

function formatAdjustment(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}
