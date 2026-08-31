"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { adminFetch } from "@/src/lib/adminFetch";

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

type ProductImagesProps = {
  productId: string;
};

import { API_URL } from "@/src/lib/apiConfig";

const STORAGE_BUCKET = "product-images";

export default function ProductImages({ productId }: ProductImagesProps) {
  const [images, setImages] = useState<ProductImage[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);

  const nextSortOrder =
    images.length === 0
      ? 0
      : Math.max(...images.map((image) => image.sort_order)) + 1;

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");

  const [isError, setIsError] = useState(false);

  // ----------------------------
  // Initial load
  // ----------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchImages() {
      try {
        const response = await adminFetch(
          `${API_URL}/products/${productId}/images`,
        );

        if (!response.ok) {
          const data = await response.json();

          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Failed to load images",
          );
        }

        const data: ProductImage[] = await response.json();

        if (!cancelled) {
          setImages(data);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setIsError(true);

          if (error instanceof Error) {
            setMessage(error.message);
          } else {
            setMessage("Something went wrong");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchImages();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // ----------------------------
  // Refresh images
  // ----------------------------
  async function refreshImages() {
    const response = await adminFetch(
      `${API_URL}/products/${productId}/images`,
    );

    if (!response.ok) {
      throw new Error("Failed to refresh images");
    }

    const data: ProductImage[] = await response.json();

    setImages(data);
  }

  // ----------------------------
  // File select
  // ----------------------------
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
  }

  // ----------------------------
  // Upload image
  // ----------------------------
  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setIsError(true);
      setMessage("Please select an image.");
      return;
    }

    setUploading(true);
    setMessage("");
    setIsError(false);

    try {
      // 1. Make safe unique filename
      const extension =
        selectedFile.name.split(".").pop()?.toLowerCase() ?? "jpg";

      const fileName = `${crypto.randomUUID()}.${extension}`;

      const storagePath = `${productId}/${fileName}`;

      // 2. Upload actual file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const imageUrl = publicUrlData.publicUrl;

      // 4. Save URL into product_images table via FastAPI
      const response = await adminFetch(
        `${API_URL}/products/${productId}/images`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            image_url: imageUrl,
            sort_order: nextSortOrder,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to save image",
        );
      }

      setSelectedFile(null);

      await refreshImages();

      setMessage("Image uploaded successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        setMessage("Session expired. Please login again.");

        return;
      }

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    } finally {
      setUploading(false);
    }
  }

  // ----------------------------
  // Delete DB image record
  // ----------------------------
  async function handleDeleteImage(image: ProductImage) {
    const confirmed = window.confirm("Delete this image?");

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      // 1. Extract Storage path from public URL
      const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

      const markerIndex = image.image_url.indexOf(marker);

      if (markerIndex === -1) {
        throw new Error("Could not determine image storage path.");
      }

      const storagePath = decodeURIComponent(
        image.image_url.slice(markerIndex + marker.length),
      );

      // 2. Delete actual file from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (storageError) {
        throw storageError;
      }

      // 3. Delete database record through FastAPI
      const response = await adminFetch(
        `${API_URL}/products/${productId}/images/${image.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to delete image",
        );
      }

      // 4. Refresh UI
      await refreshImages();

      setMessage("Image deleted successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        setMessage("Session expired. Please login again.");

        return;
      }

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  async function updateImageSortOrder(imageId: string, sortOrder: number) {
    const response = await adminFetch(
      `${API_URL}/products/${productId}/images/${imageId}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          sort_order: sortOrder,
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json();

      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Failed to update image order",
      );
    }
  }

  async function handleSetPrimary(selectedImage: ProductImage) {
    setMessage("");
    setIsError(false);

    try {
      // 把目前 primary image 往后放
      const currentPrimary = images.find(
        (image) => image.sort_order === 0 && image.id !== selectedImage.id,
      );

      if (currentPrimary) {
        await updateImageSortOrder(currentPrimary.id, selectedImage.sort_order);
      }

      // Selected image 变 primary
      await updateImageSortOrder(selectedImage.id, 0);

      await refreshImages();

      setMessage("Primary image updated successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  async function handleMoveUp(imageIndex: number) {
    if (imageIndex === 0) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const currentImage = images[imageIndex];

      const previousImage = images[imageIndex - 1];

      const currentOrder = currentImage.sort_order;

      const previousOrder = previousImage.sort_order;

      await updateImageSortOrder(currentImage.id, previousOrder);

      await updateImageSortOrder(previousImage.id, currentOrder);

      await refreshImages();

      setMessage("Image moved up successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  async function handleMoveDown(imageIndex: number) {
    if (imageIndex === images.length - 1) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const currentImage = images[imageIndex];

      const nextImage = images[imageIndex + 1];

      const currentOrder = currentImage.sort_order;

      const nextOrder = nextImage.sort_order;

      await updateImageSortOrder(currentImage.id, nextOrder);

      await updateImageSortOrder(nextImage.id, currentOrder);

      await refreshImages();

      setMessage("Image moved down successfully.");
    } catch (error) {
      console.error(error);

      setIsError(true);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong");
      }
    }
  }

  return (
    <section>
      {/* Current Images */}
      <div className="mb-8">
        {loading && <p className="text-sm text-black/50">Loading images...</p>}

        {!loading && images.length === 0 && (
          <p className="text-sm text-black/50">No images uploaded yet.</p>
        )}

        {!loading && images.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((image, index) => (
              <div key={image.id} className="border border-black/10 p-3">
                <div className="aspect-square overflow-hidden bg-black/5">
                  <img
                    src={image.image_url}
                    alt="Product"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-black/50">
                      Sort: {image.sort_order}
                    </p>

                    {index === 0 && (
                      <span className="text-xs uppercase tracking-wider text-[#50250a]">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image)}
                      disabled={index === 0}
                      className="border border-black/20 px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-30"
                    >
                      Set Primary
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="border border-black/20 px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-30"
                    >
                      Move Up
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === images.length - 1}
                      className="border border-black/20 px-3 py-2 text-xs uppercase tracking-wider disabled:opacity-30"
                    >
                      Move Down
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      className="border border-red-800/30 px-3 py-2 text-xs uppercase tracking-wider text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload */}
      <form
        onSubmit={handleUpload}
        className="space-y-5 border border-black/10 p-5"
      >
        <h3 className="text-base text-[#50250a]">Upload Image</h3>

        <div>
          <label htmlFor="productImage" className="mb-2 block text-sm">
            Image
          </label>

          <input
            id="productImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            required
            className="block w-full text-sm"
          />

          <p className="mt-2 text-xs text-black/50">JPG, PNG or WebP.</p>
        </div>

        <p className="text-xs text-black/50">
          New images are automatically added to the end of the gallery.
        </p>

        {message && (
          <div
            className={`px-4 py-3 text-sm ${
              isError
                ? "bg-red-950/5 text-red-900"
                : "bg-green-950/5 text-green-900"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="w-full bg-[#50250a] px-5 py-3 text-sm uppercase tracking-[0.12em] text-[#f5f1e8] disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
      </form>
    </section>
  );
}
