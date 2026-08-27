"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { authFetch } from "@/src/lib/authFetch";
import { requestAuthPrompt } from "@/src/components/AuthRequiredPrompt";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type SavedProductResponse = {
  saved_id: string;
  saved_at: string;
  product: {
    id: string;
  };
};

export function useSavedProducts() {
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(),
  );
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(
    new Set(),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSavedProducts() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setLoadingSaved(false);
          }
          return;
        }

        const response = await authFetch(
          `${API_URL}/products/saved`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load saved products",
          );
        }

        const data: SavedProductResponse[] =
          await response.json();

        if (!cancelled) {
          setSavedIds(
            new Set(
              data.map((item) => item.product.id),
            ),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoadingSaved(false);
        }
      }
    }

    void loadSavedProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSaved = useCallback(
    async (productId: string) => {
      if (busyIds.has(productId)) {
        return;
      }

      const currentlySaved =
        savedIds.has(productId);

      try {
        setBusyIds((current) => {
          const next = new Set(current);
          next.add(productId);
          return next;
        });

        setMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setMessage("Sign in to save this piece.");
          requestAuthPrompt({
            title: "Save this piece",
            message: "Sign in to save this piece.",
          });
          return;
        }

        const response = await authFetch(
          `${API_URL}/products/${productId}/save`,
          {
            method: currentlySaved
              ? "DELETE"
              : "POST",
          },
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => null);

          throw new Error(
            data?.detail ??
              "Unable to update saved item",
          );
        }

        setSavedIds((current) => {
          const next = new Set(current);

          if (currentlySaved) {
            next.delete(productId);
          } else {
            next.add(productId);
          }

          return next;
        });

        setMessage(
          currentlySaved
            ? "Removed from saved"
            : "Saved",
        );

        window.setTimeout(() => {
          setMessage("");
        }, 1500);
      } catch (err) {
        console.error(err);

        if (
          err instanceof Error &&
          err.message === "AUTH_REQUIRED"
        ) {
          setMessage("Sign in to save this piece.");
          requestAuthPrompt({
            title: "Save this piece",
            message: "Sign in to save this piece.",
          });
          return;
        }

        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to update saved item.",
        );
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [busyIds, savedIds],
  );

  return {
    savedIds,
    loadingSaved,
    busyIds,
    message,
    toggleSaved,
  };
}
