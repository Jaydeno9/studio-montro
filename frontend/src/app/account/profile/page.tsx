"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadProfile() {
        try {
          const response = await authFetch(`${API_URL}/profile`);
          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.detail ?? "Unable to load your profile.");
          }

          if (!cancelled) {
            const next = data as Profile;
            setProfile(next);
            setFullName(next.full_name ?? "");
            setPhone(next.phone ?? "");
            setEmail(next.email ?? "");
          }
        } catch (error) {
          if (!cancelled) {
            setProfileError(true);
            setProfileMessage(
              error instanceof Error
                ? error.message
                : "Unable to load your profile.",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void loadProfile();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function savePersonalDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingProfile) {
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");
    setProfileError(false);

    try {
      const response = await authFetch(`${API_URL}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "Unable to update your profile.");
      }

      const updated = data as Profile;
      setProfile(updated);
      setFullName(updated.full_name ?? "");
      setPhone(updated.phone ?? "");
      setProfileMessage("Personal details updated.");
    } catch (error) {
      setProfileError(true);
      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingEmail || !email.trim()) {
      return;
    }

    setSavingEmail(true);
    setSecurityMessage("");
    setSecurityError(false);

    try {
      const nextEmail = email.trim();

      if (nextEmail === profile?.email) {
        setSecurityMessage("Your email has not changed.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        email: nextEmail,
      });

      if (error) {
        throw error;
      }

      setSecurityMessage(
        "Email change requested. Check your inbox and follow the confirmation link if required.",
      );
    } catch (error) {
      setSecurityError(true);
      setSecurityMessage(
        error instanceof Error ? error.message : "Unable to update your email.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSecurityMessage("");
    setSecurityError(false);

    if (newPassword.length < 8) {
      setSecurityError(true);
      setSecurityMessage("Use at least 8 characters for your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError(true);
      setSecurityMessage("The passwords do not match.");
      return;
    }

    if (savingPassword) {
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSecurityMessage("Password updated.");
    } catch (error) {
      setSecurityError(true);
      setSecurityMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-32 text-[#25211d]">
        <p className="text-sm text-[#756d65]">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-32 text-[#25211d]">
      <header className="border-b border-[#cec6bc] pb-10">
        <Link
          href="/account"
          className="text-[10px] uppercase tracking-[0.16em] text-[#8a8178] transition hover:text-[#25211d]"
        >
          ← My account
        </Link>

        <p className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-7xl">
          Your details.
        </p>

        <p className="mt-6 max-w-xl text-sm leading-7 text-[#70675f]">
          Keep your personal and account information current. Your delivery
          addresses are managed separately so each order can still use the right
          destination.
        </p>
      </header>

      <div className="grid gap-12 py-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-12">
          <section>
            <div className="flex items-end justify-between gap-6 border-b border-[#cec6bc] pb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
                  Personal information
                </p>
                <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                  How we know you
                </p>
              </div>

              <span className="hidden border border-[#5f6f59] bg-[#5f6f59] px-3 py-1.5 text-[10px] uppercase tracking-[0.09em] text-[#f4f0e9] sm:inline-flex">
                Customer profile
              </span>
            </div>

            <form
              onSubmit={savePersonalDetails}
              className="mt-7 max-w-2xl space-y-6"
            >
              <Field
                label="Full name"
                hint="Used for your account and customer records."
              >
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Phone number"
                hint="Your account contact number. Delivery addresses can keep a different recipient phone."
              >
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+60..."
                  className={inputClass}
                />
              </Field>

              {profileMessage && (
                <Message error={profileError} text={profileMessage} />
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-4 border border-[#5f6f59] bg-[#5f6f59] px-5 py-3.5 text-sm text-[#f4f0e9] transition hover:bg-[#52604d] disabled:opacity-40"
              >
                <span>
                  {savingProfile ? "Saving..." : "Save personal details"}
                </span>
                <span>→</span>
              </button>
            </form>
          </section>

          <section className="border-t border-[#cec6bc] pt-8">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8a8178]">
              Account access
            </p>

            <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
              Email & password
            </p>

            <div className="mt-7 grid gap-8 lg:grid-cols-2">
              <form
                onSubmit={updateEmail}
                className="border border-[#c7beb5] bg-[#eee8df] p-6"
              >
                <p className="text-sm font-medium">Email address</p>

                <p className="mt-2 text-xs leading-5 text-[#817870]">
                  Changing your sign-in email may require confirmation from your
                  inbox.
                </p>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className={`${inputClass} mt-5`}
                />

                <button
                  type="submit"
                  disabled={savingEmail}
                  className="mt-5 border border-[#25211d] px-4 py-3 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9] disabled:opacity-40"
                >
                  {savingEmail ? "Updating..." : "Update email"}
                </button>
              </form>

              <form
                onSubmit={updatePassword}
                className="border border-[#c7beb5] bg-[#eee8df] p-6"
              >
                <p className="text-sm font-medium">Password</p>

                <p className="mt-2 text-xs leading-5 text-[#817870]">
                  Use a new password with at least 8 characters.
                </p>

                <div className="mt-5 space-y-4">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password"
                    autoComplete="new-password"
                    className={inputClass}
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="mt-5 border border-[#765149] bg-[#765149] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#67443e] disabled:opacity-40"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>

            {securityMessage && (
              <div className="mt-5 max-w-2xl">
                <Message error={securityError} text={securityMessage} />
              </div>
            )}
          </section>
        </div>

        <aside>
          <div className="border-t border-[#25211d]">
            <div className="border-b border-[#cec6bc] py-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                Delivery addresses
              </p>

              <p className="mt-3 text-sm leading-6 text-[#756d65]">
                Recipient names, phone numbers and delivery destinations live in
                your address book.
              </p>

              <Link
                href="/account/addresses"
                className="mt-5 inline-flex items-center gap-3 border border-[#5f6f59] bg-[#5f6f59] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#52604d]"
              >
                Manage addresses
                <span>→</span>
              </Link>
            </div>

            <div className="border-b border-[#cec6bc] py-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                Orders
              </p>

              <p className="mt-3 text-sm leading-6 text-[#756d65]">
                Cancellation requests, refund progress and payment activity stay
                with each individual order.
              </p>

              <Link
                href="/account/orders"
                className="mt-5 inline-flex border-b border-[#25211d] pb-1 text-sm"
              >
                View your orders
              </Link>
            </div>

            <div className="py-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                Account email
              </p>

              <p className="mt-3 break-all text-sm text-[#625a53]">
                {profile?.email ?? "—"}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>

      {hint && (
        <span className="mt-1 block text-xs leading-5 text-[#91877e]">
          {hint}
        </span>
      )}

      <div className="mt-3">{children}</div>
    </label>
  );
}

function Message({ error, text }: { error: boolean; text: string }) {
  return (
    <div
      className={`border px-4 py-3 text-xs leading-5 ${
        error
          ? "border-[#9e6c64] bg-[#efe0dc] text-[#6d4039]"
          : "border-[#87927f] bg-[#e6ebe2] text-[#46523f]"
      }`}
    >
      {text}
    </div>
  );
}

const inputClass =
  "h-12 w-full border border-[#b8aea4] bg-[#f8f4ee] px-4 text-sm outline-none transition focus:border-[#5f6f59]";
