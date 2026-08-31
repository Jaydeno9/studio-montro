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
  price: number;
  stock_quantity: number;
  category: Category | null;
  primary_image: string | null;
  secondary_image: string | null;
  colors: ProductColor[];
  created_at: string;
};

type ProductListingSectionProps = {
  title?: string;
  viewAllHref?: string;
  limit?: number;

  category?: string;
  search?: string;
  productIds?: string[];

  excludeProductId?: string;
  className?: string;
};

import { API_URL } from "@/src/lib/apiConfig";

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5);

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailySeed() {
  const now = new Date();

  const dayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return hashString(dayKey);
}

function deterministicShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  const random = mulberry32(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));

    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export default function ProductListingSection({
  title = "People Are Looking At",
  viewAllHref = "/products",
  limit = 4,
  category,
  search,
  productIds,
  excludeProductId,
  className = "",
}: ProductListingSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          throw new Error("Unable to load products.");
        }

        const data = (await response.json()) as Product[];

        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load products.",
          );
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

  const visibleProducts = useMemo(() => {
    let result = [...products];

    if (excludeProductId) {
      result = result.filter((product) => product.id !== excludeProductId);
    }

    if (productIds && productIds.length > 0) {
      const order = new Map(productIds.map((id, index) => [id, index]));

      result = result
        .filter((product) => order.has(product.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    } else {
      if (category) {
        result = result.filter(
          (product) => product.category?.slug === category,
        );
      }

      if (search?.trim()) {
        const query = search.trim().toLowerCase();

        result = result.filter((product) => {
          const haystack = [
            product.name,
            product.category?.name ?? "",
            ...product.colors.map((color) => color.color_name),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(query);
        });
      }

      // Daily stable rotation:
      // - same calendar day = same product order
      // - next day = a different deterministic order
      // - no Math.random(), so refreshing the page does not reshuffle
      result = deterministicShuffle(result, getDailySeed());
    }

    return result.slice(0, limit);
  }, [products, category, search, productIds, excludeProductId, limit]);

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

  if (!loading && (error || visibleProducts.length === 0)) {
    return null;
  }

  return (
    <section
      className={`bg-[#f4f0e9] px-4 py-14 md:px-6 md:py-16 lg:px-8 lg:py-20 ${className}`}
    >
      <div className="mb-7 flex items-end justify-between gap-5 md:mb-9">
        <h2 className="text-3xl tracking-[-0.035em] md:text-4xl">{title}</h2>

        <Link
          href={viewAllHref}
          className="group shrink-0 text-sm text-[#625a53] transition hover:text-[#4b1f26]"
        >
          <span className="inline-flex items-center gap-2">
            View all
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:gap-x-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: limit }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))
          : visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSaved={savedIds.has(product.id)}
                saveBusy={busyIds.has(product.id)}
                cartBusy={cartBusyIds.has(product.id)}
                quickAddOpen={quickAddProductId === product.id}
                selectedColorId={quickAddColorId}
                onToggleSaved={() => void toggleSaved(product.id)}
                onAddToCart={() => void handleAddToCart(product)}
                onSelectColor={setQuickAddColorId}
                onCloseQuickAdd={() => {
                  setQuickAddProductId(null);
                  setQuickAddColorId(null);
                }}
                onConfirmQuickAdd={() => void confirmQuickAdd(product)}
              />
            ))}
      </div>

      {(cartMessage || saveMessage) && (
        <div className="fixed bottom-6 right-6 z-50 max-w-[320px] border border-[#cfc7bd] bg-[#f4f0e9]/95 px-5 py-4 shadow-[0_10px_35px_rgba(37,33,29,0.12)] backdrop-blur-md">
          <p className="text-sm leading-6 text-[#514b45]">
            {cartMessage || saveMessage}
          </p>
        </div>
      )}
    </section>
  );
}

