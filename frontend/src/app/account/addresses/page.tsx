"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { authFetch } from "@/src/lib/authFetch";
import { FormField } from "@/src/components/form/FormField";
import { TextInput } from "@/src/components/form/TextInput";

type Address = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
  created_at?: string;
};

type AddressFormState = {
  label: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  is_default: boolean;
};

import { API_URL } from "@/src/lib/apiConfig";

const emptyForm: AddressFormState = {
  label: "",
  recipient_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "Malaysia",
  is_default: false,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [pageError, setPageError] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadAddresses() {
        try {
          const response = await authFetch(`${API_URL}/addresses`);

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.detail ?? "Unable to load your addresses.");
          }

          if (!cancelled) {
            setAddresses(Array.isArray(data) ? (data as Address[]) : []);
          }
        } catch (error) {
          if (!cancelled) {
            setPageError(true);
            setPageMessage(
              error instanceof Error
                ? error.message
                : "Unable to load your addresses.",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void loadAddresses();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  function openCreate() {
    setEditingAddress(null);
    setForm({
      ...emptyForm,
      is_default: addresses.length === 0,
    });
    setPageMessage("");
    setPageError(false);
    setEditorOpen(true);
  }

  function openEdit(address: Address) {
    setEditingAddress(address);
    setForm({
      label: address.label ?? "",
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postcode: address.postcode,
      country: address.country || "Malaysia",
      is_default: address.is_default,
    });
    setPageMessage("");
    setPageError(false);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingAddress(null);
    setForm(emptyForm);
  }

  function updateField(key: keyof AddressFormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function reloadAddresses() {
    const response = await authFetch(`${API_URL}/addresses`);
    const data = await response.json().catch(() => []);

    if (response.ok && Array.isArray(data)) {
      setAddresses(data as Address[]);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setPageMessage("");
    setPageError(false);

    try {
      const payload = {
        label: form.label.trim() || null,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim() || null,
        postcode: form.postcode.trim(),
        country: form.country.trim() || "Malaysia",
        is_default: form.is_default,
      };

      const response = await authFetch(
        editingAddress
          ? `${API_URL}/addresses/${editingAddress.id}`
          : `${API_URL}/addresses`,
        {
          method: editingAddress ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ??
            (editingAddress
              ? "Unable to update address."
              : "Unable to add address."),
        );
      }

      await reloadAddresses();

      setEditorOpen(false);
      setEditingAddress(null);
      setForm(emptyForm);

      setPageMessage(editingAddress ? "Address updated." : "Address added.");
    } catch (error) {
      setPageError(true);
      setPageMessage(
        error instanceof Error ? error.message : "Unable to save address.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(address: Address) {
    if (address.is_default) return;

    setPageMessage("");
    setPageError(false);

    try {
      const response = await authFetch(`${API_URL}/addresses/${address.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_default: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to set default address.");
      }

      await reloadAddresses();
      setPageMessage("Default delivery address updated.");
    } catch (error) {
      setPageError(true);
      setPageMessage(
        error instanceof Error
          ? error.message
          : "Unable to set default address.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setPageMessage("");
    setPageError(false);

    try {
      const response = await authFetch(
        `${API_URL}/addresses/${deleteTarget.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to remove address.");
      }

      await reloadAddresses();
      setDeleteTarget(null);
      setPageMessage("Address removed.");
    } catch (error) {
      setDeleteTarget(null);
      setPageError(true);
      setPageMessage(
        error instanceof Error ? error.message : "Unable to remove address.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
      <header className="border-b border-[#cec6bc] pb-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/account"
              className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178] transition hover:text-[#25211d]"
            >
              ← My account
            </Link>

            <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
              Delivery details.
            </p>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#70675f]">
              Keep the places you use most close at hand, so checkout stays
              simple when you find the right piece.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-fit items-center gap-3 border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
          >
            <span>Add address</span>
            <span>+</span>
          </button>
        </div>
      </header>

      {pageMessage && (
        <div
          className={`mt-7 border px-5 py-4 text-sm ${
            pageError
              ? "border-[#9e6c64] bg-[#efe0dc] text-[#6d4039]"
              : "border-[#87927f] bg-[#e6ebe2] text-[#46523f]"
          }`}
        >
          {pageMessage}
        </div>
      )}

      {loading ? (
        <section className="py-12">
          <p className="text-sm text-[#817870]">Loading your addresses...</p>
        </section>
      ) : addresses.length === 0 ? (
        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#c8beb4] bg-[#eee8df] p-8">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              No saved addresses
            </p>

            <p className="mt-4 max-w-lg text-2xl font-medium tracking-[-0.03em]">
              Add a delivery address before your next checkout.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#756d65]">
              Your first address will automatically become the default address.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-7 border border-[#765149] bg-[#765149] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
            >
              Add your first address
            </button>
          </div>

          <div className="border-t border-[#25211d] pt-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
              Why save an address?
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Saved delivery details make future checkout quicker while still
              letting you choose a different address for each order.
            </p>
          </div>
        </section>
      ) : (
        <section className="py-10">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
                Saved addresses
              </p>

              <p className="mt-2 text-xl font-medium">
                {addresses.length}{" "}
                {addresses.length === 1
                  ? "delivery address"
                  : "delivery addresses"}
              </p>
            </div>

            <p className="hidden max-w-sm text-right text-xs leading-5 text-[#91877e] md:block">
              Your default address is preselected at checkout, but you can
              always choose another one.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => openEdit(address)}
                onDelete={() => setDeleteTarget(address)}
                onMakeDefault={() => void makeDefault(address)}
              />
            ))}
          </div>
        </section>
      )}

      {editorOpen && (
        <div
          className="fixed inset-0 z-[170] overflow-y-auto bg-[#25211d]/30 px-5 py-8 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
            <div className="w-full border border-[#b9afa5] bg-[#f4f0e9] shadow-[0_28px_90px_rgba(37,33,29,0.18)]">
              <div className="flex items-start justify-between border-b border-[#cec6bc] px-6 py-6 md:px-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
                    {editingAddress ? "Edit address" : "New address"}
                  </p>

                  <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                    {editingAddress
                      ? "Update delivery details"
                      : "Where should we deliver?"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex h-9 w-9 items-center justify-center border border-[#aaa097] text-xl font-light"
                  aria-label="Close address form"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 px-6 py-6 md:px-8 md:py-8"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Label" hint="Home, Studio, Office..." variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.label}
                        onChange={(event) =>
                          updateField("label", event.target.value)
                        }
                        placeholder="Home"
                        variant="account"
                      />
                    )}
                  </FormField>

                  <FormField label="Recipient name" required variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.recipient_name}
                        onChange={(event) =>
                          updateField("recipient_name", event.target.value)
                        }
                        autoComplete="name"
                        required
                        variant="account"
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Phone" required variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        autoComplete="tel"
                        required
                        variant="account"
                      />
                    )}
                  </FormField>

                  <FormField label="Postcode" required variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.postcode}
                        onChange={(event) =>
                          updateField("postcode", event.target.value)
                        }
                        autoComplete="postal-code"
                        required
                        variant="account"
                      />
                    )}
                  </FormField>
                </div>

                <FormField label="Address line 1" required variant="account">
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      value={form.address_line1}
                      onChange={(event) =>
                        updateField("address_line1", event.target.value)
                      }
                      autoComplete="address-line1"
                      required
                      variant="account"
                    />
                  )}
                </FormField>

                <FormField label="Address line 2" variant="account">
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      value={form.address_line2}
                      onChange={(event) =>
                        updateField("address_line2", event.target.value)
                      }
                      autoComplete="address-line2"
                      variant="account"
                    />
                  )}
                </FormField>

                <div className="grid gap-5 md:grid-cols-3">
                  <FormField label="City" required variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                        autoComplete="address-level2"
                        required
                        variant="account"
                      />
                    )}
                  </FormField>

                  <FormField label="State" variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.state}
                        onChange={(event) =>
                          updateField("state", event.target.value)
                        }
                        autoComplete="address-level1"
                        variant="account"
                      />
                    )}
                  </FormField>

                  <FormField label="Country" required variant="account">
                    {(controlProps) => (
                      <TextInput
                        {...controlProps}
                        value={form.country}
                        onChange={(event) =>
                          updateField("country", event.target.value)
                        }
                        autoComplete="country-name"
                        required
                        variant="account"
                      />
                    )}
                  </FormField>
                </div>

                <label className="flex cursor-pointer items-start gap-3 border border-[#c9c0b6] bg-[#eee8df] px-4 py-4">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(event) =>
                      updateField("is_default", event.target.checked)
                    }
                    disabled={Boolean(editingAddress?.is_default)}
                    className="mt-0.5 h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Use as default delivery address
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[#817870]">
                      {editingAddress?.is_default
                        ? "This is already your default address."
                        : "It will be preselected when you check out."}
                    </span>
                  </span>
                </label>

                <div className="flex flex-col gap-3 border-t border-[#cec6bc] pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="border border-[#8f867d] px-5 py-3.5 text-sm transition hover:bg-[#ebe4db] disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d] disabled:opacity-40"
                  >
                    {saving
                      ? "Saving..."
                      : editingAddress
                        ? "Save changes"
                        : "Add address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-[#25211d]/30 px-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-[#b9afa5] bg-[#f4f0e9] p-6 shadow-[0_24px_80px_rgba(37,33,29,0.18)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178]">
              Remove address
            </p>

            <p className="mt-3 text-2xl font-medium tracking-[-0.03em]">
              Remove this delivery address?
            </p>

            <p className="mt-3 text-sm leading-6 text-[#756d65]">
              {formatAddressName(deleteTarget)} will be removed from your saved
              delivery details.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="border border-[#8f867d] px-4 py-3 text-sm"
              >
                Keep address
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="border border-[#765149] bg-[#765149] px-4 py-3 text-sm text-[#f4f0e9] disabled:opacity-40"
              >
                {deleting ? "Removing..." : "Remove address"}
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#91877e]">
              Addresses already attached to an existing order may need to remain
              for order records.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onMakeDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
}) {
  return (
    <article
      className={`flex min-h-[330px] flex-col border p-6 ${
        address.is_default
          ? "border-[#5f6f59] bg-[#e8ebe4]"
          : "border-[#c7beb5] bg-[#eee8df]"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
            {address.label || "Delivery address"}
          </p>

          <p className="mt-3 text-xl font-medium tracking-[-0.03em]">
            {address.recipient_name}
          </p>
        </div>

        {address.is_default && (
          <span className="border border-[#5f6f59] bg-[#5f6f59] px-3 py-1.5 text-[10px] uppercase tracking-[0.09em] text-[#f4f0e9]">
            Default
          </span>
        )}
      </div>

      <div className="mt-6 flex-1">
        <p className="text-sm leading-7 text-[#6f675f]">
          {address.address_line1}
          {address.address_line2 ? `, ${address.address_line2}` : ""}
          <br />
          {address.postcode} {address.city}
          {address.state ? `, ${address.state}` : ""}
          <br />
          {address.country}
        </p>

        <p className="mt-4 text-sm text-[#756d65]">{address.phone}</p>
      </div>

      <div className="mt-7 border-t border-[#c8c0b7] pt-4">
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
          <button
            type="button"
            onClick={onEdit}
            className="underline decoration-[#9f958b] underline-offset-4"
          >
            Edit
          </button>

          {!address.is_default && (
            <button
              type="button"
              onClick={onMakeDefault}
              className="text-[#52604d] underline decoration-[#87927f] underline-offset-4"
            >
              Make default
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="text-[#765149] underline decoration-[#a8857d] underline-offset-4"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function formatAddressName(address: Address) {
  return address.label
    ? `${address.label} (${address.recipient_name})`
    : address.recipient_name;
}
