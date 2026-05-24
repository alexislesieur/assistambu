"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { api, download } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import type { AdminUser, PaginatedResponse } from "@/lib/types";

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

export default function UtilisateursPage() {
  const { user, loading } = useAdminAuth();

  const [result, setResult] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [fetching, setFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const [premium, setPremium] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setFetching(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (locked) params.set("locked", "1");
    if (premium) params.set("premium", "1");
    params.set("page", String(page));
    try {
      const data = await api.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [search, locked, premium, page]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  async function handleLock(u: AdminUser) {
    const reason = window.prompt(`Raison du blocage de ${u.first_name} ${u.last_name} :`) ?? "";
    if (reason === null) return;
    setActionLoading(u.id);
    try {
      await api.put(`/admin/users/${u.id}/lock`, { reason });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnlock(u: AdminUser) {
    if (!confirm(`Réactiver le compte de ${u.first_name} ${u.last_name} ?`)) return;
    setActionLoading(u.id);
    try {
      await api.put(`/admin/users/${u.id}/unlock`, {});
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePremium(u: AdminUser, value: boolean) {
    setActionLoading(u.id);
    try {
      await api.put(`/admin/users/${u.id}/premium`, { is_premium: value });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Supprimer définitivement ${u.first_name} ${u.last_name} (${u.email}) ?`)) return;
    setActionLoading(u.id);
    try {
      await api.delete(`/admin/users/${u.id}`);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExport() {
    try {
      await download("/admin/users/export", `users_${new Date().toISOString().split("T")[0]}.csv`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur export");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#0A1E3D] text-2xl font-bold">Utilisateurs</h1>
            {result && (
              <p className="text-[#8694A7] text-sm mt-1">{result.total} compte{result.total !== 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#F0F2F5] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exporter CSV
          </button>
        </div>

        <div className="bg-white rounded-lg border border-[#D1D8E0] p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
            className="flex flex-wrap gap-3 items-end"
          >
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-[#8694A7] mb-1">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, prénom, email..."
                className="w-full border border-[#D1D8E0] rounded-md px-3 py-2 text-sm text-[#0A1E3D] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#1C1F26] cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
                className="accent-[#2E86C1]"
              />
              Bloqués
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1C1F26] cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={premium}
                onChange={(e) => setPremium(e.target.checked)}
                className="accent-[#2E86C1]"
              />
              Premium
            </label>
            <button
              type="submit"
              className="bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#2471A3] transition-colors"
            >
              Filtrer
            </button>
          </form>
        </div>

        {fetching && (
          <div className="text-[#8694A7] text-sm">Chargement...</div>
        )}

        {result && !fetching && (
          <>
            <div className="bg-white rounded-lg border border-[#D1D8E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F0F2F5] border-b border-[#D1D8E0]">
                  <tr>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Utilisateur</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Premium</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">État</th>
                    <th className="text-right text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Interv.</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Connexion</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Inscrit</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {result.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-[#8694A7] py-8">
                        Aucun utilisateur
                      </td>
                    </tr>
                  )}
                  {result.data.map((u) => {
                    const isActing = actionLoading === u.id;
                    const isDeleted = !!u.deleted_at;
                    return (
                      <tr
                        key={u.id}
                        className={isDeleted ? "opacity-50" : "hover:bg-[#F9FAFB]"}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#0A1E3D]">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-[#8694A7] text-xs">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {u.is_premium ? (
                            <span className="bg-[#E6F2EC] text-[#1D8348] text-xs font-semibold px-2 py-0.5 rounded">
                              Premium
                            </span>
                          ) : (
                            <span className="text-[#8694A7] text-xs">Free</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isDeleted ? (
                            <span className="bg-[#F9ECEA] text-[#C0392B] text-xs font-semibold px-2 py-0.5 rounded">
                              Supprimé
                            </span>
                          ) : u.is_locked ? (
                            <span className="bg-[#FBF1E0] text-[#D4860B] text-xs font-semibold px-2 py-0.5 rounded">
                              Bloqué
                            </span>
                          ) : (
                            <span className="bg-[#E6F2EC] text-[#1D8348] text-xs font-semibold px-2 py-0.5 rounded">
                              Actif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#0A1E3D]">
                          {u.interventions_count}
                        </td>
                        <td className="px-4 py-3 text-[#8694A7] font-mono text-xs">
                          {fmt(u.last_login_at)}
                        </td>
                        <td className="px-4 py-3 text-[#8694A7] font-mono text-xs">
                          {fmt(u.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {!isDeleted && (
                            <div className="flex items-center gap-2 justify-end">
                              {u.is_locked ? (
                                <button
                                  disabled={isActing}
                                  onClick={() => handleUnlock(u)}
                                  className="text-xs font-semibold text-[#1D8348] hover:underline disabled:opacity-50"
                                >
                                  Réactiver
                                </button>
                              ) : (
                                <button
                                  disabled={isActing}
                                  onClick={() => handleLock(u)}
                                  className="text-xs font-semibold text-[#D4860B] hover:underline disabled:opacity-50"
                                >
                                  Bloquer
                                </button>
                              )}
                              <button
                                disabled={isActing}
                                onClick={() => handlePremium(u, !u.is_premium)}
                                className="text-xs font-semibold text-[#2E86C1] hover:underline disabled:opacity-50"
                              >
                                {u.is_premium ? "Retirer premium" : "Mettre premium"}
                              </button>
                              <button
                                disabled={isActing}
                                onClick={() => handleDelete(u)}
                                className="text-xs font-semibold text-[#C0392B] hover:underline disabled:opacity-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.last_page > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-[#8694A7] text-sm">
                  Page {result.current_page} / {result.last_page}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={result.current_page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="bg-white border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-[#F0F2F5] disabled:opacity-40 transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={result.current_page >= result.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="bg-white border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-[#F0F2F5] disabled:opacity-40 transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </AdminLayout>
  );
}