function ProductCard({
  product,
  isSaved,
  saveBusy,
  cartBusy,
  quickAddOpen,
  selectedColorId,
  onToggleSaved,
  onAddToCart,
  onSelectColor,
  onCloseQuickAdd,
  onConfirmQuickAdd,
}: {
  product: Product;
  isSaved: boolean;
  saveBusy: boolean;
  cartBusy: boolean;
  quickAddOpen: boolean;
  selectedColorId: string | null;
  onToggleSaved: () => void;
  onAddToCart: () => void;
  onSelectColor: (colorId: string) => void;
  onCloseQuickAdd: () => void;
  onConfirmQuickAdd: () => void;
}) {
  return (
    <article className="group">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#e2dbd2]">
            {product.primary_image ? (
              <>
                <img
                  src={product.primary_image}
                  alt={product.name}
                  className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                    product.secondary_image
                      ? "opacity-100 group-hover:opacity-0"
                      : "group-hover:scale-[1.025]"
                  }`}
                />

                {product.secondary_image && (
                  <img
                    src={product.secondary_image}
                    alt={`${product.name} alternate view`}
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-[1.02] group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                  No image
                </span>
              </div>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={onToggleSaved}
          disabled={saveBusy}
          aria-label={
            isSaved
              ? `Remove ${product.name} from saved`
              : `Save ${product.name}`
          }
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f0e9]/90 text-[#4b1f26] backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
          </svg>
        </button>

        {product.stock_quantity <= 0 && (
          <span className="absolute bottom-3 left-3 bg-[#f4efe7]/90 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[#514b45] backdrop-blur-sm">
            Sold out
          </span>
        )}
      </div>

      <div className="pt-4">
        <Link href={`/products/${product.slug}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-medium tracking-[-0.015em]">
                <span className="text-[#2d2824]">{product.name}</span>
              </h3>

              {product.category && (
                <p className="mt-1 text-xs text-[#8a8178]">
                  {product.category.name}
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm text-[#514b45]">
              RM{" "}
              {Number(product.price).toLocaleString("en-MY", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </Link>

        {product.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {product.colors.slice(0, 4).map((color) => (
              <span
                key={color.id}
                title={color.color_name}
                className="h-2.5 w-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: color.color_hex }}
              />
            ))}

            {product.colors.length > 4 && (
              <span className="ml-1 text-[10px] text-[#91877e]">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-[#cfc7bd] pt-3">
          {quickAddOpen ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#847b73]">
                  Choose finish
                </p>

                <button
                  type="button"
                  onClick={onCloseQuickAdd}
                  className="text-lg font-light leading-none text-[#6f675f] transition hover:text-[#25211d]"
                  aria-label="Close quick add"
                >
                  ×
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {product.colors.map((color) => {
                  const active = selectedColorId === color.id;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => onSelectColor(color.id)}
                      className={`flex items-center gap-2 border px-3 py-2 text-xs transition ${
                        active
                          ? "border-[#4b1f26] text-[#4b1f26]"
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
                onClick={onConfirmQuickAdd}
                disabled={!selectedColorId || cartBusy}
                className="mt-4 flex w-full items-center justify-between bg-[#4b1f26] px-4 py-3 text-xs uppercase tracking-[0.11em] text-[#f4efe7] transition hover:bg-[#5a2730] disabled:cursor-wait disabled:opacity-40"
              >
                <span>{cartBusy ? "Adding..." : "Add selected finish"}</span>
                <span className="text-base font-light">+</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={product.stock_quantity <= 0 || cartBusy}
              onClick={onAddToCart}
              className="flex w-full items-center justify-between text-left text-xs uppercase tracking-[0.12em] text-[#39332d] transition hover:text-[#4b1f26] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span>
                {product.stock_quantity <= 0
                  ? "Unavailable"
                  : cartBusy
                    ? "Adding..."
                    : "Add to cart"}
              </span>

              <span className="text-lg font-light leading-none">+</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div>
      <div className="aspect-[4/5] animate-pulse bg-[#e3dcd3]" />

      <div className="pt-4">
        <div className="h-4 w-2/3 animate-pulse bg-[#ddd5cc]" />
        <div className="mt-2 h-3 w-1/3 animate-pulse bg-[#e3dcd3]" />
      </div>
    </div>
  );
}
