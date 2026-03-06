const KEY = "printr:auth:token";

export function getAuthToken(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && v.length > 20 ? v : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, token);
  } catch {
    // ignore
  }
}
