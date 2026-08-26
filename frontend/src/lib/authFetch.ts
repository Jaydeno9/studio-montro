import { supabase } from "@/src/lib/supabase";

export async function authFetch(url: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
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

  let response = await sendRequest(session.access_token);

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      await supabase.auth.signOut();
      throw new Error("AUTH_REQUIRED");
    }

    response = await sendRequest(data.session.access_token);
  }

  return response;
}
