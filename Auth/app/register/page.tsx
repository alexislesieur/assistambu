"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { setToken, getRedirectUrl } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<AuthResponse>("/register", form);
      setToken(res.token);
      window.location.href = getRedirectUrl();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2E86C1] mb-4">
            <svg width="32" height="32" viewBox="0 0 120 120" fill="none">
              <path d="M52 32H68V48H84V64H68V88H52V64H36V48H52Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Assist<span className="text-[#5DADE2]">Ambu</span>
          </h1>
          <p className="text-[#8694A7] text-sm mt-1">Créer votre compte</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#F9ECEA] border border-[#C0392B] rounded-lg p-3 text-[#C0392B] text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#8694A7] mb-2">
                Prénom
              </label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Marc"
                required
                className="w-full bg-[#141A26] border border-[#1C2433] rounded-lg px-3 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#2E86C1] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#8694A7] mb-2">
                Nom
              </label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Dupont"
                required
                className="w-full bg-[#141A26] border border-[#1C2433] rounded-lg px-3 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#2E86C1] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#8694A7] mb-2">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
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
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full bg-[#141A26] border border-[#1C2433] rounded-lg px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#2E86C1] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#8694A7] mb-2">
              Confirmer le mot de passe
            </label>
            <input
              name="password_confirmation"
              type="password"
              value={form.password_confirmation}
              onChange={handleChange}
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
            {loading ? "Inscription..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-[#8694A7] text-sm mt-6">
          Déjà un compte ?{" "}
          <a href="/login" className="text-[#5DADE2] font-semibold">
            Se connecter
          </a>
        </p>

      </div>
    </div>
  );
}