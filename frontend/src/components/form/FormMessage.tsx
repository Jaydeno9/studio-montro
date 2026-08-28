import type { ReactNode } from "react";

type FormMessageProps = {
  tone?: "error" | "success" | "neutral";
  children: ReactNode;
  className?: string;
};

export function FormMessage({
  tone = "error",
  children,
  className = "",
}: FormMessageProps) {
  const color =
    tone === "error"
      ? "text-[#8b3a34]"
      : tone === "success"
        ? "text-[#5f6757]"
        : "text-[#746c64]";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mt-4 text-sm leading-6 ${color} ${className}`}
    >
      {children}
    </p>
  );
}
