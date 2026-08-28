"use client";

import { useState, type ChangeEventHandler, type ReactNode } from "react";
import { FormField } from "@/src/components/form/FormField";
import { TextInput } from "@/src/components/form/TextInput";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  children?: ReactNode;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: "underline" | "boxed" | "account";
};

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, children, error, disabled, readOnly, variant = "underline" }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  if (variant === "underline") {
    return (
      <div className="border-b border-[#cec6bc] py-5 transition-colors focus-within:border-[#4b1f26]">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={id} className="text-[11px] uppercase tracking-[0.14em] text-[#857c73]">{label}</label>
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            disabled={disabled}
            className="min-w-10 text-right text-xs text-[#756d65] transition hover:text-[#25211d] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#4b1f26] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          readOnly={readOnly}
          className="mt-3 w-full bg-transparent text-base text-[#25211d] outline-none placeholder:text-[#a19890]"
          placeholder={placeholder}
        />
        {children}
      </div>
    );
  }

  return (
    <FormField id={id} label={label} error={error}>
      {(controlProps) => (
        <>
          <div className="relative">
            <TextInput
              {...controlProps}
              type={visible ? "text" : "password"}
              required
              autoComplete={autoComplete}
              value={value}
              onChange={onChange}
              className="pr-20"
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              variant={variant === "account" ? "account" : "default"}
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
              disabled={disabled}
              className="absolute inset-y-0 right-4 my-auto h-fit min-w-10 text-right text-xs text-[#756d65] transition hover:text-[#25211d] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#4b1f26] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
          {children}
        </>
      )}
    </FormField>
  );
}
