import { supabase } from "@/src/lib/supabase";

export const ADMIN_ACCESS_DENIED_PATH = "/admin/login?access=denied";

let adminExitPromise: Promise<void> | null = null;

async function exitAdminArea(reason: "unauthorized" | "forbidden") {
  if (!adminExitPromise) {
    adminExitPromise = (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } finally {
        if (typeof window !== "undefined") {
          window.location.replace(
            reason === "forbidden"
              ? ADMIN_ACCESS_DENIED_PATH
              : "/admin/login",
          );
        }
      }
    })();
  }

  await adminExitPromise;
}

export async function adminFetch(
  url: string,
  options: RequestInit = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    await exitAdminArea("unauthorized");
    throw new Error("AUTH_REQUIRED");
  }

  async function sendRequest(accessToken: string) {
    return fetch(url, {
      ...options,

      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  // First attempt
  let response = await sendRequest(session.access_token);

  // Token expired / invalid
  if (response.status === 401) {
    const {
      data,
      error,
    } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      await exitAdminArea("unauthorized");
      throw new Error("AUTH_REQUIRED");
    }

    // Retry once with fresh token
    response = await sendRequest(
      data.session.access_token,
    );
  }

  if (response.status === 401) {
    await exitAdminArea("unauthorized");
    throw new Error("AUTH_REQUIRED");
  }

  if (response.status === 403) {
    await exitAdminArea("forbidden");
    throw new Error("ADMIN_ACCESS_REVOKED");
  }

  return response;
}
