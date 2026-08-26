"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSavedProducts } from "@/src/hooks/useSavedProducts";
import { useCart } from "@/src/hooks/useCart";

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

type SortOption = "newest" | "price_asc" | "price_desc" | "name_asc";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  price_asc: "Price: Low to high",
  price_desc: "Price: High to low",
  name_asc: "Name: A–Z",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");

  const [sort, setSort] = useState<SortOption>("newest");

  const [inStockOnly, setInStockOnly] = useState(false);

  const [minPrice, setMinPrice] = useState("");

  const [maxPrice, setMaxPrice] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(
    null,
  );
  const [quickAddColorId, setQuickAddColorId] = useState<string | null>(null);

  const {
    savedIds,
    busyIds,
    message: saveMessage,
    toggleSaved,
  } = useSavedProducts();

  const { busyIds: cartBusyIds, message: cartMessage, addItem } = useCart();

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data: Product[] = await response.json();

        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError("Unable to load products.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, Category>();

    for (const product of products) {
      if (product.category) {
        categoryMap.set(product.category.slug, product.category);
      }
    }

    return Array.from(categoryMap.values());
  }, [products]);

  const visibleProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) => product.category?.slug === selectedCategory,
      );
    }

    if (inStockOnly) {
      result = result.filter((product) => product.stock_quantity > 0);
    }

    if (minPrice !== "") {
      const minimum = Number(minPrice);

      if (!Number.isNaN(minimum)) {
        result = result.filter((product) => product.price >= minimum);
      }
    }

    if (maxPrice !== "") {
      const maximum = Number(maxPrice);

      if (!Number.isNaN(maximum)) {
        result = result.filter((product) => product.price <= maximum);
      }
    }

    result.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.price - b.price;

        case "price_desc":
          return b.price - a.price;

        case "name_asc":
          return a.name.localeCompare(b.name);

        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [products, selectedCategory, inStockOnly, minPrice, maxPrice, sort]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 py-24">
        <p className="text-sm text-[#746c64]">Loading shop...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 py-24">
        <p className="text-sm text-[#8b3a34]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] text-[#25211d]">
      {/* =========================
          SHOP HEADER
      ========================== */}
      <header className="px-8 pb-10 pt-20 md:pt-28">
        <div className="flex items-end justify-between border-b border-[#cec6bc] pb-7">
          <h1 className="text-5xl font-medium tracking-[-0.045em] md:text-7xl">
            <span className="text-[#25211d]">Shop</span>
          </h1>

          <p className="pb-1 text-xs uppercase tracking-[0.16em] text-[#827970]">
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </header>

      {/* =========================
          CATEGORY + CONTROLS
      ========================== */}
      <section className="px-8">
        <div className="flex flex-col gap-5 border-b border-[#cec6bc] pb-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Categories */}
          <nav className="flex gap-6 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 text-sm transition ${
                selectedCategory === "all"
                  ? "text-[#25211d]"
                  : "text-[#8a8178] hover:text-[#25211d]"
              }`}
            >
              All
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.slug)}
                className={`shrink-0 text-sm transition ${
                  selectedCategory === category.slug
                    ? "text-[#25211d]"
                    : "text-[#8a8178] hover:text-[#25211d]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="flex items-center gap-2 text-sm text-[#514b45] transition hover:text-black"
            >
              Filter
              {(inStockOnly || minPrice || maxPrice) && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25211d] px-1 text-[10px] text-[#f4f0e9]">
                  {
                    [inStockOnly, minPrice !== "", maxPrice !== ""].filter(
                      Boolean,
                    ).length
                  }
                </span>
              )}
              <span className="text-xs">{filtersOpen ? "−" : "+"}</span>
            </button>

            <div className="h-4 w-px bg-[#cec6bc]" />

            <label className="flex items-center gap-2">
              <span className="text-sm text-[#8a8178]">Sort</span>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="cursor-pointer appearance-none bg-transparent pr-4 text-sm text-[#25211d] outline-none"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Filter Panel */}
        <div
          className={`grid transition-all duration-300 ${
            filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid gap-10 border-b border-[#cec6bc] py-7 md:grid-cols-3">
              {/* Availability */}
              <div>
                <p className="mb-4 text-[11px] uppercase tracking-[0.14em] text-[#8a8178]">
                  Availability
                </p>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                    className="h-4 w-4 accent-[#25211d]"
                  />

                  <span className="text-sm text-[#514b45]">In stock only</span>
                </label>
              </div>

              {/* Price */}
              <div>
                <p className="mb-4 text-[11px] uppercase tracking-[0.14em] text-[#8a8178]">
                  Price
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center border-b border-[#bdb4aa] pb-2">
                    <span className="mr-2 text-xs text-[#8a8178]">RM</span>

                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="Min"
                      className="w-full bg-transparent text-sm text-[#25211d] outline-none placeholder:text-[#a49b92]"
                    />
                  </label>

                  <span className="text-[#a49b92]">—</span>

                  <label className="flex flex-1 items-center border-b border-[#bdb4aa] pb-2">
                    <span className="mr-2 text-xs text-[#8a8178]">RM</span>

                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="Max"
                      className="w-full bg-transparent text-sm text-[#25211d] outline-none placeholder:text-[#a49b92]"
                    />
                  </label>
                </div>
              </div>

              {/* Filter status / clear */}
              <div className="flex items-end md:justify-end">
                {inStockOnly || minPrice || maxPrice ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInStockOnly(false);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="text-xs text-[#756d65] underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
                  >
                    Clear filters
                  </button>
                ) : (
                  <p className="text-xs text-[#9a9188]">
                    Collection filters coming later.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          PRODUCT GRID
      ========================== */}
      <section className="px-8 pb-28 pt-8">
        {visibleProducts.length === 0 ? (
          <div className="py-28">
            <p className="text-sm text-[#756d65]">
              No pieces match this filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {visibleProducts.map((product) => {
              const isSaved = savedIds.has(product.id);

              return (
                <article key={product.id} className="group">
                  {/* IMAGE */}
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

                    {/* SAVE */}
                    <button
                      type="button"
                      onClick={() => {
                        void toggleSaved(product.id);
                      }}
                      disabled={busyIds.has(product.id)}
                      aria-label={
                        isSaved
                          ? `Remove ${product.name} from saved`
                          : `Save ${product.name}`
                      }
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f0e9]/90 backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px]"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                    </button>

                    {/* STOCK LABEL */}
                    {product.stock_quantity <= 0 && (
                      <span className="absolute bottom-3 left-3 bg-[#f4f0e9]/90 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#5e5750] backdrop-blur-sm">
                        Sold out
                      </span>
                    )}
                  </div>

                  {/* INFO */}
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

                    {/* FINISHES */}
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

                    {/* QUICK ADD */}
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
                            disabled={
                              !quickAddColorId || cartBusyIds.has(product.id)
                            }
                            className="mt-4 flex w-full items-center justify-between bg-[#25211d] px-4 py-3 text-xs uppercase tracking-[0.11em] text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-40"
                          >
                            <span>
                              {cartBusyIds.has(product.id)
                                ? "Adding..."
                                : "Add selected finish"}
                            </span>
                            <span className="text-base font-light">+</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            product.stock_quantity <= 0 ||
                            cartBusyIds.has(product.id)
                          }
                          onClick={() => {
                            void handleAddToCart(product);
                          }}
                          className="flex w-full items-center justify-between text-left text-xs uppercase tracking-[0.12em] text-[#39332d] transition hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <span>
                            {product.stock_quantity <= 0
                              ? "Unavailable"
                              : cartBusyIds.has(product.id)
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
        )}
      </section>
      {(cartMessage || saveMessage) && (
        <div className="fixed bottom-6 right-6 z-50 max-w-[320px] border border-[#cfc7bd] bg-[#f4f0e9]/95 px-5 py-4 shadow-[0_10px_35px_rgba(37,33,29,0.12)] backdrop-blur-md">
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
