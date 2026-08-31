"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/src/hooks/useCart";

type ProductCatalogItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  primary_image: string | null;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function CartPage() {
  const {
    cartItems,
    cartCount,
    cartTotal,
    cartLoading,
    isAuthenticated,
    busyIds,
    message,
    updateItem,
    removeItem,
  } = useCart();

  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
          return;
        }

        const data: ProductCatalogItem[] = await response.json();

        if (!cancelled) {
          setCatalog(data);
        }
      } catch (err) {
        console.error("Unable to load cart product images:", err);
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const productsById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );

  if (cartLoading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Loading your bag...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="border-b border-[#cec6bc] pb-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
            Your bag
          </p>
          <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Sign in to continue.
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[460px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Your bag belongs with your account.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Log in or create an account to view the pieces in your bag and
              continue toward checkout.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="bg-[#765149] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="bg-[#5f6f59] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                Create account
              </Link>
            </div>

            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-2 text-sm text-[#6f675f] underline decoration-[#aaa198] underline-offset-4"
            >
              Continue browsing
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="flex items-end justify-between border-b border-[#cec6bc] pb-8">
          <p className="text-5xl font-medium tracking-[-0.045em] md:text-7xl">
            Bag
          </p>

          <p className="pb-1 text-xs uppercase tracking-[0.16em] text-[#827970]">
            0 pieces
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[430px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Your bag is empty.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Explore the collection and add a piece when something feels right.
            </p>

            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-3 border-b border-[#25211d] pb-1 text-sm text-[#25211d]"
            >
              Continue shopping
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-28 pt-8 md:pt-10 text-[#25211d]">
      <div className="flex items-end justify-between border-b border-[#cec6bc] pb-8">
        <p className="text-5xl font-medium tracking-[-0.045em] md:text-7xl">
          Bag
        </p>

        <p className="pb-1 text-xs uppercase tracking-[0.16em] text-[#827970]">
          {cartCount} {cartCount === 1 ? "piece" : "pieces"}
        </p>
      </div>

      <div className="grid gap-14 pt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_410px]">
        {/* ITEMS */}
        <section>
          {cartItems.map((item) => {
            const catalogProduct = productsById.get(item.product_id);
            const productName =
              item.products?.name ?? catalogProduct?.name ?? "Product";
            const productSlug = item.products?.slug ?? catalogProduct?.slug;
            const productPrice = Number(
              item.products?.price ?? catalogProduct?.price ?? 0,
            );
            const maxStock = catalogProduct?.stock_quantity ?? 99;
            const imageUrl = catalogProduct?.primary_image ?? null;
            const isBusy = busyIds.has(item.product_id);

            return (
              <article
                key={item.id}
                className="grid gap-5 border-b border-[#cec6bc] py-7 first:pt-0 sm:grid-cols-[150px_1fr]"
              >
                <Link
                  href={productSlug ? `/products/${productSlug}` : "/products"}
                  className="block overflow-hidden bg-[#e5dfd6]"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={productName}
                      className="aspect-[4/5] h-full w-full object-cover transition duration-500 hover:scale-[1.015]"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#958c83]">
                        No image
                      </span>
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <Link
                          href={
                            productSlug
                              ? `/products/${productSlug}`
                              : "/products"
                          }
                          className="text-lg font-medium tracking-[-0.015em] transition hover:opacity-55"
                        >
                          {productName}
                        </Link>

                        {item.product_colors && (
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{
                                backgroundColor: item.product_colors.color_hex,
                              }}
                            />

                            <p className="text-sm text-[#756d65]">
                              {item.product_colors.color_name}
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="shrink-0 text-sm text-[#25211d]">
                        RM{" "}
                        {Number(item.subtotal).toLocaleString("en-MY", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-[#938a81]">
                      RM{" "}
                      {productPrice.toLocaleString("en-MY", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      each
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
                        Quantity
                      </p>

                      <div className="flex h-10 items-center border border-[#bdb4aa]">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity === 1) {
                              void removeItem(item.id, item.product_id);
                              return;
                            }

                            void updateItem(
                              item.id,
                              item.product_id,
                              item.quantity - 1,
                            );
                          }}
                          disabled={isBusy}
                          aria-label={
                            item.quantity === 1
                              ? `Remove ${productName}`
                              : `Decrease ${productName} quantity`
                          }
                          className="flex h-full w-10 items-center justify-center text-lg font-light transition hover:bg-[#e9e2d9] disabled:cursor-wait disabled:opacity-35"
                        >
                          −
                        </button>

                        <span className="flex h-full min-w-11 items-center justify-center border-x border-[#bdb4aa] px-3 text-sm">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            void updateItem(
                              item.id,
                              item.product_id,
                              item.quantity + 1,
                            );
                          }}
                          disabled={isBusy || item.quantity >= maxStock}
                          aria-label={`Increase ${productName} quantity`}
                          className="flex h-full w-10 items-center justify-center text-lg font-light transition hover:bg-[#e9e2d9] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void removeItem(item.id, item.product_id);
                      }}
                      disabled={isBusy}
                      aria-label={`Remove ${productName} from bag`}
                      title="Remove from bag"
                      className="flex h-11 w-11 items-center justify-center text-[#6f675f] transition hover:scale-105 hover:text-[#25211d] disabled:cursor-wait disabled:opacity-40"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 10v6" />
                        <path d="M14 10v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-3 text-sm text-[#625a53] transition hover:text-[#25211d]"
          >
            <span>←</span>
            Continue shopping
          </Link>
        </section>

        {/* SUMMARY */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-5">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
                Order summary
              </p>
            </div>

            <div className="space-y-4 border-b border-[#cec6bc] py-6">
              <div className="flex items-center justify-between gap-5">
                <p className="text-sm text-[#756d65]">Subtotal</p>
                <p className="text-sm">
                  RM{" "}
                  {cartTotal.toLocaleString("en-MY", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between gap-5">
                <p className="text-sm text-[#756d65]">Shipping</p>

                <p className="text-sm">
                  {cartTotal >= 500
                    ? "Complimentary"
                    : "Calculated at checkout"}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6 py-6">
              <div>
                <p className="text-sm font-medium">Estimated total</p>
                <p className="mt-1 text-xs text-[#8a8178]">
                  Taxes and delivery confirmed at checkout.
                </p>
              </div>

              <p className="shrink-0 text-xl font-medium tracking-[-0.02em]">
                RM{" "}
                {cartTotal.toLocaleString("en-MY", {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <Link
              href="/checkout"
              className="flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d]"
            >
              <span>Proceed to checkout</span>
              <span>→</span>
            </Link>

            <div className="mt-5 space-y-2 text-xs leading-5 text-[#837a72]">
              <p>Free shipping on Malaysia orders above RM500.</p>
              <p>Secure checkout will be connected in the next flow.</p>
            </div>
          </div>
        </aside>
      </div>

      {message && (
        <div className="fixed bottom-6 right-6 z-50 max-w-[340px] border border-[#cfc7bd] bg-[#f4f0e9]/95 px-5 py-4 shadow-[0_10px_35px_rgba(37,33,29,0.12)] backdrop-blur-md">
          <div className="flex items-start gap-3">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#514b45]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12.5l2.5 2.5L16 9.5" />
            </svg>

            <p className="text-sm leading-6 text-[#514b45]">{message}</p>
          </div>
        </div>
      )}
    </main>
  );
}
