"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";

export default function ProfilPage() {
  const { user, loading } = useAuth();

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [profileInitialized, setProfileInitialized] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!profileInitialized && user) {
    setProfileForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    });
    setProfileInitialized(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "?";

  const memberSince = user
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : "";

  async function handleProfileSave() {
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      await api.put("/profile", {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave() {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.put("/password", passwordForm);
      setPasswordSuccess(true);
      setPasswordForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("assistambu_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${apiUrl}/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur" }));
        throw new Error(err.message);
      }
      logout();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Erreur");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Mon compte" />

      <div className="px-4 py-5 space-y-4">

        {/* Carte identité */}
        <div className="bg-[#0A1E3D] rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#2E86C1] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-lg leading-tight truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-[#8694A7] text-xs truncate">{user?.email}</div>
            <div className="flex items-center gap-2 mt-2">
              {user?.is_premium && (
                <span className="bg-[#D4AC0D]/20 text-[#D4AC0D] text-xs font-semibold px-2 py-0.5 rounded">
                  Premium
                </span>
              )}
            </div>
            <div className="text-[#8694A7] text-xs mt-1">Membre depuis {memberSince}</div>
          </div>
        </div>

        {/* Édition profil */}
        <div className="bg-white rounded-xl border border-[#D1D8E0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D1D8E0]">
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
              Modifier le profil
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#8694A7] font-semibold block mb-1">Prénom</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8694A7] font-semibold block mb-1">Nom</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#8694A7] font-semibold block mb-1">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>

            {profileError && (
              <p className="text-[#C0392B] text-xs">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-[#1D8348] text-xs font-semibold">Profil mis à jour.</p>
            )}

            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="w-full bg-[#2E86C1] text-white font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60"
            >
              {profileSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="bg-white rounded-xl border border-[#D1D8E0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D1D8E0]">
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
              Mot de passe
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-[#8694A7] font-semibold block mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8694A7] font-semibold block mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8694A7] font-semibold block mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={passwordForm.new_password_confirmation}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>

            {passwordError && (
              <p className="text-[#C0392B] text-xs">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-[#1D8348] text-xs font-semibold">Mot de passe mis à jour.</p>
            )}

            <button
              onClick={handlePasswordSave}
              disabled={passwordSaving}
              className="w-full bg-[#0A1E3D] text-white font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60"
            >
              {passwordSaving ? "Enregistrement..." : "Changer le mot de passe"}
            </button>
          </div>
        </div>

        {/* Zone danger */}
        <div className="bg-white rounded-xl border border-[#D1D8E0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D1D8E0]">
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
              Session & compte
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={logout}
              className="w-full border border-[#D1D8E0] text-[#1C1F26] font-semibold text-sm py-2.5 rounded-lg"
            >
              Se déconnecter
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full border border-[#C0392B] text-[#C0392B] font-semibold text-sm py-2.5 rounded-lg"
              >
                Supprimer mon compte
              </button>
            ) : (
              <div className="border border-[#C0392B] rounded-lg p-4 space-y-3">
                <p className="text-[#C0392B] text-xs font-semibold">
                  Action irréversible. Toutes les données seront supprimées.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Confirmer avec votre mot de passe"
                  className="w-full border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] bg-[#F8F9FA] focus:outline-none focus:border-[#C0392B] placeholder:text-[#C5CDD8]"
                />
                {deleteError && (
                  <p className="text-[#C0392B] text-xs">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword("");
                      setDeleteError(null);
                    }}
                    className="flex-1 border border-[#D1D8E0] text-[#8694A7] font-semibold text-sm py-2 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}
                    className="flex-1 bg-[#C0392B] text-white font-semibold text-sm py-2 rounded-lg disabled:opacity-60"
                  >
                    {deleteLoading ? "Suppression..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
