import type { ReactNode } from "react";
import { FormMessage } from "@/src/components/form/FormMessage";

export function AuthMessage({ tone = "error", children }: { tone?: "error" | "success" | "neutral"; children: ReactNode }) {
  return <FormMessage tone={tone}>{children}</FormMessage>;
}
