"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { api } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import type { Article, ArticleCategorie, PaginatedResponse } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORIE_LABELS: Record<ArticleCategorie, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
) as Record<ArticleCategorie, string>;

interface FormState {
  name: string;
  categorie: ArticleCategorie | "";
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: "", categorie: "", is_active: true };

export default function ArticlesPage() {
  const { user, loading } = useAdminAuth();

  const [result, setResult] = useState<PaginatedResponse<Article> | null>(null);
  const [fetching, setFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [categorie, setCategorie] = useState("");
  const [onlyInactive, setOnlyInactive] = useState(false);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categorie) params.set("categorie", categorie);
    if (onlyInactive) params.set("active", "0");
    params.set("page", String(page));
    try {
      const data = await api.get<PaginatedResponse<Article>>(`/admin/articles?${params}`);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [search, categorie, onlyInactive, page]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal("create");
  }

  function openEdit(a: Article) {
    setEditing(a);
    setForm({ name: a.name, categorie: a.categorie, is_active: a.is_active });
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categorie) return;
    setFormLoading(true);
    try {
      if (modal === "create") {
        await api.post("/admin/articles", form);
      } else if (editing) {
        await api.put(`/admin/articles/${editing.id}`, form);
      }
      closeModal();
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggle(a: Article) {
    setActionLoading(a.id);
    try {
      await api.put(`/admin/articles/${a.id}`, { is_active: !a.is_active });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(a: Article) {
    if (!confirm(`Supprimer « ${a.name} » définitivement ?`)) return;
    setActionLoading(a.id);
    try {
      await api.delete(`/admin/articles/${a.id}`);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
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
            <h1 className="text-[#0A1E3D] text-2xl font-bold">Articles</h1>
            {result && (
              <p className="text-[#8694A7] text-sm mt-1">{result.total} article{result.total !== 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#2471A3] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvel article
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
                placeholder="Nom de l'article..."
                className="w-full border border-[#D1D8E0] rounded-md px-3 py-2 text-sm text-[#0A1E3D] focus:outline-none focus:border-[#2E86C1]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8694A7] mb-1">Catégorie</label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="border border-[#D1D8E0] rounded-md px-3 py-2 text-sm text-[#0A1E3D] focus:outline-none focus:border-[#2E86C1]"
              >
                <option value="">Toutes</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#1C1F26] cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={onlyInactive}
                onChange={(e) => setOnlyInactive(e.target.checked)}
                className="accent-[#2E86C1]"
              />
              Inactifs seulement
            </label>
            <button
              type="submit"
              className="bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#2471A3] transition-colors"
            >
              Filtrer
            </button>
          </form>
        </div>

        {fetching && <div className="text-[#8694A7] text-sm">Chargement...</div>}

        {result && !fetching && (
          <>
            <div className="bg-white rounded-lg border border-[#D1D8E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F0F2F5] border-b border-[#D1D8E0]">
                  <tr>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">Catégorie</th>
                    <th className="text-left text-xs font-semibold text-[#8694A7] uppercase tracking-wide px-4 py-3">État</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {result.data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-[#8694A7] py-8">Aucun article</td>
                    </tr>
                  )}
                  {result.data.map((a) => {
                    const isActing = actionLoading === a.id;
                    return (
                      <tr key={a.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3 font-semibold text-[#0A1E3D]">{a.name}</td>
                        <td className="px-4 py-3 text-[#0A1E3D]">{CATEGORIE_LABELS[a.categorie]}</td>
                        <td className="px-4 py-3">
                          {a.is_active ? (
                            <span className="bg-[#E6F2EC] text-[#1D8348] text-xs font-semibold px-2 py-0.5 rounded">Actif</span>
                          ) : (
                            <span className="bg-[#F0F2F5] text-[#8694A7] text-xs font-semibold px-2 py-0.5 rounded">Inactif</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              disabled={isActing}
                              onClick={() => openEdit(a)}
                              className="text-xs font-semibold text-[#2E86C1] hover:underline disabled:opacity-50"
                            >
                              Modifier
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleToggle(a)}
                              className="text-xs font-semibold text-[#D4860B] hover:underline disabled:opacity-50"
                            >
                              {a.is_active ? "Désactiver" : "Activer"}
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleDelete(a)}
                              className="text-xs font-semibold text-[#C0392B] hover:underline disabled:opacity-50"
                            >
                              Supprimer
                            </button>
                          </div>
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

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-[#D1D8E0] w-full max-w-md p-6 shadow-xl">
            <h2 className="text-[#0A1E3D] text-lg font-bold mb-4">
              {modal === "create" ? "Nouvel article" : "Modifier l'article"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8694A7] mb-1">Nom</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-[#D1D8E0] rounded-md px-3 py-2 text-sm text-[#0A1E3D] focus:outline-none focus:border-[#2E86C1]"
                  placeholder="Ex : Masque à oxygène"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8694A7] mb-1">Catégorie</label>
                <select
                  required
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value as ArticleCategorie }))}
                  className="w-full border border-[#D1D8E0] rounded-md px-3 py-2 text-sm text-[#0A1E3D] focus:outline-none focus:border-[#2E86C1]"
                >
                  <option value="">Choisir...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#1C1F26] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="accent-[#2E86C1]"
                />
                Actif
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-white border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#F0F2F5] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#2471A3] disabled:opacity-50 transition-colors"
                >
                  {formLoading ? "..." : modal === "create" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
