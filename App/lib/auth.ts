const TOKEN_KEY = "assistambu_token";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001";

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
  window.location.href = `${AUTH_URL}/login?redirect=${window.location.href}`;
}

export function logout(): void {
  removeToken();
  redirectToAuth();
}