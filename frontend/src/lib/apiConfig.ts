const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredApiUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be configured for production builds.",
  );
}

export const API_URL = configuredApiUrl || "http://127.0.0.1:8000";
