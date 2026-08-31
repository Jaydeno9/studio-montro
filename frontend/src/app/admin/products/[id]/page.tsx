"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { adminFetch } from "@/src/lib/adminFetch";
import ProductColors from "@/src/app/admin/ProductColors";
import ProductImages from "@/src/app/admin/ProductImages";
import ProductInventory from "@/src/app/admin/ProductInventory";
import { useAdminUnsavedChanges } from "@/src/context/AdminUnsavedChangesProvider";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductStatus = "active" | "inactive";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  material: string | null;
  dimensions: string | null;
  status: ProductStatus;
  category: Category | null;
};

type EditableProductSnapshot = {
  name: string;
  description: string;
  price: string;
  material: string;
  dimensions: string;
  categoryId: string;
  status: ProductStatus;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function ManageProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [material, setMaterial] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");

  const [initialSnapshot, setInitialSnapshot] =
    useState<EditableProductSnapshot | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadProduct() {
        try {
          const [productResponse, categoriesResponse] = await Promise.all([
            adminFetch(`${API_URL}/products/${productId}`),
            fetch(`${API_URL}/categories`),
          ]);

          if (!productResponse.ok) {
            const errorData = await productResponse.json().catch(() => null);

            throw new Error(errorData?.detail || "Failed to load product");
          }

          if (!categoriesResponse.ok) {
            throw new Error("Failed to load categories");
          }

          const product: Product = await productResponse.json();

          const categoryData: Category[] = await categoriesResponse.json();

          if (cancelled) {
            return;
          }

          const snapshot: EditableProductSnapshot = {
            name: product.name,
            description: product.description ?? "",
            price: String(product.price),
            material: product.material ?? "",
            dimensions: product.dimensions ?? "",
            categoryId: product.category?.id ?? "",
            status: product.status,
          };

          setCategories(categoryData);

          setName(snapshot.name);
          setSlug(product.slug);
          setDescription(snapshot.description);
          setPrice(snapshot.price);
          setStockQuantity(String(product.stock_quantity));
          setMaterial(snapshot.material);
          setDimensions(snapshot.dimensions);
          setCategoryId(snapshot.categoryId);
          setStatus(snapshot.status);

          setInitialSnapshot(snapshot);
        } catch (error) {
          console.error(error);

          if (error instanceof Error && error.message === "AUTH_REQUIRED") {
            router.push("/admin/login");
            return;
          }

          if (!cancelled) {
            setIsError(true);
            setMessage(
              error instanceof Error ? error.message : "Something went wrong",
            );
          }
        } finally {
          if (!cancelled) {
            setPageLoading(false);
          }
        }
      }

      if (productId) {
        void loadProduct();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productId, router]);

  const currentSnapshot = useMemo<EditableProductSnapshot>(
    () => ({
      name,
      description,
      price,
      material,
      dimensions,
      categoryId,
      status,
    }),
    [categoryId, description, dimensions, material, name, price, status],
  );

  const isDirty = useMemo(() => {
    if (!initialSnapshot) {
      return false;
    }

    return (
      initialSnapshot.name !== currentSnapshot.name ||
      initialSnapshot.description !== currentSnapshot.description ||
      initialSnapshot.price !== currentSnapshot.price ||
      initialSnapshot.material !== currentSnapshot.material ||
      initialSnapshot.dimensions !== currentSnapshot.dimensions ||
      initialSnapshot.categoryId !== currentSnapshot.categoryId ||
      initialSnapshot.status !== currentSnapshot.status
    );
  }, [currentSnapshot, initialSnapshot]);

  useAdminUnsavedChanges(isDirty && !saving);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const priceNumber = Number(price);
  const stockNumber = Number(stockQuantity);

  const canSave =
    name.trim().length > 0 &&
    price.trim().length > 0 &&
    Number.isFinite(priceNumber) &&
    priceNumber >= 0 &&
    isDirty &&
    !saving;

  function resetChanges() {
    if (!initialSnapshot) {
      return;
    }

    setName(initialSnapshot.name);
    setDescription(initialSnapshot.description);
    setPrice(initialSnapshot.price);
    setMaterial(initialSnapshot.material);
    setDimensions(initialSnapshot.dimensions);
    setCategoryId(initialSnapshot.categoryId);
    setStatus(initialSnapshot.status);

    setMessage("");
    setIsError(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        material: material.trim() || null,
        dimensions: dimensions.trim() || null,
        category_id: categoryId || null,
        status,
      };

      const response = await adminFetch(`${API_URL}/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = "Failed to update product";

        if (typeof data?.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMessage = data.detail
            .map((item: { msg?: string }) => item.msg ?? "Validation error")
            .join(", ");
        }

        throw new Error(errorMessage);
      }

      const savedSnapshot: EditableProductSnapshot = {
        name: name.trim(),
        description: description.trim(),
        price: String(Number(price)),
        material: material.trim(),
        dimensions: dimensions.trim(),
        categoryId,
        status,
      };

      setName(savedSnapshot.name);
      setDescription(savedSnapshot.description);
      setPrice(savedSnapshot.price);
      setMaterial(savedSnapshot.material);
      setDimensions(savedSnapshot.dimensions);
      setInitialSnapshot(savedSnapshot);

      setMessage("Product details saved.");
      setIsError(false);
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        router.push("/admin/login");
        return;
      }

      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <p className="text-sm text-[#756d65]">Loading product...</p>
      </main>
    );
  }

  if (!initialSnapshot) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
        <Link
          href="/admin/products"
          className="text-sm underline underline-offset-4"
        >
          ← Products
        </Link>

        <div className="mt-8 border border-[#ad7d74] bg-[#f2e7e3] px-5 py-4 text-sm text-[#713f38]">
          {message || "Product could not be loaded."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-32 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-[#6f675f] transition hover:text-[#25211d]"
        >
          <span>←</span>
          Products
        </Link>

        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              Product management
            </p>

            <p className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              {name}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#756d65]">
              <RectStatus>{status}</RectStatus>
              <span>{slug}</span>
              {isDirty && (
                <>
                  <span className="text-[#aaa198]">·</span>
                  <span className="font-medium text-[#713f38]">
                    Unsaved changes
                  </span>
                </>
              )}
            </div>
          </div>

          <a
            href={`/products/${slug}`}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 border border-[#8f867d] px-4 py-3 text-sm transition hover:bg-[#ebe4db]"
          >
            View storefront
            <span>↗</span>
          </a>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-10 pt-10 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-10">
          <FormSection
            number="01"
            title="Basic information"
            description="Edit the customer-facing identity and description."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Product name" required htmlFor="name">
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="Slug"
                htmlFor="slug"
                hint="Slug editing remains disabled to avoid breaking existing product URLs."
              >
                <input
                  id="slug"
                  value={slug}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-[#ebe5dc] text-[#8b827a]`}
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className={`${inputClass} h-auto resize-none py-3`}
              />
            </Field>
          </FormSection>

          <FormSection
            number="02"
            title="Pricing"
            description="Update the customer-facing selling price."
          >
            <Field
              label="Price"
              required
              htmlFor="price"
              hint="Malaysian Ringgit"
            >
              <div className="flex border border-[#b8aea4] bg-[#f8f4ee]">
                <span className="flex items-center border-r border-[#cfc7bd] px-4 text-sm text-[#756d65]">
                  RM
                </span>

                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                  className="h-12 w-full bg-transparent px-4 text-sm outline-none"
                />
              </div>
            </Field>
          </FormSection>

          <section className="border-t border-[#cec6bc] pt-6">
            <div className="mb-7">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                03
              </p>
              <p className="mt-2 text-lg font-medium">Inventory</p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[#817870]">
                Adjust stock deliberately instead of editing the raw quantity
                inside the general product form.
              </p>
            </div>

            <ProductInventory
              productId={productId}
              currentStock={stockNumber}
              onStockChanged={(newStock) => setStockQuantity(String(newStock))}
            />
          </section>

          <FormSection
            number="04"
            title="Product details"
            description="Specifications shown to customers."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Material" htmlFor="material">
                <input
                  id="material"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Dimensions" htmlFor="dimensions">
                <input
                  id="dimensions"
                  value={dimensions}
                  onChange={(event) => setDimensions(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            number="05"
            title="Organisation"
            description="Control category placement and storefront visibility."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <select
                  id="category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">No category</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Status"
                htmlFor="status"
                hint={
                  status === "active"
                    ? "Visible on the storefront"
                    : "Hidden from the storefront"
                }
              >
                <select
                  id="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ProductStatus)
                  }
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </FormSection>

          {message && (
            <div
              className={`border px-5 py-4 text-sm leading-6 ${
                isError
                  ? "border-[#ad7d74] bg-[#f2e7e3] text-[#713f38]"
                  : "border-[#a9b09f] bg-[#edf0e8] text-[#485342]"
              }`}
            >
              {message}
            </div>
          )}

          <section className="border-t border-[#cec6bc] pt-10">
            <div className="mb-7">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                06
              </p>
              <p className="mt-2 text-lg font-medium">Colours & finishes</p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[#817870]">
                Add or remove the finishes available to customers.
              </p>
            </div>

            <ProductColors productId={productId} />
          </section>

          <section className="border-t border-[#cec6bc] pt-10">
            <div className="mb-7">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
                07
              </p>
              <p className="mt-2 text-lg font-medium">Product images</p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[#817870]">
                Add, remove, reorder and choose the primary image.
              </p>
            </div>

            <ProductImages productId={productId} />
          </section>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
                  Product summary
                </p>

                {isDirty && (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-[#713f38]">
                    Unsaved
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-5 border-b border-[#cec6bc] py-6">
              <SummaryRow
                label="Category"
                value={selectedCategory?.name ?? "No category"}
              />

              <SummaryRow
                label="Price"
                value={
                  Number.isFinite(priceNumber)
                    ? `RM ${priceNumber.toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"
                }
              />

              <SummaryRow
                label="Stock"
                value={
                  Number.isFinite(stockNumber) ? `${stockNumber} units` : "—"
                }
              />

              <SummaryRow label="Status" value={status} />

              <SummaryRow label="Slug" value={slug} preserveCase />
            </div>

            <div className="py-6">
              <button
                type="submit"
                disabled={!canSave}
                className="flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span>
                  {saving
                    ? "Saving changes..."
                    : isDirty
                      ? "Save changes"
                      : "All changes saved"}
                </span>

                <span>{isDirty ? "→" : "✓"}</span>
              </button>

              {isDirty && (
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={saving}
                  className="mt-3 w-full border border-[#8f867d] px-5 py-3 text-sm text-[#5f5750] transition hover:bg-[#ebe4db] disabled:opacity-40"
                >
                  Discard form changes
                </button>
              )}

              <p className="mt-4 text-xs leading-5 text-[#91877e]">
                Finishes and images save independently when you add, reorder or
                delete them.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}

const inputClass =
  "h-12 w-full border border-[#b8aea4] bg-[#f8f4ee] px-4 text-sm outline-none transition focus:border-[#5f5750]";

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#cec6bc] pt-6">
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#91877e]">
            {number}
          </p>

          <p className="mt-2 text-lg font-medium">{title}</p>

          <p className="mt-2 text-xs leading-5 text-[#817870]">{description}</p>
        </div>

        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-[#8a4b43]">*</span>}
      </label>

      {children}

      {hint && <p className="mt-2 text-xs leading-5 text-[#91877e]">{hint}</p>}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  preserveCase = false,
}: {
  label: string;
  value: string;
  preserveCase?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <p className="text-xs text-[#8a8178]">{label}</p>

      <p
        className={`max-w-[220px] break-words text-right text-sm font-medium ${
          preserveCase ? "" : "capitalize"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RectStatus({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border border-[#8f867d] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-[#4d4640]">
      {children}
    </span>
  );
}
