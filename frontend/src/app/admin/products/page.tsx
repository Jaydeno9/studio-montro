"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/src/lib/adminFetch";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  status: "active" | "inactive";
  category_id: string | null;
  created_at: string;
  updated_at: string;
  primary_image?:
    | string
    | {
        image_url?: string | null;
        url?: string | null;
      }
    | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type StockFilter = "all" | "low" | "out" | "in_stock";
type StatusFilter = "all" | "active" | "inactive";
type DateFilter = "all" | "7d" | "30d" | "90d";
type SortOption =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "stock_asc"
  | "stock_desc"
  | "price_asc"
  | "price_desc";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const LOW_STOCK_THRESHOLD = 5;

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("created_desc");
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setMessage("");

      const [productsResponse, categoriesResponse, catalogueResponse] =
        await Promise.all([
          adminFetch(`${API_URL}/admin/products`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/products`),
        ]);

      if (!productsResponse.ok) {
        const errorData = await productsResponse.json().catch(() => null);

        throw new Error(errorData?.detail || "Failed to load products");
      }

      if (!categoriesResponse.ok) {
        throw new Error("Failed to load categories");
      }

      const productsData: Product[] = await productsResponse.json();

      const categoriesData: Category[] = await categoriesResponse.json();

      const catalogueData = catalogueResponse.ok
        ? await catalogueResponse.json()
        : [];

      const catalogueProducts = Array.isArray(catalogueData)
        ? catalogueData
        : Array.isArray(catalogueData?.products)
          ? catalogueData.products
          : [];

      const imageById = new Map<string, string | null>(
        catalogueProducts.map(
          (product: {
            id: string;
            primary_image?:
              | string
              | {
                  image_url?: string | null;
                  url?: string | null;
                }
              | null;
          }) => [product.id, resolveImageUrl(product.primary_image)],
        ),
      );

      const enrichedProducts = productsData.map((product) => ({
        ...product,
        primary_image:
          resolveImageUrl(product.primary_image) ??
          imageById.get(product.id) ??
          null,
      }));

      setProducts(enrichedProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        router.push("/admin/login");
        return;
      }

      setMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProducts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentTimeMs(new Date().getTime());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextProducts = products.filter((product) => {
      if (categoryFilter !== "all" && product.category_id !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "all" && product.status !== statusFilter) {
        return false;
      }

      if (stockFilter === "low") {
        if (
          product.stock_quantity <= 0 ||
          product.stock_quantity > LOW_STOCK_THRESHOLD
        ) {
          return false;
        }
      }

      if (stockFilter === "out" && product.stock_quantity !== 0) {
        return false;
      }

      if (
        stockFilter === "in_stock" &&
        product.stock_quantity <= LOW_STOCK_THRESHOLD
      ) {
        return false;
      }

      if (dateFilter !== "all") {
        if (currentTimeMs === null) {
          return false;
        }

        const ageMs = currentTimeMs - new Date(product.created_at).getTime();

        const maxAgeDays =
          dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;

        if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const categoryName = product.category_id
        ? categoryMap.get(product.category_id)?.name
        : "";

      return [product.name, product.slug, categoryName, product.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return nextProducts.sort((a, b) => {
      switch (sortOption) {
        case "created_asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        case "name_asc":
          return a.name.localeCompare(b.name);

        case "name_desc":
          return b.name.localeCompare(a.name);

        case "stock_asc":
          return a.stock_quantity - b.stock_quantity;

        case "stock_desc":
          return b.stock_quantity - a.stock_quantity;

        case "price_asc":
          return Number(a.price) - Number(b.price);

        case "price_desc":
          return Number(b.price) - Number(a.price);

        case "created_desc":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [
    categoryFilter,
    categoryMap,
    currentTimeMs,
    dateFilter,
    products,
    search,
    sortOption,
    statusFilter,
    stockFilter,
  ]);

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (product) =>
      product.stock_quantity > 0 &&
      product.stock_quantity <= LOW_STOCK_THRESHOLD,
  ).length;
  const outOfStockCount = products.filter(
    (product) => product.stock_quantity === 0,
  ).length;
  const inactiveCount = products.filter(
    (product) => product.status === "inactive",
  ).length;

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    setDateFilter("all");
    setSortOption("created_desc");
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) {
      return "Uncategorised";
    }

    return categoryMap.get(categoryId)?.name ?? "Unknown";
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Catalogue
        </p>

        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              Products
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c64]">
              Manage catalogue details, monitor inventory, and keep inactive or
              low-stock pieces under control.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex w-fit items-center justify-center bg-[#25211d] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#39332d]"
          >
            Add product
          </Link>
        </div>
      </header>

      <section className="grid gap-4 border-b border-[#cec6bc] py-8 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total products"
          value={totalProducts}
          detail="All catalogue pieces"
          onClick={() => {
            setStockFilter("all");
            setStatusFilter("all");
          }}
        />

        <SummaryCard
          label="Low stock"
          value={lowStockCount}
          detail={`1–${LOW_STOCK_THRESHOLD} units remaining`}
          emphasised={lowStockCount > 0}
          onClick={() => {
            setStockFilter("low");
            setStatusFilter("all");
          }}
        />

        <SummaryCard
          label="Out of stock"
          value={outOfStockCount}
          detail="No inventory remaining"
          emphasised={outOfStockCount > 0}
          onClick={() => {
            setStockFilter("out");
            setStatusFilter("all");
          }}
        />

        <SummaryCard
          label="Inactive"
          value={inactiveCount}
          detail="Hidden from storefront"
          onClick={() => {
            setStatusFilter("inactive");
            setStockFilter("all");
          }}
        />
      </section>

      <section className="border-b border-[#cec6bc] py-8">
        <div className="border border-[#d8d0c7] bg-[#f8f4ee] p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,1.35fr)_220px_180px_220px]">
            <FieldWrapper label="Search">
              <div className="flex h-12 items-center border border-[#b8aea4] bg-[#f4f0e9] px-4">
                <svg
                  viewBox="0 0 24 24"
                  className="mr-3 h-4 w-4 shrink-0 text-[#7d746b]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Product name, slug, category"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-[#aaa198]"
                />
              </div>
            </FieldWrapper>

            <FieldWrapper label="Category">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Status">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Sort by">
              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
                className="h-12 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
              >
                <option value="created_desc">Newest first</option>
                <option value="created_asc">Oldest first</option>
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
                <option value="stock_asc">Stock low–high</option>
                <option value="stock_desc">Stock high–low</option>
                <option value="price_asc">Price low–high</option>
                <option value="price_desc">Price high–low</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-[#ddd5cc] pt-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-[430px]">
              <FieldWrapper label="Inventory">
                <select
                  value={stockFilter}
                  onChange={(event) =>
                    setStockFilter(event.target.value as StockFilter)
                  }
                  className="h-11 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
                >
                  <option value="all">All inventory</option>
                  <option value="in_stock">In stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </FieldWrapper>

              <FieldWrapper label="Created">
                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value as DateFilter)
                  }
                  className="h-11 w-full border border-[#b8aea4] bg-[#f4f0e9] px-4 text-sm outline-none"
                >
                  <option value="all">Any date</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </FieldWrapper>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-[#817870]">
                Showing {filteredProducts.length} of {products.length} products
                <span className="mx-2 text-[#b2a89f]">·</span>
                {getSortLabel(sortOption)}
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 w-fit border border-[#8f867d] px-4 text-xs uppercase tracking-[0.08em] text-[#5d5550] transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className="my-6 border border-[#a77d75] px-5 py-4">
          <p className="text-sm text-[#713f38]">{message}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <p className="text-sm text-[#756d65]">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">No matching products</p>

          <p className="mt-2 text-sm text-[#817870]">
            Try clearing the current search or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <div className="min-w-[1120px]">
              <div className="grid w-full grid-cols-[minmax(300px,1fr)_160px_140px_160px_130px_150px_44px] gap-4 border-b border-[#8f867d] py-4 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
                <span>Product</span>
                <span>Category</span>
                <span>Price</span>
                <span>Inventory</span>
                <span>Status</span>
                <span>Created</span>
                <span className="text-right">Manage</span>
              </div>

              <div>
                {filteredProducts.map((product) => (
                  <DesktopProductRow
                    key={product.id}
                    product={product}
                    categoryName={getCategoryName(product.category_id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#cec6bc] xl:hidden">
            {filteredProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                categoryName={getCategoryName(product.category_id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function DesktopProductRow({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const stockState = getStockState(product.stock_quantity);

  return (
    <Link
      href={`/admin/products/${product.id}`}
      className="group grid w-full grid-cols-[minmax(300px,1fr)_160px_140px_160px_130px_150px_44px] gap-4 border-b border-[#ddd5cc] py-6 transition hover:bg-[#f7f2eb]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ProductThumb product={product} />

        <div className="min-w-0">
          <p className="truncate text-base font-medium tracking-[-0.015em]">
            {product.name}
          </p>

          <p className="mt-1 truncate text-xs text-[#817870]">{product.slug}</p>
        </div>
      </div>

      <div className="flex items-center">
        <p className="text-sm text-[#5f5750]">{categoryName}</p>
      </div>

      <div className="flex items-center">
        <p className="text-sm font-medium">
          RM{" "}
          {Number(product.price).toLocaleString("en-MY", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div className="flex items-center">
        <InventoryBlock
          quantity={product.stock_quantity}
          label={stockState.label}
          important={stockState.important}
        />
      </div>

      <div className="flex items-center">
        <RectStatus>{product.status}</RectStatus>
      </div>

      <div className="flex items-center">
        <div>
          <p className="text-sm text-[#5f5750]">
            {new Date(product.created_at).toLocaleDateString("en-MY", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>

          <p className="mt-1 text-xs text-[#91877e]">
            {new Date(product.created_at).toLocaleTimeString("en-MY", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center border border-[#a79d93] text-[#5f5750] transition group-hover:border-[#25211d] group-hover:bg-[#25211d] group-hover:text-[#f4f0e9]"
        >
          <ManageIcon />
        </span>
      </div>
    </Link>
  );
}

function MobileProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const stockState = getStockState(product.stock_quantity);

  return (
    <Link href={`/admin/products/${product.id}`} className="block py-7">
      <div className="flex gap-4">
        <ProductThumb product={product} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium">{product.name}</p>

              <p className="mt-1 truncate text-xs text-[#817870]">
                {product.slug}
              </p>
            </div>

            <p className="shrink-0 text-sm font-medium">
              RM{" "}
              {Number(product.price).toLocaleString("en-MY", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <p className="mt-3 text-sm text-[#756d65]">{categoryName}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <RectStatus>{product.status}</RectStatus>

            <span
              className={`text-xs ${
                stockState.important
                  ? "font-medium text-[#713f38]"
                  : "text-[#756d65]"
              }`}
            >
              {product.stock_quantity} · {stockState.label}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#ddd5cc] pt-4">
            <p className="text-xs text-[#91877e]">
              Added{" "}
              {new Date(product.created_at).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>

            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center border border-[#a79d93] text-[#5f5750]"
            >
              <ManageIcon />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductThumb({ product }: { product: Product }) {
  const imageUrl = resolveImageUrl(product.primary_image);

  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#d4ccc3] bg-[#e8e1d8]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-[0.1em] text-[#91877e]">
          No image
        </div>
      )}
    </div>
  );
}

function InventoryBlock({
  quantity,
  label,
  important,
}: {
  quantity: number;
  label: string;
  important: boolean;
}) {
  return (
    <div>
      <p
        className={`text-base font-medium ${important ? "text-[#713f38]" : ""}`}
      >
        {quantity}
      </p>

      <p
        className={`mt-1 text-xs ${
          important ? "text-[#8a4b43]" : "text-[#817870]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  emphasised = false,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  emphasised?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-6 text-left transition ${
        emphasised
          ? "border-[#cdbfb2] bg-[#f1e8df]"
          : "border-[#ddd5cc] bg-[#f8f4ee]"
      } hover:bg-[#f1ebe3]`}
    >
      <p className="text-[10px] uppercase tracking-[0.13em] text-[#8a8178]">
        {label}
      </p>

      <p className="mt-4 text-4xl font-medium tracking-[-0.04em]">{value}</p>

      <p className="mt-3 text-sm leading-6 text-[#756d65]">{detail}</p>
    </button>
  );
}

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.13em] text-[#8a8178]">
        {label}
      </span>
      {children}
    </label>
  );
}

