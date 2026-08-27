const DEFAULT_AUTH_REDIRECT = "/products";

export function getSafeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!value || value !== value.trim() || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://studio-montro.local");

    if (url.origin !== "https://studio-montro.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function withReturnTo(path: string, returnTo: string) {
  const url = new URL(path, "https://studio-montro.local");
  url.searchParams.set("returnTo", getSafeReturnTo(returnTo));
  return `${url.pathname}${url.search}`;
}
