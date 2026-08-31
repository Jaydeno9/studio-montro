"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  units_sold: number;
};

type SortOption = "newest" | "best_selling" | "price_asc" | "price_desc";

type PricePreset =
  | "all"
  | "under_500"
  | "500_1000"
  | "1000_2000"
  | "2000_plus"
  | "custom";

import { API_URL } from "@/src/lib/apiConfig";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  best_selling: "Best selling",
  price_asc: "Price: Low to high",
  price_desc: "Price: High to low",
};

const PRICE_PRESETS: Array<{
  value: Exclude<PricePreset, "custom">;
  label: string;
  min?: string;
  max?: string;
}> = [
  {
    value: "all",
    label: "All prices",
  },
  {
    value: "under_500",
    label: "Under RM 500",
    max: "500",
  },
  {
    value: "500_1000",
    label: "RM 500 – 1,000",
    min: "500",
    max: "1000",
  },
  {
    value: "1000_2000",
    label: "RM 1,000 – 2,000",
    min: "1000",
    max: "2000",
  },
  {
    value: "2000_plus",
    label: "RM 2,000+",
    min: "2000",
  },
];

const ROOM_FILTERS: Record<
  string,
  {
    label: string;
    categories: string[];
    fallbackHref: string;
    fallbackLabel: string;
  }
> = {
  "kids-room": {
    label: "Kids' Room",
    categories: ["lighting", "decor", "objects"],
    fallbackHref: "/products?category=lighting",
    fallbackLabel: "Explore lighting",
  },

  outdoor: {
    label: "The Green Space",
    categories: ["lighting", "decor", "objects"],
    fallbackHref: "/products",
    fallbackLabel: "Explore all pieces",
  },

  "living-room": {
    label: "Living Room",
    categories: [
      "seating",
      "tables",
      "lighting",
      "decor",
      "objects",
      "furniture",
    ],
    fallbackHref: "/products",
    fallbackLabel: "Explore all pieces",
  },

  kitchen: {
    label: "Kitchen",
    categories: ["tables", "lighting", "decor", "objects"],
    fallbackHref: "/products?category=objects",
    fallbackLabel: "Explore objects",
  },
};

