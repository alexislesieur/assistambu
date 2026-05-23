"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getRedirectUrl } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<AuthResponse>("/login", { email, password });
      const redirectUrl = getRedirectUrl();
      const url = new URL(redirectUrl);
      url.searchParams.set("token", res.token);
      window.location.href = url.toString();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2E86C1] mb-4">
            <svg width="32" height="32" viewBox="0 0 120 120" fill="none">
              <path d="M52 32H68V48H84V64H68V88H52V64H36V48H52Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Assist<span className="text-[#5DADE2]">Ambu</span>
          </h1>
          <p className="text-[#8694A7] text-sm mt-1">Connexion à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#F9ECEA] border border-[#C0392B] rounded-lg p-3 text-[#C0392B] text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#8694A7] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marc@email.com"
              required
              className="w-full bg-[#141A26] border border-[#1C2433] rounded-lg px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#2E86C1] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#8694A7] mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#141A26] border border-[#1C2433] rounded-lg px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#2E86C1] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2E86C1] hover:bg-[#2471A3] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.href = "/forgot-password"}
            className="text-[#5DADE2] text-sm"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <p className="text-center text-[#8694A7] text-sm mt-4">
          Pas encore de compte ?{" "}
          <button
            onClick={() => window.location.href = "/register"}
            className="text-[#5DADE2] font-semibold"
          >
            S&apos;inscrire
          </button>
        </p>

      </div>
    </div>
  );
}