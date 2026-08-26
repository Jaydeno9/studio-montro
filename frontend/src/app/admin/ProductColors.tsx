"use client";

import { FormEvent, useEffect, useState } from "react";

import { adminFetch } from "@/src/lib/adminFetch";

type ProductColor = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string;
};

type ProductColorsProps = {
  productId: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function ProductColors({ productId }: ProductColorsProps) {
  const [colors, setColors] = useState<ProductColor[]>([]);

  const [colorName, setColorName] = useState("");

  const [colorHex, setColorHex] = useState("#000000");

  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);

  const [message, setMessage] = useState("");

  const [isError, setIsError] = useState(false);

  /*
   * Initial load
   *
   * 打开 Manage Product 页面时，
   * 自动读取这个 product 的 colors。
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchColors() {
      try {
        const response = await adminFetch(
          `${API_URL}/products/${productId}/colors`,
        );

        if (!response.ok) {
          const data = await response.json();

          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Failed to load colors",
          );
        }

        const data: ProductColor[] = await response.json();

        if (!cancelled) {
          setColors(data);
          setIsError(false);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setIsError(true);

          if (error instanceof Error && error.message === "AUTH_REQUIRED") {
            setMessage("Session expired. Please login again.");

            return;
          }

          if (error instanceof Error) {
            setMessage(error.message);
          } else {
            setMessage("Something went wrong");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchColors();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  /*
   * Refresh colors
   *
   * Add / Delete 成功后，
   * 重新 GET 最新 colors。
   */
  async function refreshColors() {
    const response = await adminFetch(
      `${API_URL}/products/${productId}/colors`,
    );

    if (!response.ok) {
      const data = await response.json();

      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Failed to refresh colors",
      );
    }

    const data: ProductColor[] = await response.json();

    setColors(data);
  }

  /*
   * Add Color
   */
  async function handleAddColor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAdding(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await adminFetch(
        `${API_URL}/products/${productId}/colors`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            color_name: colorName.trim(),
            color_hex: colorHex,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Failed to add color",
        );
      }

      setColorName("");
      setColorHex("#000000");

      await refreshColors();

      setMessage("Color added successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        setMessage("Session expired. Please login again.");

        return;
      }

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    } finally {
      setAdding(false);
    }
  }

  /*
   * Delete Color
   */
  async function handleDeleteColor(colorId: string) {
    const confirmed = window.confirm("Delete this color?");

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const response = await adminFetch(
        `${API_URL}/products/${productId}/colors/${colorId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to delete color",
        );
      }

      await refreshColors();

      setMessage("Color deleted successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        setMessage("Session expired. Please login again.");

        return;
      }

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  return (
    <section>
      {/* Existing Colors */}
      <div className="mb-8 space-y-3">
        {loading && <p className="text-sm text-black/50">Loading colors...</p>}

        {!loading && colors.length === 0 && (
          <p className="text-sm text-black/50">No colors added yet.</p>
        )}

        {!loading &&
          colors.map((color) => (
            <div
              key={color.id}
              className="flex items-center justify-between border border-black/10 px-4 py-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-8 w-8 rounded-full border border-black/15"
                  style={{
                    backgroundColor: color.color_hex,
                  }}
                />

                <div>
                  <p className="text-sm font-medium">{color.color_name}</p>

                  <p className="mt-1 text-xs text-black/50">
                    {color.color_hex}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteColor(color.id)}
                className="text-xs uppercase tracking-wider text-red-800"
              >
                Delete
              </button>
            </div>
          ))}
      </div>

      {/* Add Finish */}
      <form
        onSubmit={handleAddColor}
        className="space-y-5 border border-black/10 p-5"
      >
        <h3 className="text-base text-[#50250a]">Add Finish</h3>

        <div>
          <label htmlFor="colorName" className="mb-2 block text-sm">
            Color / Finish Name
          </label>

          <input
            id="colorName"
            value={colorName}
            onChange={(event) => setColorName(event.target.value)}
            placeholder="Natural Oak"
            required
            className="w-full border border-black/20 bg-transparent px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label htmlFor="colorHex" className="mb-2 block text-sm">
            Color
          </label>

          <div className="flex gap-3">
            <input
              id="colorHex"
              type="color"
              value={colorHex}
              onChange={(event) => setColorHex(event.target.value)}
              className="h-12 w-16 cursor-pointer border border-black/20 bg-transparent p-1"
            />

            <input
              value={colorHex}
              onChange={(event) => setColorHex(event.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              required
              className="flex-1 border border-black/20 bg-transparent px-4 py-3 outline-none"
            />
          </div>
        </div>

        {message && (
          <div
            className={`px-4 py-3 text-sm ${
              isError
                ? "bg-red-950/5 text-red-900"
                : "bg-green-950/5 text-green-900"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={adding}
          className="w-full bg-[#50250a] px-5 py-3 text-sm uppercase tracking-[0.12em] text-[#f5f1e8] disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Finish"}
        </button>
      </form>
    </section>
  );
}