function RectStatus({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border border-[#8f867d] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-[#4d4640]">
      {children}
    </span>
  );
}

function ManageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 5.5 18.5 9.5" />
      <path d="M5 19l3.8-.8L18.9 8.1a2.1 2.1 0 0 0-3-3L5.8 15.2 5 19Z" />
    </svg>
  );
}

function resolveImageUrl(
  value:
    | string
    | {
        image_url?: string | null;
        url?: string | null;
      }
    | null
    | undefined,
) {
  if (typeof value === "string") {
    return value;
  }

  return value?.image_url ?? value?.url ?? null;
}

function getSortLabel(sortOption: SortOption) {
  switch (sortOption) {
    case "created_asc":
      return "oldest first";
    case "name_asc":
      return "name A–Z";
    case "name_desc":
      return "name Z–A";
    case "stock_asc":
      return "stock low–high";
    case "stock_desc":
      return "stock high–low";
    case "price_asc":
      return "price low–high";
    case "price_desc":
      return "price high–low";
    case "created_desc":
    default:
      return "newest first";
  }
}

function getStockState(quantity: number) {
  if (quantity <= 0) {
    return {
      label: "Out of stock",
      important: true,
    };
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return {
      label: "Low stock",
      important: true,
    };
  }

  return {
    label: "In stock",
    important: false,
  };
}
