import type { ComponentPropsWithoutRef } from "react";

type SelectFieldProps = Omit<ComponentPropsWithoutRef<"select">, "size"> & {
  variant?: "default" | "account";
  size?: "default" | "compact";
};

export function SelectField({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: SelectFieldProps) {
  const appearance =
    variant === "account"
      ? "bg-[#f8f4ee] focus-visible:border-[#5f6f59] focus-visible:ring-[#5f6f59]/15"
      : "bg-[#faf7f1] focus-visible:border-[#4b1f26] focus-visible:ring-[#4b1f26]/15";
  const sizing = size === "compact" ? "h-10 px-3" : "h-12 px-4";

  return (
    <select
      {...props}
      className={`w-full cursor-pointer border border-[#b8aea4] text-sm text-[#25211d] outline-none transition focus-visible:ring-2 aria-invalid:border-[#a97068] aria-invalid:ring-[#a97068]/15 disabled:cursor-not-allowed disabled:bg-[#eee8df] disabled:text-[#8b827a] disabled:opacity-70 ${appearance} ${sizing} ${className}`}
    />
  );
}
