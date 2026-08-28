import type { ComponentPropsWithoutRef } from "react";

type TextInputProps = ComponentPropsWithoutRef<"input"> & {
  variant?: "default" | "account";
};

export function TextInput({
  className = "",
  variant = "default",
  ...props
}: TextInputProps) {
  const appearance =
    variant === "account"
      ? "bg-[#f8f4ee] focus-visible:border-[#5f6f59] focus-visible:ring-[#5f6f59]/15"
      : "bg-[#faf7f1] focus-visible:border-[#4b1f26] focus-visible:ring-[#4b1f26]/15";

  return (
    <input
      {...props}
      className={`h-12 w-full border border-[#b8aea4] px-4 text-sm text-[#25211d] outline-none transition placeholder:text-[#a19890] focus-visible:ring-2 aria-invalid:border-[#a97068] aria-invalid:ring-[#a97068]/15 disabled:cursor-not-allowed disabled:bg-[#eee8df] disabled:text-[#8b827a] disabled:opacity-70 read-only:cursor-default read-only:bg-[#eee8df] read-only:text-[#756d65] ${appearance} ${className}`}
    />
  );
}
