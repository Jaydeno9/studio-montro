"use client";

import { useCallback, useEffect, useState } from "react";
import { FormField } from "@/src/components/form/FormField";
import { FormMessage } from "@/src/components/form/FormMessage";
import { TextareaField } from "@/src/components/form/TextareaField";
import { TextInput } from "@/src/components/form/TextInput";
import { adminFetch } from "@/src/lib/adminFetch";

type AdminCategory = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string | null;
  product_count: number;
};

type FieldErrors = {
  name?: string;
  slug?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch(`${API_URL}/admin/categories`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to load categories.");
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "AUTH_REQUIRED" ||
          err.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to load categories.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function resetForm() {
    setFormOpen(false);
    setEditingCategory(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setImageUrl("");
    setFieldErrors({});
    setFormError("");
  }

  function startCreate() {
    resetForm();
    setFeedback("");
    setFormOpen(true);
  }

  function startEdit(category: AdminCategory) {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug ?? "");
    setSlugTouched(true);
    setDescription(category.description ?? "");
    setImageUrl(category.image_url ?? "");
    setFieldErrors({});
    setFormError("");
    setFeedback("");
    setFormOpen(true);

    window.requestAnimationFrame(() => {
      document.getElementById("category-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleNameChange(value: string) {
    setName(value);
    setFieldErrors((current) => ({ ...current, name: undefined }));

    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(generateSlug(value));
    setFieldErrors((current) => ({ ...current, slug: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!name.trim()) {
      nextErrors.name = "Enter a category name.";
    }

    setFieldErrors(nextErrors);
    setFormError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);

      const response = await adminFetch(
        editingCategory
          ? `${API_URL}/admin/categories/${editingCategory.id}`
          : `${API_URL}/admin/categories`,
        {
          method: editingCategory ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || null,
            description: description.trim() || null,
            image_url: imageUrl.trim() || null,
          }),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = data?.detail ?? "Unable to save category.";

        if (typeof detail === "string" && detail.includes("name")) {
          setFieldErrors({ name: detail });
        } else if (typeof detail === "string" && detail.includes("slug")) {
          setFieldErrors({ slug: detail });
        } else {
          setFormError(detail);
        }
        return;
      }

      const savedCategory = data as AdminCategory;
      setCategories((current) =>
        (editingCategory
          ? current.map((category) =>
              category.id === savedCategory.id ? savedCategory : category,
            )
          : [...current, savedCategory]
        ).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setFeedback(
        editingCategory ? "Category updated." : "Category created.",
      );
      resetForm();
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "AUTH_REQUIRED" ||
          err.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setFormError("Unable to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: AdminCategory) {
    setFeedback("");
    setError("");

    if (category.product_count > 0) {
      setError(
        `This category is used by ${category.product_count} ${
          category.product_count === 1 ? "product" : "products"
        }. Reassign those products before deleting it.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete “${category.name}”? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(category.id);
      const response = await adminFetch(
        `${API_URL}/admin/categories/${category.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to delete category.");
      }

      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
      if (editingCategory?.id === category.id) {
        resetForm();
      }
      setFeedback("Category deleted.");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "AUTH_REQUIRED" ||
          err.message === "ADMIN_ACCESS_REVOKED")
      ) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to delete category.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-5 pb-28 pt-24 text-[#25211d] md:px-8 lg:pt-10">
      <header className="border-b border-[#cec6bc] pb-8">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
          Categories
        </p>

        <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-medium tracking-[-0.04em] md:text-6xl">
              Categories
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#756d65]">
              Organize products into clear storefront groups.
            </p>
          </div>

          <button
            type="button"
            onClick={formOpen && !editingCategory ? resetForm : startCreate}
            className="inline-flex h-12 w-fit items-center border border-[#25211d] bg-[#25211d] px-5 text-sm text-[#f4f0e9] transition hover:bg-[#39332d]"
          >
            {formOpen && !editingCategory ? "Close" : "+ Add category"}
          </button>
        </div>
      </header>

      {formOpen && (
        <section
          id="category-form"
          aria-labelledby="category-form-title"
          className="scroll-mt-6 border-b border-[#cec6bc] py-8"
        >
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              {editingCategory ? "Edit category" : "New category"}
            </p>
            <h2
              id="category-form-title"
              className="mt-2 text-2xl font-medium tracking-[-0.025em]"
            >
              {editingCategory
                ? `Edit ${editingCategory.name}`
                : "Add category"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-7">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Name"
                  error={fieldErrors.name}
                  required
                >
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      value={name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      autoComplete="off"
                      disabled={submitting}
                    />
                  )}
                </FormField>

                <FormField
                  label="Slug"
                  hint="Generated from the name unless you enter a custom slug."
                  error={fieldErrors.slug}
                >
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      value={slug}
                      onChange={(event) => handleSlugChange(event.target.value)}
                      placeholder="category-slug"
                      autoComplete="off"
                      disabled={submitting}
                    />
                  )}
                </FormField>

                <FormField label="Description" className="md:col-span-2">
                  {(controlProps) => (
                    <TextareaField
                      {...controlProps}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={submitting}
                    />
                  )}
                </FormField>

                <FormField label="Image URL" className="md:col-span-2">
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      type="url"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="https://"
                      autoComplete="url"
                      disabled={submitting}
                    />
                  )}
                </FormField>
              </div>

              {formError && <FormMessage>{formError}</FormMessage>}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 bg-[#25211d] px-5 text-xs uppercase tracking-[0.1em] text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingCategory
                      ? "Save changes"
                      : "Create category"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="h-11 border border-[#8f867d] px-5 text-xs uppercase tracking-[0.1em] text-[#625a53] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {feedback && (
        <FormMessage tone="success" className="mt-6">
          {feedback}
        </FormMessage>
      )}

      {error && (
        <div className="mt-6 max-w-2xl bg-[#efe0dc] p-5 text-[#6d4039]">
          <p className="text-sm leading-6">{error}</p>
          {categories.length === 0 && (
            <button
              type="button"
              onClick={() => void loadCategories()}
              className="mt-4 border border-[#765149] px-4 py-2.5 text-xs uppercase tracking-[0.1em]"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <p className="text-sm text-[#756d65]">Loading categories...</p>
        </div>
      ) : !error && categories.length === 0 ? (
        <div className="py-20">
          <p className="text-lg font-medium">No categories yet</p>
          <p className="mt-2 text-sm text-[#817870]">
            Add a category to begin organizing the storefront.
          </p>
        </div>
      ) : categories.length > 0 ? (
        <section aria-label="Category list">
          <div className="hidden xl:block">
            <div className="grid grid-cols-[minmax(190px,0.8fr)_100px_minmax(260px,1.2fr)_140px_150px] gap-5 border-b border-[#8f867d] py-4 text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
              <span>Category</span>
              <span>Products</span>
              <span>Description</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>

            {categories.map((category) => (
              <div
                key={category.id}
                className="grid grid-cols-[minmax(190px,0.8fr)_100px_minmax(260px,1.2fr)_140px_150px] gap-5 border-b border-[#ddd5cc] py-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">
                    {category.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#817870]">
                    {category.slug || "No slug"}
                  </p>
                </div>
                <p className="text-sm">{category.product_count}</p>
                <p className="line-clamp-2 text-sm leading-6 text-[#756d65]">
                  {category.description || "—"}
                </p>
                <p className="text-sm text-[#625a53]">
                  {formatDate(category.created_at)}
                </p>
                <CategoryActions
                  category={category}
                  deleting={deletingId === category.id}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#cec6bc] xl:hidden">
            {categories.map((category) => (
              <article key={category.id} className="py-7">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-medium">
                      {category.name}
                    </h2>
                    <p className="mt-1 truncate text-xs text-[#817870]">
                      {category.slug || "No slug"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">
                    {category.product_count} {category.product_count === 1 ? "product" : "products"}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#756d65]">
                  {category.description || "No description."}
                </p>

                <div className="mt-5 flex items-center justify-between gap-5 border-t border-[#ddd5cc] pt-4">
                  <p className="text-xs text-[#91877e]">
                    Created {formatDate(category.created_at)}
                  </p>
                  <CategoryActions
                    category={category}
                    deleting={deletingId === category.id}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function CategoryActions({
  category,
  deleting,
  onEdit,
  onDelete,
}: {
  category: AdminCategory;
  deleting: boolean;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void | Promise<void>;
}) {
  return (
    <div className="flex items-start justify-end gap-4 text-sm">
      <button
        type="button"
        onClick={() => onEdit(category)}
        className="border-b border-[#8f867d] pb-0.5 text-[#514b45]"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => void onDelete(category)}
        disabled={deleting}
        className="text-[#8b3a34] disabled:cursor-wait disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
