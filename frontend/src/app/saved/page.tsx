"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSavedProducts } from "@/src/hooks/useSavedProducts";
import { useCart } from "@/src/hooks/useCart";
import { supabase } from "@/src/lib/supabase";

type ProductColor = {
  id: string;
  color_name: string;
  color_hex: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  material: string | null;
  dimensions: string | null;
  status: "active" | "inactive";
  category: Category | null;
  primary_image: string | null;
  secondary_image: string | null;
  colors: ProductColor[];
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function SavedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(
    null,
  );
  const [quickAddColorId, setQuickAddColorId] = useState<string | null>(null);

  const {
    savedIds,
    busyIds: savedBusyIds,
    message: saveMessage,
    toggleSaved,
  } = useSavedProducts();

  const { busyIds: cartBusyIds, message: cartMessage, addItem } = useCart();

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setIsAuthenticated(Boolean(data.session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        window.setTimeout(() => {
          if (!cancelled) {
            setIsAuthenticated(Boolean(session));
          }
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoadingProducts(true);

        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data: Product[] = await response.json();

        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const savedProducts = useMemo(
    () => products.filter((product) => savedIds.has(product.id)),
    [products, savedIds],
  );

  async function handleAddToCart(product: Product) {
    if (product.stock_quantity <= 0 || cartBusyIds.has(product.id)) {
      return;
    }

    if (product.colors.length > 1) {
      setQuickAddProductId(product.id);
      setQuickAddColorId(product.colors[0]?.id ?? null);
      return;
    }

    await addItem({
      productId: product.id,
      quantity: 1,
      selectedColorId: product.colors[0]?.id ?? null,
    });
  }

  async function confirmQuickAdd(product: Product) {
    if (!quickAddColorId || cartBusyIds.has(product.id)) {
      return;
    }

    const added = await addItem({
      productId: product.id,
      quantity: 1,
      selectedColorId: quickAddColorId,
    });

    if (added) {
      setQuickAddProductId(null);
      setQuickAddColorId(null);
    }
  }

  if (isAuthenticated === null || loadingProducts) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Loading saved pieces...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="border-b border-[#cec6bc] pb-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
            Your collection
          </p>
          <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Saved pieces.
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[430px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Sign in to see your saved pieces.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Keep a personal shortlist of pieces you want to revisit.
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/login"
                className="bg-[#765149] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="border border-[#25211d] px-6 py-3.5 text-sm text-[#25211d] transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-28 pt-8 md:pt-10 text-[#25211d]">
      <header className="border-b border-[#cec6bc] pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
              Your collection
            </p>

            <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
              Saved pieces.
            </p>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#70675f]">
              A quiet shortlist of furniture and objects you want to revisit
              before deciding what belongs in your space.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="inline-flex items-center gap-3 border border-[#8f867d] px-4 py-3 text-sm transition hover:bg-[#ebe4db]"
            >
              <span>Account</span>
              <span>→</span>
            </Link>

            <Link
              href="/products"
              className="inline-flex items-center gap-3 border border-[#5f6f59] bg-[#5f6f59] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
            >
              <span>Continue browsing</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[#d8d0c7] pt-5">
          <p className="text-xs text-[#817870]">
            Keep pieces here while you compare finishes, scale and placement.
          </p>

          <p className="text-xs uppercase tracking-[0.16em] text-[#827970]">
            {savedProducts.length}{" "}
            {savedProducts.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </header>

      {savedProducts.length === 0 ? (
        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[430px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Nothing saved yet.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Save pieces from the shop and they will live here for later.
            </p>

            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-3 border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
            >
              Explore the shop
              <span>→</span>
            </Link>
          </div>
        </div>
      ) : (
        <section className="pt-10">
          <div className="grid grid-cols-1 gap-x-4 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {savedProducts.map((product) => {
              const isSaved = savedIds.has(product.id);
              const cartBusy = cartBusyIds.has(product.id);
              const saveBusy = savedBusyIds.has(product.id);

              return (
                <article key={product.id} className="group">
                  <div className="relative">
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#e5dfd6]">
                        {product.primary_image ? (
                          <>
                            <img
                              src={product.primary_image}
                              alt={product.name}
                              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                                product.secondary_image
                                  ? "opacity-100 group-hover:opacity-0"
                                  : "transition-transform duration-700 group-hover:scale-[1.025]"
                              }`}
                            />

                            {product.secondary_image && (
                              <img
                                src={product.secondary_image}
                                alt={`${product.name} alternate view`}
                                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-[1.015] group-hover:opacity-100"
                              />
                            )}
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[#958c83]">
                              No image
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        void toggleSaved(product.id);
                      }}
                      disabled={saveBusy}
                      aria-label={`Remove ${product.name} from saved`}
                      title="Remove from saved"
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f0e9]/92 text-[#25211d] backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[19px] w-[19px]"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                    </button>

                    {product.stock_quantity <= 0 && (
                      <span className="absolute bottom-3 left-3 bg-[#f4f0e9]/90 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#5e5750] backdrop-blur-sm">
                        Sold out
                      </span>
                    )}
                  </div>

                  <div className="pt-4">
                    <Link href={`/products/${product.slug}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[15px] font-medium tracking-[-0.01em] text-[#29241f] transition group-hover:opacity-60">
                            {product.name}
                          </p>

                          {product.category && (
                            <p className="mt-1 text-xs text-[#8a8178]">
                              {product.category.name}
                            </p>
                          )}
                        </div>

                        <p className="shrink-0 text-sm text-[#29241f]">
                          RM{" "}
                          {product.price.toLocaleString("en-MY", {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </Link>

                    {product.colors.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {product.colors.map((color) => (
                          <span
                            key={color.id}
                            title={color.color_name}
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{
                              backgroundColor: color.color_hex,
                            }}
                          />
                        ))}

                        <span className="ml-1 text-[10px] text-[#938a81]">
                          {product.colors.length}{" "}
                          {product.colors.length === 1 ? "finish" : "finishes"}
                        </span>
                      </div>
                    )}

                    <div className="mt-5 border-t border-[#cfc7bd] pt-3">
                      {quickAddProductId === product.id ? (
                        <div>
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[#847b73]">
                              Choose finish
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddProductId(null);
                                setQuickAddColorId(null);
                              }}
                              className="text-lg font-light leading-none text-[#6f675f] transition hover:text-[#25211d]"
                              aria-label="Close quick add"
                            >
                              ×
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {product.colors.map((color) => {
                              const active = quickAddColorId === color.id;

                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setQuickAddColorId(color.id)}
                                  className={`flex items-center gap-2 border px-3 py-2 text-xs transition ${
                                    active
                                      ? "border-[#25211d] text-[#25211d]"
                                      : "border-[#cfc7bd] text-[#6f675f] hover:border-[#8f857c]"
                                  }`}
                                >
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/10"
                                    style={{
                                      backgroundColor: color.color_hex,
                                    }}
                                  />
                                  {color.color_name}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              void confirmQuickAdd(product);
                            }}
                            disabled={!quickAddColorId || cartBusy}
                            className="mt-4 flex w-full items-center justify-between bg-[#5f6f59] px-4 py-3 text-xs uppercase tracking-[0.11em] text-[#f4f0e9] transition hover:bg-[#52604d] disabled:cursor-wait disabled:opacity-40"
                          >
                            <span>
                              {cartBusy ? "Adding..." : "Add selected finish"}
                            </span>
                            <span className="text-base font-light">+</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={product.stock_quantity <= 0 || cartBusy}
                          onClick={() => {
                            void handleAddToCart(product);
                          }}
                          className="flex w-full items-center justify-between text-left text-xs uppercase tracking-[0.12em] text-[#39332d] transition hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <span>
                            {product.stock_quantity <= 0
                              ? "Unavailable"
                              : cartBusy
                                ? "Adding..."
                                : "Add to cart"}
                          </span>

                          <span className="text-lg font-light leading-none">
                            +
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {(cartMessage || saveMessage) && (
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
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </svg>

            <p className="text-sm leading-6 text-[#514b45]">
              {cartMessage || saveMessage}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
