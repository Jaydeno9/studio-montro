"use client";

import { useId, type ReactNode } from "react";

export type FormFieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (controlProps: FormFieldControlProps) => ReactNode;
  className?: string;
  required?: boolean;
  variant?: "default" | "account";
  hintPosition?: "before" | "after";
};

export function FormField({
  id,
  label,
  hint,
  error,
  children,
  className = "",
  required = false,
  variant = "default",
  hintPosition = "after",
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={controlId}
        className={
          variant === "account"
            ? "mb-2 block text-sm font-medium text-[#25211d]"
            : "mb-2 block text-[11px] uppercase tracking-[0.14em] text-[#756d65]"
        }
      >
        {label}
        {required && (
          <span className="ml-1 text-[#765149]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && hintPosition === "before" && (
        <p id={hintId} className="mb-3 text-xs leading-5 text-[#91877e]">
          {hint}
        </p>
      )}
      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && hintPosition === "after" && (
        <p id={hintId} className="mt-2 text-xs leading-5 text-[#857c73]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs leading-5 text-[#8b3a34]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
