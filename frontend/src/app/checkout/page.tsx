"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";
import { useCart } from "@/src/hooks/useCart";
import { FormField } from "@/src/components/form/FormField";
import { FormMessage } from "@/src/components/form/FormMessage";
import { TextInput } from "@/src/components/form/TextInput";
import { TextareaField } from "@/src/components/form/TextareaField";

type Address = {
  id: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
};

type CreatedOrder = {
  id: string;
  total: number;
  subtotal: number;
  status: string;
  payment_status: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function CheckoutPage() {
  const router = useRouter();

  const {
    cartItems,
    cartCount,
    cartTotal,
    cartLoading,
    isAuthenticated,
    refreshCart,
  } = useCart();

  const [email, setEmail] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [useNewAddress, setUseNewAddress] = useState(true);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [note, setNote] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setPageLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setEmail(session.user.email ?? "");
        }

        const response = await authFetch(`${API_URL}/addresses`);

        if (!response.ok) {
          throw new Error("Unable to load your saved addresses.");
        }

        const addresses: Address[] = await response.json();

        if (cancelled) {
          return;
        }

        setSavedAddresses(addresses);

        const defaultAddress =
          addresses.find((address) => address.is_default) ?? addresses[0];

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setUseNewAddress(false);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load checkout.",
          );
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, []);


  async function createAddress() {
    const response = await authFetch(`${API_URL}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: "Delivery",
        recipient_name: recipientName.trim(),
        phone: phone.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        state: state.trim() || null,
        postcode: postcode.trim(),
        country: "Malaysia",
        is_default: savedAddresses.length === 0,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail ?? "Unable to save delivery address.");
    }

    return data as Address;
  }

  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (placingOrder || cartItems.length === 0) {
      return;
    }

    try {
      setPlacingOrder(true);
      setError("");

      let addressId = selectedAddressId;

      if (useNewAddress) {
        if (
          !recipientName.trim() ||
          !phone.trim() ||
          !addressLine1.trim() ||
          !city.trim() ||
          !postcode.trim()
        ) {
          throw new Error("Please complete all required delivery fields.");
        }

        const address = await createAddress();
        addressId = address.id;
      }

      if (!addressId) {
        throw new Error("Please select a delivery address.");
      }

      const response = await authFetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address_id: addressId,
          note: note.trim() || null,
          payment_proof_url: null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to place your order.");
      }

      const order = data as CreatedOrder;

      await refreshCart();

      router.push(`/order-success/${order.id}`);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Unable to place your order.",
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  if (cartLoading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#746c64]">Preparing checkout...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="border-b border-[#cec6bc] pb-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8178]">
            Checkout
          </p>
          <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
            Sign in to continue.
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center py-20">
          <div className="max-w-[460px] text-center">
            <p className="text-2xl font-medium tracking-[-0.025em]">
              Checkout is connected to your account.
            </p>

            <p className="mt-4 text-sm leading-7 text-[#756d65]">
              Sign in or create an account to use your saved delivery details,
              place the order, and return to its payment and delivery history.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="bg-[#765149] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#67443e]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="bg-[#5f6f59] px-6 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                Create account
              </Link>
            </div>

            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-2 text-sm text-[#6f675f] underline decoration-[#aaa198] underline-offset-4"
            >
              Return to shop
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <div className="border-b border-[#cec6bc] pb-8">
          <p className="text-5xl font-medium tracking-[-0.045em] md:text-7xl">
            Checkout
          </p>
        </div>

        <div className="grid min-h-[55vh] place-items-center">
          <div className="text-center">
            <p className="text-2xl font-medium">Your bag is empty.</p>

            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-3 border-b border-[#25211d] pb-1 text-sm"
            >
              Return to shop
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-28 pt-8 md:pt-10 text-[#25211d]">
      <div className="flex items-end justify-between border-b border-[#cec6bc] pb-8">
        <div>
          <Link
            href="/cart"
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#6f675f] transition hover:text-[#25211d]"
          >
            <span>←</span>
            Back to bag
          </Link>

          <p className="text-5xl font-medium tracking-[-0.045em] md:text-7xl">
            Checkout
          </p>
        </div>

        <p className="pb-1 text-xs uppercase tracking-[0.16em] text-[#827970]">
          {cartCount} {cartCount === 1 ? "piece" : "pieces"}
        </p>
      </div>

      <form
        onSubmit={handlePlaceOrder}
        className="grid gap-14 pt-10 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_430px]"
      >
        <section className="max-w-3xl">
          {/* CONTACT */}
          <div className="border-b border-[#cec6bc] pb-9">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
                01 — Contact
              </p>
            </div>

            <FormField id="checkout-email" label="Email" className="mt-6">
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  type="email"
                  value={email}
                  autoComplete="email"
                  readOnly
                />
              )}
            </FormField>
          </div>

          {/* DELIVERY */}
          <div className="border-b border-[#cec6bc] py-9">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
              02 — Delivery
            </p>

            {savedAddresses.length > 0 && (
              <div className="mt-6 space-y-3">
                {savedAddresses.map((address) => {
                  const active =
                    !useNewAddress && selectedAddressId === address.id;

                  return (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(address.id);
                        setUseNewAddress(false);
                      }}
                      className={`w-full border p-5 text-left transition ${
                        active
                          ? "border-[#25211d]"
                          : "border-[#cec6bc] hover:border-[#8e857c]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-sm font-medium">
                            {address.recipient_name}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-[#756d65]">
                            {address.address_line1}
                            {address.address_line2
                              ? `, ${address.address_line2}`
                              : ""}
                            <br />
                            {address.postcode} {address.city}
                            {address.state ? `, ${address.state}` : ""}
                            <br />
                            {address.country}
                          </p>

                          <p className="mt-2 text-sm text-[#756d65]">
                            {address.phone}
                          </p>
                        </div>

                        {address.is_default && (
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[#8a8178]">
                            Default
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setUseNewAddress(true);
                    setSelectedAddressId("");
                  }}
                  className="mt-2 text-sm text-[#625a53] underline decoration-[#aaa097] underline-offset-4"
                >
                  Use a new address
                </button>
              </div>
            )}

            {(useNewAddress || savedAddresses.length === 0) && (
              <div className="mt-7 grid gap-x-5 gap-y-6 md:grid-cols-2">
                <CheckoutField
                  label="Full name *"
                  value={recipientName}
                  onChange={setRecipientName}
                  autoComplete="name"
                />

                <CheckoutField
                  label="Phone *"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  type="tel"
                />

                <div className="md:col-span-2">
                  <CheckoutField
                    label="Address line 1 *"
                    value={addressLine1}
                    onChange={setAddressLine1}
                    autoComplete="address-line1"
                  />
                </div>

                <div className="md:col-span-2">
                  <CheckoutField
                    label="Address line 2"
                    value={addressLine2}
                    onChange={setAddressLine2}
                    autoComplete="address-line2"
                  />
                </div>

                <CheckoutField
                  label="City *"
                  value={city}
                  onChange={setCity}
                  autoComplete="address-level2"
                />

                <CheckoutField
                  label="State"
                  value={state}
                  onChange={setState}
                  autoComplete="address-level1"
                />

                <CheckoutField
                  label="Postcode *"
                  value={postcode}
                  onChange={setPostcode}
                  autoComplete="postal-code"
                />

                <FormField label="Country">
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      value="Malaysia"
                      autoComplete="country-name"
                      readOnly
                    />
                  )}
                </FormField>
              </div>
            )}
          </div>

          {/* DELIVERY METHOD */}
          <div className="border-b border-[#cec6bc] py-9">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
              03 — Delivery method
            </p>

            <div className="mt-6 flex items-start justify-between border border-[#25211d] p-5">
              <div>
                <p className="text-sm font-medium">Standard delivery</p>
                <p className="mt-2 text-sm text-[#756d65]">
                  Malaysia · estimated 3–7 working days
                </p>
              </div>

              <p className="text-sm">
                {cartTotal >= 500 ? "Complimentary" : "At checkout"}
              </p>
            </div>
          </div>

          {/* NOTE */}
          <div className="py-9">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
              04 — Order note
            </p>

            <FormField label="Note" className="mt-6">
              {(controlProps) => (
                <TextareaField
                  {...controlProps}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="Delivery instructions or a note for the studio..."
                  className="resize-none"
                />
              )}
            </FormField>
          </div>
        </section>

        {/* SUMMARY */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-5">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#8a8178]">
                Your order
              </p>
            </div>

            <div className="divide-y divide-[#d7d0c7]">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-6 py-5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.products?.name ?? "Product"}
                    </p>

                    <p className="mt-1 text-xs text-[#817870]">
                      Qty {item.quantity}
                      {item.product_colors?.color_name
                        ? ` · ${item.product_colors.color_name}`
                        : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm">
                    RM{" "}
                    {Number(item.subtotal).toLocaleString("en-MY", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-y border-[#cec6bc] py-6">
              <div className="flex justify-between gap-5">
                <p className="text-sm text-[#756d65]">Subtotal</p>
                <p className="text-sm">
                  RM{" "}
                  {cartTotal.toLocaleString("en-MY", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="flex justify-between gap-5">
                <p className="text-sm text-[#756d65]">Shipping</p>
                <p className="text-sm">
                  {cartTotal >= 500 ? "Complimentary" : "Calculated later"}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-5 py-6">
              <p className="text-sm font-medium">Estimated total</p>

              <p className="text-xl font-medium tracking-[-0.02em]">
                RM{" "}
                {cartTotal.toLocaleString("en-MY", {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {error && (
              <div className="mb-5 border border-[#a97068] px-4 py-3">
                <FormMessage className="mt-0">{error}</FormMessage>
              </div>
            )}

            <button
              type="submit"
              disabled={placingOrder}
              className="flex w-full items-center justify-between bg-[#25211d] px-5 py-4 text-sm font-medium text-[#f4f0e9] transition hover:bg-[#39332d] disabled:cursor-wait disabled:opacity-50"
            >
              <span>{placingOrder ? "Placing order..." : "Place order"}</span>
              <span>→</span>
            </button>

            <p className="mt-4 text-xs leading-5 text-[#837a72]">
              Payment status will remain pending until payment is completed and
              verified.
            </p>
          </div>
        </aside>
      </form>
    </main>
  );
}

function CheckoutField({
  label,
  value,
  onChange,
  autoComplete,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  type?: "text" | "tel";
}) {
  return (
    <FormField label={label}>
      {(controlProps) => (
        <TextInput
          {...controlProps}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
        />
      )}
    </FormField>
  );
}
