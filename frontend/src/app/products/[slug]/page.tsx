"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSavedProducts } from "@/src/hooks/useSavedProducts";
import { useCart } from "@/src/hooks/useCart";

type ProductColor = {
  id: string;
  product_id?: string;
  color_name: string;
  color_hex: string;
};

type ProductImage = {
  id: string;
  product_id?: string;
  image_url: string;
  sort_order: number;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  category: Category | null;
  primary_image: string | null;
  secondary_image: string | null;
  colors: ProductColor[];
};

type ProductDetail = {
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
  images: ProductImage[];
  colors: ProductColor[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();

  const slug = params.slug;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);

  const [, setSelectedImage] = useState<ProductImage | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  const [recommendedQuickAddId, setRecommendedQuickAddId] = useState<
    string | null
  >(null);
  const [recommendedColorId, setRecommendedColorId] = useState<string | null>(
    null,
  );

  const {
    savedIds,
    busyIds,
    message: saveMessage,
    toggleSaved,
  } = useSavedProducts();

  const isSaved = product ? savedIds.has(product.id) : false;

  const saveLoading = product ? busyIds.has(product.id) : false;

  const {
    cartItems,
    busyIds: cartBusyIds,
    message: cartMessage,
    addItem,
    removeItem,
  } = useCart();

  const cartLoading = product ? cartBusyIds.has(product.id) : false;

  const currentCartItem = useMemo(() => {
    if (!product) {
      return null;
    }

    return (
      cartItems.find((item) => {
        const sameProduct = item.product_id === product.id;
        const itemColorId = item.selected_color_id ?? null;
        const selectedColorId = selectedColor?.id ?? null;

        return sameProduct && itemColorId === selectedColorId;
      }) ?? null
    );
  }, [cartItems, product, selectedColor]);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const productsResponse = await fetch(`${API_URL}/products`);

        if (!productsResponse.ok) {
          throw new Error("Failed to load products");
        }

        const products: ProductListItem[] = await productsResponse.json();

        const matchedProduct = products.find((item) => item.slug === slug);

        if (!matchedProduct) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const detailResponse = await fetch(
          `${API_URL}/products/${matchedProduct.id}`,
        );

        if (!detailResponse.ok) {
          if (detailResponse.status === 404) {
            throw new Error("PRODUCT_NOT_FOUND");
          }

          throw new Error("Failed to load product");
        }

        const data: ProductDetail = await detailResponse.json();

        const sortedImages = [...(data.images ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );

        const normalizedProduct: ProductDetail = {
          ...data,
          images: sortedImages,
          colors: data.colors ?? [],
        };

        if (!cancelled) {
          setAllProducts(products);
          setProduct(normalizedProduct);
          setSelectedImage(sortedImages.length > 0 ? sortedImages[0] : null);
          setSelectedColor(
            normalizedProduct.colors.length > 0
              ? normalizedProduct.colors[0]
              : null,
          );
          setQuantity(1);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          if (err instanceof Error && err.message === "PRODUCT_NOT_FOUND") {
            setError("Product not found.");
          } else {
            setError("Unable to load product.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (slug) {
      void loadProduct();
    }
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const recommendedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    const sameCategory = allProducts.filter(
      (item) =>
        item.id !== product.id &&
        item.category?.slug === product.category?.slug,
    );

    const fallback = allProducts.filter(
      (item) =>
        item.id !== product.id &&
        !sameCategory.some((same) => same.id === item.id),
    );

    return [...sameCategory, ...fallback].slice(0, 4);
  }, [allProducts, product]);

  async function handleAddToCart() {
    if (!product || cartLoading) {
      return;
    }

    const added = await addItem({
      productId: product.id,
      quantity,
      selectedColorId: selectedColor?.id ?? null,
    });

    if (added) {
      setQuantity(1);
    }
  }

  async function handleRemoveFromCart() {
    if (!product || !currentCartItem || cartLoading) {
      return;
    }

    await removeItem(currentCartItem.id, product.id);
  }

  async function handleRecommendedAdd(item: ProductListItem) {
    if (item.stock_quantity <= 0 || cartBusyIds.has(item.id)) {
      return;
    }

    if (item.colors.length > 1) {
      setRecommendedQuickAddId(item.id);
      setRecommendedColorId(item.colors[0]?.id ?? null);
      return;
    }

    await addItem({
      productId: item.id,
      quantity: 1,
      selectedColorId: item.colors[0]?.id ?? null,
    });
  }

  async function confirmRecommendedAdd(item: ProductListItem) {
    if (!recommendedColorId || cartBusyIds.has(item.id)) {
      return;
    }

    const added = await addItem({
      productId: item.id,
      quantity: 1,
      selectedColorId: recommendedColorId,
    });

    if (added) {
      setRecommendedQuickAddId(null);
      setRecommendedColorId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 py-24">
        <p className="text-sm text-[#746c64]">Loading product...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 py-24">
        <p className="mb-6 text-sm text-[#746c64]">
          {error || "Product not found."}
        </p>

        <Link
          href="/products"
          className="text-sm underline decoration-[#aaa097] underline-offset-4"
        >
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] text-[#25211d]">
      {/* TOP BAR / NAV SPACE */}
      <div className="flex items-center justify-between px-8 pb-5 pt-24">
        <Link
          href="/products"
          className="group inline-flex items-center gap-3 text-[15px] font-medium text-[#514b45] transition hover:text-[#25211d]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          Back to shop
        </Link>

        <div className="flex flex-col items-end">
          <button
            type="button"
            onClick={() => {
              void toggleSaved(product.id);
            }}
            disabled={saveLoading}
            className="inline-flex items-center gap-2 text-[15px] font-medium text-[#514b45] transition hover:text-[#25211d] disabled:cursor-wait disabled:opacity-50"
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

            {saveLoading ? "Saving..." : isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* MAIN PRODUCT LAYOUT */}
      <section className="grid items-start gap-10 px-8 pb-24 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.72fr)] lg:gap-14">
        {/* GALLERY */}
        {/* GALLERY */}
        <div className="min-w-0 xl:sticky xl:top-[138px] xl:max-h-[calc(100dvh-154px)] xl:self-start xl:overflow-y-auto">
          {product.images.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className="group relative overflow-hidden bg-[#e6dfd5]"
                >
                  <img
                    src={image.image_url}
                    alt={`${product.name} view ${index + 1}`}
                    className="aspect-[4/5] h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                  />

                  {index === 0 && (
                    <span className="absolute bottom-3 left-3 bg-[#f4f0e9]/90 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#6f675f] backdrop-blur-sm">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-[#e6dfd5]">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#928980]">
                No image
              </span>
            </div>
          )}
        </div>

        {/* PRODUCT PANEL */}
        <aside className="min-w-0">
          <div className="border-b border-[#cec6bc] pb-7">
            {product.category && (
              <p className="text-[11px] uppercase tracking-[0.17em] text-[#8a8178]">
                {product.category.name}
              </p>
            )}

            <p className="mt-3 text-[2.25rem] font-medium leading-[1.02] tracking-[-0.035em] text-[#25211d] md:text-[2.75rem]">
              {product.name}
            </p>

            <p className="mt-4 text-lg text-[#25211d]">
              RM{" "}
              {product.price.toLocaleString("en-MY", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* FINISH */}
          {product.colors.length > 0 && (
            <div className="border-b border-[#cec6bc] py-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[#514b45]">Finish</p>
                <p className="text-sm text-[#756c64]">
                  {selectedColor?.color_name ?? "Standard"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => {
                  const active = selectedColor?.id === color.id;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      title={color.color_name}
                      aria-label={`Select ${color.color_name}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        active
                          ? "border-[#25211d]"
                          : "border-transparent hover:border-[#aaa097]"
                      }`}
                    >
                      <span
                        className="h-6 w-6 rounded-full border border-black/10"
                        style={{ backgroundColor: color.color_hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STOCK + BAG STATUS + QUANTITY + CTA */}
          <div className="border-b border-[#cec6bc] py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#756c64]">Availability</p>
              <p className="text-sm text-[#25211d]">
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : "Out of stock"}
              </p>
            </div>

            {currentCartItem && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-[#756c64]">In your bag</p>

                <p className="text-sm font-medium text-[#25211d]">
                  {currentCartItem.quantity}{" "}
                  {currentCartItem.quantity === 1 ? "piece" : "pieces"}
                </p>
              </div>
            )}

            {product.stock_quantity > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-[#756c64]">Add quantity</p>

                <div className="flex h-10 items-center border border-[#bdb4aa]">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                    disabled={quantity <= 1 || cartLoading}
                    aria-label="Decrease quantity"
                    className="flex h-full w-10 items-center justify-center text-lg font-light text-[#514b45] transition hover:bg-[#e9e2d9] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    −
                  </button>

                  <span className="flex h-full min-w-11 items-center justify-center border-x border-[#bdb4aa] px-3 text-sm text-[#25211d]">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(product.stock_quantity, current + 1),
                      )
                    }
                    disabled={quantity >= product.stock_quantity || cartLoading}
                    aria-label="Increase quantity"
                    className="flex h-full w-10 items-center justify-center text-lg font-light text-[#514b45] transition hover:bg-[#e9e2d9] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void handleAddToCart();
              }}
              disabled={product.stock_quantity <= 0 || cartLoading}
              className="mt-5 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#3a342f] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>
                {product.stock_quantity <= 0
                  ? "Unavailable"
                  : cartLoading
                    ? "Updating bag..."
                    : quantity === 1
                      ? "Add to cart"
                      : `Add ${quantity} to cart`}
              </span>

              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>

            {currentCartItem && (
              <button
                type="button"
                onClick={() => {
                  void handleRemoveFromCart();
                }}
                disabled={cartLoading}
                className="mt-4 flex w-full items-center justify-between border-b border-[#9c9288] pb-2 text-left text-xs uppercase tracking-[0.1em] text-[#6f675f] transition hover:border-[#25211d] hover:text-[#25211d] disabled:cursor-wait disabled:opacity-40"
              >
                <span>
                  Remove {currentCartItem.quantity}{" "}
                  {currentCartItem.quantity === 1 ? "piece" : "pieces"} from bag
                </span>

                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
          </div>

          {/* DELIVERY SUMMARY */}
          <div className="border-b border-[#cec6bc] py-6">
            <div className="flex items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#6f675f]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                aria-hidden="true"
              >
                <path d="M3 7h11v10H3z" />
                <path d="M14 10h3l4 4v3h-7z" />
                <circle cx="7" cy="18" r="1.5" />
                <circle cx="18" cy="18" r="1.5" />
              </svg>

              <div>
                <p className="text-sm font-medium text-[#25211d]">
                  Malaysia delivery within 2–5 working days
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7d746b]">
                  Dispatch timing may vary for low-stock pieces.
                </p>
              </div>
            </div>
          </div>

          {/* SERVICE BENEFITS */}
          <div className="border-b border-[#cec6bc]">
            {[
              {
                label: "Free shipping on Malaysia orders above RM500",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    aria-hidden="true"
                  >
                    <path d="M3 7h11v10H3z" />
                    <path d="M14 10h3l4 4v3h-7z" />
                  </svg>
                ),
              },
              {
                label: "Designed with care by Studio MONTRO",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    aria-hidden="true"
                  >
                    <path d="M12 3v18" />
                    <path d="M5 8c3 0 5-2 7-5" />
                    <path d="M19 8c-3 0-5-2-7-5" />
                    <path d="M5 16c3 0 5 2 7 5" />
                    <path d="M19 16c-3 0-5 2-7 5" />
                  </svg>
                ),
              },
              {
                label: "Join the list and receive 10% off",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                ),
              },
              {
                label: "Personal styling support",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 20c1-4 3.5-6 7-6s6 2 7 6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 border-t border-[#cec6bc] py-4 text-[#514b45]"
              >
                <span className="shrink-0">{item.icon}</span>
                <p className="text-sm">{item.label}</p>
              </div>
            ))}
          </div>

          {/* DESCRIPTION */}
          <div className="border-b border-[#cec6bc]">
            <button
              type="button"
              onClick={() => setDescriptionOpen((current) => !current)}
              className="flex w-full items-center justify-between py-5 text-left"
            >
              <span className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#25211d]">
                Description
              </span>
              <span className="text-lg font-light text-[#6f675f]">
                {descriptionOpen ? "−" : "+"}
              </span>
            </button>

            {descriptionOpen && (
              <div className="pb-6">
                <p className="max-w-[54ch] text-sm leading-7 text-[#6f675f]">
                  {product.description || "No description available."}
                </p>
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="border-b border-[#cec6bc]">
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              className="flex w-full items-center justify-between py-5 text-left"
            >
              <span className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#25211d]">
                Details
              </span>
              <span className="text-lg font-light text-[#6f675f]">
                {detailsOpen ? "−" : "+"}
              </span>
            </button>

            {detailsOpen && (
              <div className="space-y-4 pb-6">
                {product.material && (
                  <div className="grid grid-cols-[110px_1fr] gap-4">
                    <span className="text-sm text-[#8a8178]">Material</span>
                    <span className="text-sm text-[#25211d]">
                      {product.material}
                    </span>
                  </div>
                )}

                {product.dimensions && (
                  <div className="grid grid-cols-[110px_1fr] gap-4">
                    <span className="text-sm text-[#8a8178]">Dimensions</span>
                    <span className="text-sm text-[#25211d]">
                      {product.dimensions}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-[110px_1fr] gap-4">
                  <span className="text-sm text-[#8a8178]">Finish</span>
                  <span className="text-sm text-[#25211d]">
                    {selectedColor?.color_name ?? "Standard"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* DELIVERY & RETURN */}
          <div className="border-b border-[#cec6bc]">
            <button
              type="button"
              onClick={() => setDeliveryOpen((current) => !current)}
              className="flex w-full items-center justify-between py-5 text-left"
            >
              <span className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#25211d]">
                Delivery & Return
              </span>
              <span className="text-lg font-light text-[#6f675f]">
                {deliveryOpen ? "−" : "+"}
              </span>
            </button>

            {deliveryOpen && (
              <div className="space-y-3 pb-6 text-sm leading-7 text-[#6f675f]">
                <p>
                  Delivery within Malaysia typically takes 2–5 working days
                  after dispatch.
                </p>
                <p>
                  Returns are accepted within 14 days for unused items in their
                  original condition and packaging.
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* RECOMMENDED */}
      <section className="border-t border-[#cec6bc] px-8 pb-28 pt-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a8178]">
              You may also like
            </p>

            <p className="mt-2 text-3xl font-medium tracking-[-0.03em] text-[#25211d] md:text-4xl">
              Recommended for you
            </p>
          </div>

          <Link
            href="/products"
            className="hidden text-sm text-[#756c64] transition hover:text-[#25211d] sm:inline-flex sm:items-center sm:gap-2"
          >
            View all
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        {recommendedProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedProducts.map((item) => {
              const itemSaved = savedIds.has(item.id);
              const itemSaveBusy = busyIds.has(item.id);

              return (
                <article key={item.id} className="group">
                  <Link href={`/products/${item.slug}`} className="block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e5dfd6]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void toggleSaved(item.id);
                        }}
                        disabled={itemSaveBusy}
                        aria-label={
                          itemSaved
                            ? `Remove ${item.name} from saved`
                            : `Save ${item.name}`
                        }
                        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f0e9]/90 text-[#25211d] backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-50"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[18px] w-[18px]"
                          fill={itemSaved ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                        </svg>
                      </button>

                      {item.primary_image ? (
                        <>
                          <img
                            src={item.primary_image}
                            alt={item.name}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                              item.secondary_image
                                ? "opacity-100 group-hover:opacity-0"
                                : "transition-transform duration-700 group-hover:scale-[1.025]"
                            }`}
                          />

                          {item.secondary_image && (
                            <img
                              src={item.secondary_image}
                              alt={`${item.name} alternate view`}
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

                  <div className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/products/${item.slug}`}>
                          <p className="text-[15px] font-medium text-[#29241f] transition group-hover:opacity-60">
                            {item.name}
                          </p>
                        </Link>

                        {item.category && (
                          <p className="mt-1 text-xs text-[#8a8178]">
                            {item.category.name}
                          </p>
                        )}
                      </div>

                      <p className="shrink-0 text-sm text-[#29241f]">
                        RM{" "}
                        {item.price.toLocaleString("en-MY", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    {item.colors.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {item.colors.map((color) => (
                          <span
                            key={color.id}
                            title={color.color_name}
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: color.color_hex }}
                          />
                        ))}

                        <span className="ml-1 text-[10px] text-[#938a81]">
                          {item.colors.length}{" "}
                          {item.colors.length === 1 ? "finish" : "finishes"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 border-t border-[#cfc7bd] pt-3">
                    {recommendedQuickAddId === item.id ? (
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[#847b73]">
                            Choose finish
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              setRecommendedQuickAddId(null);
                              setRecommendedColorId(null);
                            }}
                            className="text-lg font-light leading-none text-[#6f675f] transition hover:text-[#25211d]"
                            aria-label="Close quick add"
                          >
                            ×
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.colors.map((color) => {
                            const active = recommendedColorId === color.id;

                            return (
                              <button
                                key={color.id}
                                type="button"
                                onClick={() => setRecommendedColorId(color.id)}
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
                            void confirmRecommendedAdd(item);
                          }}
                          disabled={
                            !recommendedColorId || cartBusyIds.has(item.id)
                          }
                          className="mt-4 flex w-full items-center justify-between bg-[#25211d] px-4 py-3 text-xs uppercase tracking-[0.11em] text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-40"
                        >
                          <span>
                            {cartBusyIds.has(item.id)
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
                          item.stock_quantity <= 0 || cartBusyIds.has(item.id)
                        }
                        onClick={() => {
                          void handleRecommendedAdd(item);
                        }}
                        className="flex w-full items-center justify-between text-left text-xs uppercase tracking-[0.12em] text-[#39332d] transition hover:opacity-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <span>
                          {item.stock_quantity <= 0
                            ? "Unavailable"
                            : cartBusyIds.has(item.id)
                              ? "Adding..."
                              : "Add to cart"}
                        </span>

                        <span className="text-lg font-light leading-none">
                          +
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#756d65]">
            More recommendations coming soon.
          </p>
        )}
      </section>
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
              <path d="M8 12.5l2.5 2.5L16 9.5" />
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
