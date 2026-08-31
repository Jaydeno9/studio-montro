"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";
import { PasswordField } from "@/src/components/auth/PasswordField";
import { PasswordRequirements } from "@/src/components/auth/PasswordRequirements";
import { FormField } from "@/src/components/form/FormField";
import { TextInput } from "@/src/components/form/TextInput";
import { withReturnTo } from "@/src/lib/authRedirect";
import { isPasswordValid } from "@/src/lib/passwordValidation";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

import { API_URL } from "@/src/lib/apiConfig";

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const currentPasswordError =
    passwordError && passwordMessage === "Current password is incorrect."
      ? passwordMessage
      : undefined;
  const newPasswordError =
    passwordError &&
    passwordMessage === "Password must meet all four requirements."
      ? passwordMessage
      : undefined;
  const confirmationError =
    passwordError && passwordMessage === "The passwords do not match."
      ? passwordMessage
      : undefined;

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

    setPasswordMessage("");
    setPasswordError(false);

    if (!isPasswordValid(newPassword)) {
      setPasswordError(true);
      setPasswordMessage("Password must meet all four requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      setPasswordMessage("The passwords do not match.");
      return;
    }

    if (savingPassword) {
      return;
    }

    setSavingPassword(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw new Error("USER_EMAIL_UNAVAILABLE");
      }

      const { error: authenticationError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

      if (authenticationError) {
        setPasswordError(true);
        setPasswordMessage("Current password is incorrect.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      clearPasswordFields();
      setChangingPassword(false);
      setPasswordMessage("Password updated.");
    } catch {
      setPasswordError(true);
      setPasswordMessage("We couldn't update your password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  function clearPasswordFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function cancelPasswordChange() {
    clearPasswordFields();
    setPasswordMessage("");
    setPasswordError(false);
    setChangingPassword(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
        <p className="text-sm text-[#756d65]">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e9] px-8 pb-24 pt-8 md:pt-10 text-[#25211d]">
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
              <FormField
                label="Full name"
                hint="Used for your account and customer records."
                variant="account"
                hintPosition="before"
              >
                {(controlProps) => (
                  <TextInput
                    {...controlProps}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    variant="account"
                  />
                )}
              </FormField>

              <FormField
                label="Phone number"
                hint="Your account contact number. Delivery addresses can keep a different recipient phone."
                variant="account"
                hintPosition="before"
              >
                {(controlProps) => (
                  <TextInput
                    {...controlProps}
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    placeholder="+60..."
                    variant="account"
                  />
                )}
              </FormField>

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

                <FormField
                  label="New email address"
                  error={securityError ? securityMessage : undefined}
                  required
                  variant="account"
                  className="mt-5"
                >
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      variant="account"
                    />
                  )}
                </FormField>

                <button
                  type="submit"
                  disabled={savingEmail}
                  className="mt-5 border border-[#25211d] px-4 py-3 text-sm transition hover:bg-[#25211d] hover:text-[#f4f0e9] disabled:opacity-40"
                >
                  {savingEmail ? "Updating..." : "Update email"}
                </button>
              </form>

              <section className="border border-[#c7beb5] bg-[#eee8df] p-6">
                {!changingPassword ? (
                  <>
                    <p className="text-sm font-medium">Password</p>
                    <p className="mt-3 tracking-[0.18em] text-[#625a53]" aria-label="Password hidden">
                      ••••••••••••
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#817870]">
                      Keep your account secure with a password only you know.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMessage("");
                        setPasswordError(false);
                        setChangingPassword(true);
                      }}
                      className="mt-5 text-sm underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#4b1f26]"
                    >
                      Change password →
                    </button>
                    {passwordMessage && (
                      <div className="mt-5">
                        <Message error={passwordError} text={passwordMessage} />
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={updatePassword}>
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-sm font-medium">Change password</p>
                        <p className="mt-2 text-xs leading-5 text-[#817870]">
                          Confirm your current password before choosing a new one.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelPasswordChange}
                        disabled={savingPassword}
                        className="text-xs underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#4b1f26] disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mt-5 space-y-5">
                      <PasswordField
                        id="current-password"
                        label="Current password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                        placeholder="Your current password"
                        error={currentPasswordError}
                        variant="account"
                      >
                        <Link
                          href={withReturnTo("/forgot-password", "/account/profile")}
                          className="mt-3 inline-block text-xs underline decoration-[#aaa097] underline-offset-4 transition hover:text-[#4b1f26]"
                        >
                          Forgot your password?
                        </Link>
                      </PasswordField>

                      <PasswordField
                        id="new-password"
                        label="New password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        error={newPasswordError}
                        variant="account"
                      >
                        <PasswordRequirements password={newPassword} />
                      </PasswordField>

                      <PasswordField
                        id="confirm-new-password"
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        error={confirmationError}
                        variant="account"
                      />
                    </div>

                    {passwordMessage &&
                      !currentPasswordError &&
                      !newPasswordError &&
                      !confirmationError && (
                      <div className="mt-5">
                        <Message error={passwordError} text={passwordMessage} />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="mt-5 border border-[#765149] bg-[#765149] px-4 py-3 text-sm text-[#f4f0e9] transition hover:bg-[#67443e] disabled:opacity-40"
                    >
                      {savingPassword ? "Updating..." : "Update password"}
                    </button>
                  </form>
                )}
              </section>
            </div>

            {securityMessage && !securityError && (
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
