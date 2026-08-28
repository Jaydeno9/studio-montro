const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function verifyAdminAccess(accessToken: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/admin/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 403) {
    return false;
  }

  if (response.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!response.ok) {
    throw new Error("ADMIN_CHECK_FAILED");
  }

  const data = await response.json().catch(() => null);
  return data?.is_admin === true;
}

