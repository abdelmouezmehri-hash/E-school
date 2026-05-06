const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  const response = await window.fetch("/api/auth/csrf", {
    credentials: "include",
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => ({}));
  return typeof body.csrfToken === "string"
    ? body.csrfToken
    : readCookie(CSRF_COOKIE);
}

export function installCsrfFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = (
      init.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      input instanceof Request ? input.headers : undefined,
    );
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (!headers.has(CSRF_HEADER)) {
      const token = await ensureCsrfToken();
      if (token) headers.set(CSRF_HEADER, token);
    }

    return originalFetch(input, { ...init, method, headers });
  };
}