function isSortOption(value: string | null): value is SortOption {
  return (
    value === "newest" ||
    value === "best_selling" ||
    value === "price_asc" ||
    value === "price_desc"
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f4f0e9] px-4 py-20 sm:px-6 md:px-8">
          <p className="text-sm text-[#746c64]">Loading shop...</p>
        </main>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const searchTerm = searchParams.get("search")?.trim() ?? "";
  const selectedCategory = searchParams.get("category")?.trim() || "all";
  const selectedRoom = searchParams.get("room")?.trim() ?? "";

  const roomFilter = selectedRoom ? ROOM_FILTERS[selectedRoom] : undefined;

  const sortParam = searchParams.get("sort");

  const sort: SortOption = isSortOption(sortParam) ? sortParam : "newest";

  const inStockOnly = searchParams.get("stock") === "in";
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [customPriceOpen, setCustomPriceOpen] = useState(
    Boolean(minPrice || maxPrice),
  );

  const [sortOpen, setSortOpen] = useState(false);

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

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());

    mutate(params);

    const query = params.toString();

    router.replace(query ? `/products?${query}` : "/products", {
      scroll: false,
    });
  }

  function updateShopUrl({
    search,
    category,
    nextSort,
  }: {
    search?: string;
    category?: string;
    nextSort?: SortOption;
  }) {
    replaceParams((params) => {
      if (search !== undefined) {
        const trimmed = search.trim();

        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
      }

      if (category !== undefined) {
        if (category && category !== "all") {
          params.set("category", category);
        } else {
          params.delete("category");
        }
      }

      if (nextSort !== undefined) {
        if (nextSort !== "newest") {
          params.set("sort", nextSort);
        } else {
          params.delete("sort");
        }
      }
    });
  }

  function setAvailability(nextInStockOnly: boolean) {
    replaceParams((params) => {
      if (nextInStockOnly) {
        params.set("stock", "in");
      } else {
        params.delete("stock");
      }
    });
  }

  function setPriceRange(minimum?: string, maximum?: string) {
    replaceParams((params) => {
      if (minimum) {
        params.set("min_price", minimum);
      } else {
        params.delete("min_price");
      }

      if (maximum) {
        params.set("max_price", maximum);
      } else {
        params.delete("max_price");
      }
    });
  }

  function updateMinimumPrice(value: string) {
    replaceParams((params) => {
      if (value) {
        params.set("min_price", value);
      } else {
        params.delete("min_price");
      }
    });
  }

  function updateMaximumPrice(value: string) {
    replaceParams((params) => {
      if (value) {
        params.set("max_price", value);
      } else {
        params.delete("max_price");
      }
    });
  }

  function clearFilterControls() {
    replaceParams((params) => {
      params.delete("stock");
      params.delete("min_price");
      params.delete("max_price");
    });

    setCustomPriceOpen(false);
  }

  function clearAllFilters() {
    setFiltersOpen(false);
    setCustomPriceOpen(false);
    setSortOpen(false);

    router.replace("/products");
  }

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
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

  const selectedPricePreset: PricePreset = useMemo(() => {
    if (minPrice === "" && maxPrice === "") {
      return "all";
    }

    if (minPrice === "" && maxPrice === "500") {
      return "under_500";
    }

    if (minPrice === "500" && maxPrice === "1000") {
      return "500_1000";
    }

    if (minPrice === "1000" && maxPrice === "2000") {
      return "1000_2000";
    }

    if (minPrice === "2000" && maxPrice === "") {
      return "2000_plus";
    }

    return "custom";
  }, [minPrice, maxPrice]);

  const visibleProducts = useMemo(() => {
    let result = [...products];

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();

      result = result.filter((product) => {
        const haystack = [
          product.name,
          product.description,
          product.material,
          product.dimensions,
          product.category?.name,
          ...product.colors.map((color) => color.color_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) => product.category?.slug === selectedCategory,
      );
    }

    if (roomFilter) {
      result = result.filter((product) => {
        const categorySlug = product.category?.slug;

        return categorySlug
          ? roomFilter.categories.includes(categorySlug)
          : false;
      });
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
        case "best_selling":
          if (b.units_sold !== a.units_sold) {
            return b.units_sold - a.units_sold;
          }

          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        case "price_asc":
          return a.price - b.price;

        case "price_desc":
          return b.price - a.price;

        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [
    products,
    searchTerm,
    selectedCategory,
    roomFilter,
    inStockOnly,
    minPrice,
    maxPrice,
    sort,
  ]);

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

  const hasPriceFilter = minPrice !== "" || maxPrice !== "";

  const activeFilterCount = [inStockOnly, hasPriceFilter].filter(
    Boolean,
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-4 py-20 sm:px-6 md:px-8">
        <p className="text-sm text-[#746c64]">Loading shop...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-4 py-20 sm:px-6 md:px-8">
        <p className="text-sm text-[#8b3a34]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] text-[#25211d]">
      <header className="px-4 pb-7 pt-7 sm:px-6 sm:pb-9 md:px-8 md:pt-10">
        <div className="border-b border-[#cec6bc] pb-6 md:pb-7">
          <div className="flex items-end justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl md:text-7xl">
                <span className="text-[#4b1f26]">Shop</span>
              </h1>

              {searchTerm && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-[#756d65] sm:text-sm">
                    Results for “{searchTerm}”
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      updateShopUrl({
                        search: "",
                      })
                    }
                    className="text-xs underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {roomFilter && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-[#756d65] sm:text-sm">
                    Shop by room · {roomFilter.label}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      replaceParams((params) => {
                        params.delete("room");
                      })
                    }
                    className="text-xs underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
                  >
                    Clear room
                  </button>
                </div>
              )}
            </div>

            <p className="shrink-0 pb-1 text-[10px] uppercase tracking-[0.14em] text-[#827970] sm:text-xs">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1 ? "piece" : "pieces"}
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-5 border-b border-[#cec6bc]">
          <nav className="flex min-w-0 flex-1 gap-5 overflow-x-auto py-5 pr-3 [scrollbar-width:none] sm:gap-6 md:gap-7 [&::-webkit-scrollbar]:hidden">
            <CategoryButton
              active={selectedCategory === "all"}
              onClick={() =>
                updateShopUrl({
                  category: "all",
                })
              }
            >
              All
            </CategoryButton>

            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                active={selectedCategory === category.slug}
                onClick={() =>
                  updateShopUrl({
                    category: category.slug,
                  })
                }
              >
                {category.name}
              </CategoryButton>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="flex items-center gap-1.5 whitespace-nowrap py-5 text-xs transition hover:text-[#4b1f26] sm:text-sm"
            >
              <span>Filter</span>

              {activeFilterCount > 0 && (
                <span className="text-[#4b1f26]">({activeFilterCount})</span>
              )}

              <span className="hidden text-[10px] text-[#8a8178] sm:inline">
                {filtersOpen ? "−" : "+"}
              </span>
            </button>

            <div className="hidden h-4 w-px bg-[#cec6bc] sm:block" />

            <div ref={sortMenuRef} className="relative">
              <button
                type="button"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((current) => !current)}
                className="flex items-center gap-1.5 whitespace-nowrap py-5 text-xs sm:gap-2 sm:text-sm"
              >
                <span className="hidden text-[#8a8178] sm:inline">Sort by</span>

                <span className="text-[#25211d]">{SORT_LABELS[sort]}</span>

                <span
                  className={`text-[9px] text-[#8a8178] transition ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                >
                  ↓
                </span>
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full z-40 w-[210px] max-w-[calc(100vw-2rem)] border-y border-[#bfb6ac] bg-[#f4f0e9] py-2 shadow-[0_14px_35px_rgba(37,33,29,0.08)] sm:w-[230px]">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => {
                    const active = sort === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          updateShopUrl({
                            nextSort: option,
                          });

                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-5 px-4 py-3 text-left text-sm transition ${
                          active
                            ? "text-[#4b1f26]"
                            : "text-[#625a53] hover:text-[#25211d]"
                        }`}
                      >
                        <span>{SORT_LABELS[option]}</span>

                        {active && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ${
            filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-b border-[#cec6bc] py-7 sm:py-8">
              <div className="grid gap-8 md:grid-cols-[0.8fr_1.5fr] md:gap-10 xl:grid-cols-[0.7fr_1.6fr]">
                <div>
                  <FilterHeading>Availability</FilterHeading>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                    <FilterChoice
                      active={!inStockOnly}
                      onClick={() => setAvailability(false)}
                    >
                      All pieces
                    </FilterChoice>

                    <FilterChoice
                      active={inStockOnly}
                      onClick={() => setAvailability(true)}
                    >
                      In stock
                    </FilterChoice>
                  </div>
                </div>

                <div>
                  <FilterHeading>Price</FilterHeading>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 sm:gap-x-6">
                    {PRICE_PRESETS.map((preset) => (
                      <FilterChoice
                        key={preset.value}
                        active={selectedPricePreset === preset.value}
                        onClick={() => {
                          setCustomPriceOpen(false);

                          setPriceRange(preset.min, preset.max);
                        }}
                      >
                        {preset.label}
                      </FilterChoice>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCustomPriceOpen((current) => !current)}
                      className={`border-b pb-1 text-sm transition ${
                        selectedPricePreset === "custom" || customPriceOpen
                          ? "border-[#4b1f26] text-[#4b1f26]"
                          : "border-transparent text-[#756d65] hover:text-[#25211d]"
                      }`}
                    >
                      Custom range
                    </button>
                  </div>

                  {customPriceOpen && (
                    <div className="mt-6 grid max-w-[460px] grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="flex min-w-0 items-center border-b border-[#a99f95] pb-2">
                        <span className="mr-2 text-[11px] text-[#8a8178] sm:text-xs">
                          RM
                        </span>

                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={minPrice}
                          onChange={(event) =>
                            updateMinimumPrice(event.target.value)
                          }
                          placeholder="Min"
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa198]"
                        />
                      </div>

                      <span className="text-[#aaa198]">—</span>

                      <div className="flex min-w-0 items-center border-b border-[#a99f95] pb-2">
                        <span className="mr-2 text-[11px] text-[#8a8178] sm:text-xs">
                          RM
                        </span>

                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={maxPrice}
                          onChange={(event) =>
                            updateMaximumPrice(event.target.value)
                          }
                          placeholder="Max"
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa198]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-4 border-t border-[#d7cfc6] pt-5">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilterControls}
                    className="text-xs text-[#756d65] underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
                  >
                    Clear filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="bg-[#4b1f26] px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-[#f4efe7] transition hover:bg-[#5a2730] sm:text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pb-28">
        {visibleProducts.length === 0 ? (
          <div className="py-20 sm:py-28">
            {roomFilter ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
                  {roomFilter.label}
                </p>

                <p className="mt-4 max-w-xl text-3xl font-medium tracking-[-0.03em] text-[#25211d] md:text-4xl">
                  No pieces are currently curated for this room.
                </p>

                <p className="mt-4 max-w-lg text-sm leading-7 text-[#756d65]">
                  We would rather show fewer relevant pieces than fill the room
                  with products that do not belong here.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-5">
                  <Link
                    href={roomFilter.fallbackHref}
                    className="inline-flex items-center gap-3 bg-[#4b1f26] px-5 py-3.5 text-sm text-[#f4efe7] transition hover:bg-[#5a2730]"
                  >
                    {roomFilter.fallbackLabel}
                    <span>→</span>
                  </Link>

                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm text-[#625a53] underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#25211d]"
                  >
                    View all pieces
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-medium tracking-[-0.025em]">
                  No pieces found.
                </p>

                <p className="mt-3 max-w-md text-sm leading-6 text-[#756d65]">
                  Try another search, choose a different category, or remove
                  some filters.
                </p>

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-6 border-b border-[#25211d] pb-1 text-sm"
                >
                  View all pieces
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-14">
            {visibleProducts.map((product) => {
              const isSaved = savedIds.has(product.id);

              return (
                <article key={product.id} className="group min-w-0">
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
                            <span className="text-[9px] uppercase tracking-[0.14em] text-[#958c83] sm:text-[11px]">
                              No image
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => void toggleSaved(product.id)}
                      disabled={busyIds.has(product.id)}
                      aria-label={
                        isSaved
                          ? `Remove ${product.name} from saved`
                          : `Save ${product.name}`
                      }
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0e9]/90 backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-50 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                    </button>

                    {product.stock_quantity <= 0 && (
                      <span className="absolute bottom-2 left-2 bg-[#f4f0e9]/90 px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[#5e5750] backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-3 sm:py-2 sm:text-[10px]">
                        Sold out
                      </span>
                    )}
                  </div>

                  <div className="pt-3 sm:pt-4">
                    <Link href={`/products/${product.slug}`}>
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium tracking-[-0.01em] text-[#29241f] transition group-hover:opacity-60 sm:text-[15px]">
                            {product.name}
                          </p>

                          {product.category && (
                            <p className="mt-1 truncate text-[10px] text-[#8a8178] sm:text-xs">
                              {product.category.name}
                            </p>
                          )}
                        </div>

                        <p className="shrink-0 text-xs text-[#29241f] sm:text-sm">
                          RM{" "}
                          {product.price.toLocaleString("en-MY", {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </Link>

                    {product.colors.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1 sm:mt-3 sm:gap-1.5">
                        {product.colors.slice(0, 4).map((color) => (
                          <span
                            key={color.id}
                            title={color.color_name}
                            className="h-2.5 w-2.5 rounded-full border border-black/10 sm:h-3 sm:w-3"
                            style={{
                              backgroundColor: color.color_hex,
                            }}
                          />
                        ))}

                        {product.colors.length > 4 && (
                          <span className="text-[9px] text-[#938a81]">
                            +{product.colors.length - 4}
                          </span>
                        )}

                        <span className="ml-0.5 hidden text-[10px] text-[#938a81] sm:inline">
                          {product.colors.length}{" "}
                          {product.colors.length === 1 ? "finish" : "finishes"}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 border-t border-[#cfc7bd] pt-2.5 sm:mt-5 sm:pt-3">
                      {quickAddProductId === product.id ? (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[9px] uppercase tracking-[0.11em] text-[#847b73] sm:text-[10px]">
                              Choose finish
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddProductId(null);
                                setQuickAddColorId(null);
                              }}
                              className="text-base font-light leading-none text-[#6f675f] transition hover:text-[#25211d] sm:text-lg"
                              aria-label="Close quick add"
                            >
                              ×
                            </button>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                            {product.colors.map((color) => {
                              const active = quickAddColorId === color.id;

                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setQuickAddColorId(color.id)}
                                  className={`flex items-center gap-1.5 border px-2 py-1.5 text-[9px] transition sm:gap-2 sm:px-3 sm:py-2 sm:text-xs ${
                                    active
                                      ? "border-[#25211d] text-[#25211d]"
                                      : "border-[#cfc7bd] text-[#6f675f] hover:border-[#8f857c]"
                                  }`}
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full border border-black/10 sm:h-3 sm:w-3"
                                    style={{
                                      backgroundColor: color.color_hex,
                                    }}
                                  />

                                  <span className="max-w-[70px] truncate sm:max-w-none">
                                    {color.color_name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => void confirmQuickAdd(product)}
                            disabled={
                              !quickAddColorId || cartBusyIds.has(product.id)
                            }
                            className="mt-3 flex w-full items-center justify-between bg-[#25211d] px-3 py-2.5 text-[9px] uppercase tracking-[0.1em] text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-40 sm:mt-4 sm:px-4 sm:py-3 sm:text-xs"
                          >
                            <span>
                              {cartBusyIds.has(product.id)
                                ? "Adding..."
                                : "Add selected"}
                            </span>

                            <span className="text-sm font-light sm:text-base">
                              +
                            </span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            product.stock_quantity <= 0 ||
                            cartBusyIds.has(product.id)
                          }
                          onClick={() => void handleAddToCart(product)}
                          className="flex w-full items-center justify-between text-left text-[9px] uppercase tracking-[0.1em] text-[#39332d] transition hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-30 sm:text-xs sm:tracking-[0.12em]"
                        >
                          <span>
                            {product.stock_quantity <= 0
                              ? "Unavailable"
                              : cartBusyIds.has(product.id)
                                ? "Adding..."
                                : "Add to cart"}
                          </span>

                          <span className="text-base font-light leading-none sm:text-lg">
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
        <div className="fixed bottom-4 left-4 right-4 z-50 border border-[#cfc7bd] bg-[#f4f0e9]/95 px-4 py-3 shadow-[0_10px_35px_rgba(37,33,29,0.12)] backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-[320px] sm:px-5 sm:py-4">
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

            <p className="text-xs leading-5 text-[#514b45] sm:text-sm sm:leading-6">
              {cartMessage || saveMessage}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 whitespace-nowrap pb-2 text-xs transition sm:text-sm ${
        active ? "text-[#25211d]" : "text-[#8a8178] hover:text-[#25211d]"
      }`}
    >
      {children}

      {active && (
        <span className="absolute bottom-0 left-0 h-px w-5 bg-[#4b1f26] sm:w-6" />
      )}
    </button>
  );
}

function FilterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
      {children}
    </p>
  );
}

function FilterChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative whitespace-nowrap pb-1 text-xs transition sm:text-sm ${
        active ? "text-[#4b1f26]" : "text-[#756d65] hover:text-[#25211d]"
      }`}
    >
      {children}

      {active && (
        <span className="absolute bottom-0 left-0 h-px w-full bg-[#4b1f26]" />
      )}
    </button>
  );
}
