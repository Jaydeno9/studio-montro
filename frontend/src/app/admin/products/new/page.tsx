"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { adminFetch } from "@/src/lib/adminFetch";
import { supabase } from "@/src/lib/supabase";
import { useAdminUnsavedChanges } from "@/src/context/AdminUnsavedChangesProvider";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductStatus = "active" | "inactive";

type CreatedProduct = {
  id: string;
  name: string;
  slug: string;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type PendingColor = {
  id: string;
  color_name: string;
  color_hex: string;
};

import { API_URL } from "@/src/lib/apiConfig";

const STORAGE_BUCKET = "product-images";
const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE_MB = 10;

export default function CreateProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [material, setMaterial] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingColors, setPendingColors] = useState<PendingColor[]>([]);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<CreatedProduct | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadCategories() {
        try {
          const response = await fetch(`${API_URL}/categories`);

          if (!response.ok) {
            throw new Error("Failed to load categories.");
          }

          const data: Category[] = await response.json();

          if (!cancelled) {
            setCategories(data);
          }
        } catch (error) {
          console.error(error);

          if (!cancelled) {
            setIsError(true);
            setMessage("Could not load categories.");
          }
        } finally {
          if (!cancelled) {
            setCategoriesLoading(false);
          }
        }
      }

      void loadCategories();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, [pendingImages]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const priceNumber = Number(price);
  const stockNumber = Number(stockQuantity);

  const hasFormChanges =
    name.trim().length > 0 ||
    slug.trim().length > 0 ||
    description.trim().length > 0 ||
    price.trim().length > 0 ||
    stockQuantity.trim().length > 0 ||
    material.trim().length > 0 ||
    dimensions.trim().length > 0 ||
    categoryId.length > 0 ||
    status !== "active" ||
    pendingImages.length > 0 ||
    pendingColors.length > 0 ||
    colorName.trim().length > 0;

  const isDirty = hasFormChanges && !submitting && createdProduct === null;

  useAdminUnsavedChanges(isDirty);

  const canSubmit =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    price.trim().length > 0 &&
    Number.isFinite(priceNumber) &&
    priceNumber >= 0 &&
    stockQuantity.trim().length > 0 &&
    Number.isInteger(stockNumber) &&
    stockNumber >= 0 &&
    !submitting &&
    !createdProduct;

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(generateSlug(value));
  }

  function resetForm() {
    pendingImages.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });

    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setPrice("");
    setStockQuantity("");
    setMaterial("");
    setDimensions("");
    setCategoryId("");
    setStatus("active");
    setPendingImages([]);
    setPendingColors([]);
    setColorName("");
    setColorHex("#000000");
    setMessage("");
    setIsError(false);
    setCreatedProduct(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setMessage("");
    setIsError(false);

    const availableSlots = MAX_IMAGES - pendingImages.length;

    if (availableSlots <= 0) {
      setIsError(true);
      setMessage(`You can add up to ${MAX_IMAGES} images.`);
      event.target.value = "";
      return;
    }

    const accepted: PendingImage[] = [];
    const errors: string[] = [];

    for (const file of files.slice(0, availableSlots)) {
      const validType = ["image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      );

      if (!validType) {
        errors.push(`${file.name}: use JPG, PNG or WebP.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name}: maximum ${MAX_IMAGE_SIZE_MB}MB.`);
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (files.length > availableSlots) {
      errors.push(
        `Only ${availableSlots} more image${
          availableSlots === 1 ? "" : "s"
        } can be added.`,
      );
    }

    if (accepted.length > 0) {
      setPendingImages((current) => [...current, ...accepted]);
    }

    if (errors.length > 0) {
      setIsError(true);
      setMessage(errors.join(" "));
    }

    event.target.value = "";
  }

  function removePendingImage(imageId: string) {
    setPendingImages((current) => {
      const image = current.find((item) => item.id === imageId);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return current.filter((item) => item.id !== imageId);
    });
  }

  function addPendingColor() {
    const trimmedName = colorName.trim();

    if (!trimmedName) {
      setIsError(true);
      setMessage("Enter a finish name before adding it.");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
      setIsError(true);
      setMessage("Enter a valid 6-digit hex colour.");
      return;
    }

    const duplicate = pendingColors.some(
      (color) => color.color_name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicate) {
      setIsError(true);
      setMessage("That finish has already been added.");
      return;
    }

    setPendingColors((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        color_name: trimmedName,
        color_hex: colorHex,
      },
    ]);

    setColorName("");
    setColorHex("#000000");
    setMessage("");
    setIsError(false);
  }

  function removePendingColor(colorId: string) {
    setPendingColors((current) =>
      current.filter((color) => color.id !== colorId),
    );
  }

  async function createInitialColors(productId: string) {
    for (const color of pendingColors) {
      const response = await adminFetch(
        `${API_URL}/products/${productId}/colors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            color_name: color.color_name,
            color_hex: color.color_hex,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? `Product was created, but a finish could not be saved: ${data.detail}`
            : "Product was created, but a finish could not be saved.",
        );
      }
    }
  }

  async function uploadInitialImages(productId: string) {
    for (let index = 0; index < pendingImages.length; index += 1) {
      const pendingImage = pendingImages[index];
      const extension =
        pendingImage.file.name.split(".").pop()?.toLowerCase() ?? "jpg";

      const fileName = `${crypto.randomUUID()}.${extension}`;
      const storagePath = `${productId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, pendingImage.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Product was created, but image ${
            index + 1
          } could not be uploaded: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const response = await adminFetch(
        `${API_URL}/products/${productId}/images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: publicUrlData.publicUrl,
            sort_order: index,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

        throw new Error(
          typeof data?.detail === "string"
            ? `Product was created, but an image record failed: ${data.detail}`
            : "Product was created, but an image record could not be saved.",
        );
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const productData = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        price: Number(price),
        stock_quantity: Number(stockQuantity),
        material: material.trim() || null,
        dimensions: dimensions.trim() || null,
        status,
        category_id: categoryId || null,
      };

      const response = await adminFetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = "Failed to create product.";

        if (typeof data?.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMessage = data.detail
            .map((item: { msg?: string }) => item.msg ?? "Validation error")
            .join(", ");
        }

        throw new Error(errorMessage);
      }

      const created = data as CreatedProduct;

      setCreatedProduct(created);

      try {
        if (pendingColors.length > 0) {
          await createInitialColors(created.id);
        }

        if (pendingImages.length > 0) {
          await uploadInitialImages(created.id);
        }

        const parts = [
          `${pendingColors.length} finish${
            pendingColors.length === 1 ? "" : "es"
          }`,
          `${pendingImages.length} image${
            pendingImages.length === 1 ? "" : "s"
          }`,
        ];

        setMessage(`Product created with ${parts.join(" and ")}.`);
      } catch (assetError) {
        setIsError(true);
        setMessage(
          assetError instanceof Error
            ? assetError.message
            : "Product was created, but some optional product data could not be saved.",
        );
      }
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        router.push("/admin/login");
        return;
      }

      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <div className="border-b border-[#cec6bc] pb-8">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-[#6f675f] transition hover:text-[#25211d]"
        >
          <span>←</span>
          Products
        </Link>

        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              Catalogue
            </p>

            <p className="mt-3 text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              Add product
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746c64]">
              Create the full catalogue record, including finishes and optional
              initial images. Reordering and deeper media management stay in the
              product detail page.
            </p>
          </div>

          <div className="border border-[#cfc7bd] bg-[#f8f4ee] px-4 py-3 text-xs leading-5 text-[#746c64]">
            Required fields are marked with *
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-10 pt-10 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-10">
          <FormSection
            number="01"
            title="Basic information"
            description="The customer-facing identity of this piece."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Product name" required htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Orbit Vase"
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="Slug"
                required
                htmlFor="slug"
                hint={
                  slugTouched
                    ? "Custom slug"
                    : "Generated automatically from the product name"
                }
              >
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="orbit-vase"
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="Description"
              htmlFor="description"
              hint="Keep this concise and editorial. It appears on the product page."
            >
              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                placeholder="A sculptural ceramic vase with a quiet, architectural profile..."
                className={`${inputClass} h-auto resize-none py-3`}
              />
            </Field>
          </FormSection>

          <FormSection
            number="02"
            title="Pricing & inventory"
            description="Set the selling price and the stock available to reserve."
          >
            <div className="grid gap-5 md:grid-cols-2">
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
                    placeholder="189.00"
                    required
                    className="h-12 w-full bg-transparent px-4 text-sm outline-none"
                  />
                </div>
              </Field>

              <Field
                label="Initial stock"
                required
                htmlFor="stock"
                hint="Product-level inventory"
              >
                <input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="12"
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="border border-[#d8d0c7] bg-[#f8f4ee] p-4">
              <p className="text-[10px] uppercase tracking-[0.13em] text-[#8a8178]">
                Inventory note
              </p>

              <p className="mt-2 text-xs leading-5 text-[#756d65]">
                Stock is tracked at product level, not per finish. Confirm this
                number before making the product active.
              </p>
            </div>
          </FormSection>

          <FormSection
            number="03"
            title="Product details"
            description="Useful specifications for the customer and fulfilment team."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Material" htmlFor="material">
                <input
                  id="material"
                  type="text"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Stoneware ceramic"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Dimensions"
                htmlFor="dimensions"
                hint="Example: W 18 × D 18 × H 32 cm"
              >
                <input
                  id="dimensions"
                  type="text"
                  value={dimensions}
                  onChange={(event) => setDimensions(event.target.value)}
                  placeholder="W 18 × D 18 × H 32 cm"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            number="04"
            title="Organisation"
            description="Control where the piece belongs and whether it is visible."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <select
                  id="category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categoriesLoading}
                  className={`${inputClass} disabled:opacity-50`}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "No category"}
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Status"
                required
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

          <FormSection
            number="05"
            title="Colours & finishes"
            description="Add the finishes available for this product. You can still edit them later."
          >
            <div className="border border-[#d8d0c7] bg-[#f8f4ee] p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_auto]">
                <Field label="Finish name" htmlFor="colorName">
                  <input
                    id="colorName"
                    type="text"
                    value={colorName}
                    onChange={(event) => setColorName(event.target.value)}
                    placeholder="Natural Oak"
                    className={inputClass}
                  />
                </Field>

                <Field label="Colour" htmlFor="colorHex">
                  <div className="flex h-12 border border-[#b8aea4] bg-[#f4f0e9]">
                    <input
                      id="colorHex"
                      type="color"
                      value={colorHex}
                      onChange={(event) => setColorHex(event.target.value)}
                      className="h-full w-14 cursor-pointer border-0 bg-transparent p-1"
                    />

                    <input
                      value={colorHex}
                      onChange={(event) => setColorHex(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent px-2 text-xs uppercase outline-none"
                    />
                  </div>
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addPendingColor}
                    className="h-12 border border-[#8f867d] px-5 text-xs uppercase tracking-[0.08em] transition hover:bg-[#25211d] hover:text-[#f4f0e9]"
                  >
                    Add finish
                  </button>
                </div>
              </div>

              {pendingColors.length === 0 ? (
                <p className="mt-5 border-t border-[#ddd5cc] pt-4 text-xs text-[#91877e]">
                  No finishes added. This is optional.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-[#ddd5cc] border-t border-[#ddd5cc]">
                  {pendingColors.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-7 w-7 shrink-0 rounded-full border border-[#b8aea4]"
                          style={{
                            backgroundColor: color.color_hex,
                          }}
                        />

                        <div>
                          <p className="text-sm font-medium">
                            {color.color_name}
                          </p>
                          <p className="mt-1 text-xs uppercase text-[#91877e]">
                            {color.color_hex}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removePendingColor(color.id)}
                        className="text-xs text-[#713f38] underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection
            number="06"
            title="Images"
            description="Optional initial gallery images. The first image becomes the primary image."
          >
            <div className="border border-[#d8d0c7] bg-[#f8f4ee] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Initial product images</p>

                  <p className="mt-1 text-xs leading-5 text-[#817870]">
                    JPG, PNG or WebP · up to {MAX_IMAGE_SIZE_MB}MB each ·
                    maximum {MAX_IMAGES}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pendingImages.length >= MAX_IMAGES}
                  className="w-fit border border-[#8f867d] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#4d4640] transition hover:bg-[#ebe4db] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add images
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImagesSelected}
                className="hidden"
              />

              {pendingImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 flex min-h-40 w-full items-center justify-center border border-dashed border-[#aaa198] px-5 text-center"
                >
                  <span>
                    <span className="block text-sm font-medium">
                      No images selected
                    </span>
                    <span className="mt-2 block text-xs text-[#817870]">
                      Click to choose optional product images.
                    </span>
                  </span>
                </button>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {pendingImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="border border-[#d4ccc3] bg-[#f4f0e9] p-2"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#e8e1d8]">
                        <img
                          src={image.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute left-2 top-2 border border-[#f4f0e9]/60 bg-[#25211d] px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[#f4f0e9]">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] text-[#756d65]">
                          {image.file.name}
                        </p>

                        <button
                          type="button"
                          onClick={() => removePendingImage(image.id)}
                          className="shrink-0 text-xs text-[#713f38] underline underline-offset-4"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-[#91877e]">
                Image order here becomes the initial gallery order. Reordering,
                replacing, deleting and setting another primary image can be
                done after creation.
              </p>
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
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
                Product summary
              </p>
            </div>

            <div className="space-y-5 border-b border-[#cec6bc] py-6">
              <SummaryRow
                label="Name"
                value={name.trim() || "Untitled product"}
              />
              <SummaryRow
                label="Category"
                value={selectedCategory?.name ?? "No category"}
              />
              <SummaryRow
                label="Price"
                value={
                  price.trim()
                    ? `RM ${Number(price).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"
                }
              />
              <SummaryRow
                label="Stock"
                value={stockQuantity.trim() ? `${stockQuantity} units` : "—"}
              />
              <SummaryRow label="Status" value={status} />
              <SummaryRow
                label="Finishes"
                value={`${pendingColors.length} added`}
              />
              <SummaryRow
                label="Images"
                value={`${pendingImages.length} selected`}
              />
            </div>

            {!createdProduct ? (
              <div className="py-6">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <span>
                    {submitting
                      ? pendingImages.length > 0 || pendingColors.length > 0
                        ? "Creating product..."
                        : "Creating product..."
                      : "Create product"}
                  </span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="mt-3 w-full py-3 text-xs text-[#756d65] underline decoration-[#aaa198] underline-offset-4 disabled:opacity-40"
                >
                  Clear form
                </button>
              </div>
            ) : (
              <div className="py-6">
                <div className="border border-[#9fa894] px-5 py-4">
                  <p className="text-sm font-medium text-[#485342]">
                    Product created
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#756d65]">
                    Continue to the product detail page to manage finishes,
                    reorder images and review the listing.
                  </p>
                </div>

                <Link
                  href={`/admin/products/${createdProduct.id}`}
                  className="mt-4 flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm text-[#f4f0e9]"
                >
                  <span>Continue to product detail</span>
                  <span>→</span>
                </Link>

                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-3 w-full border border-[#8f867d] px-5 py-4 text-sm"
                >
                  Create another product
                </button>
              </div>
            )}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <p className="text-xs text-[#8a8178]">{label}</p>
      <p className="max-w-[220px] text-right text-sm font-medium capitalize">
        {value}
      </p>
    </div>
  );
}
