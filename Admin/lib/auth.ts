const TOKEN_KEY = "admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function redirectToAuth(): void {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002";
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001";
  window.location.href = `${authUrl}/login?redirect=${adminUrl}`;
}

export function logout(): void {
  removeToken();
  redirectToAuth();
}
