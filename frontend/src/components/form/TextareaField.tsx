import type { ComponentPropsWithoutRef } from "react";

type TextareaFieldProps = ComponentPropsWithoutRef<"textarea">;

export function TextareaField({
  className = "",
  ...props
}: TextareaFieldProps) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full border border-[#b8aea4] bg-[#faf7f1] px-4 py-3 text-sm leading-6 text-[#25211d] outline-none transition placeholder:text-[#a19890] focus-visible:border-[#4b1f26] focus-visible:ring-2 focus-visible:ring-[#4b1f26]/15 aria-invalid:border-[#a97068] aria-invalid:ring-[#a97068]/15 disabled:cursor-not-allowed disabled:bg-[#eee8df] disabled:text-[#8b827a] disabled:opacity-70 read-only:cursor-default read-only:bg-[#eee8df] read-only:text-[#756d65] ${className}`}
    />
  );
}
