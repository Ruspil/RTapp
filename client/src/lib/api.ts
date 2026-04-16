/** Base URL for API calls. In Vite dev, leave empty so `/api` is same-origin and proxied to the Express server. */
export function apiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  return typeof v === "string" ? v.replace(/\/$/, "") : "";
}

export const AUTH_TOKEN_KEY = "trainhard-auth-token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
