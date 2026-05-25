"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { SacItem } from "@/lib/types";

type Categorie = SacItem["categorie"];
type Status = SacItem["status"];

interface CatGroup {
  items: SacItem[];
  total: number;
  conformes: number;
  alertes: number;
  epuises: number;
}

interface SacStats {
  total_items: number;
  conformes: number;
  alertes: number;
  epuises: number;
  taux_conformite: number;
}

interface SacResponse {
  categories: Partial<Record<Categorie, CatGroup>>;
  stats: SacStats;
}

const CATEGORIE_LABELS: Record<Categorie, string> = {
  oxygenotherapie: "Oxygénothérapie",
  pansements: "Pansements",
  immobilisation: "Immobilisation",
  medicaments: "Médicaments",
  monitoring: "Monitoring",
  autre: "Autre",
};

const CATEGORIE_ORDER: Categorie[] = [
  "oxygenotherapie",
  "medicaments",
  "monitoring",
  "pansements",
  "immobilisation",
  "autre",
];

const STATUS_STYLE: Record<Status, { bg: string; text: string; label: string; bar: string }> = {
  ok:      { bg: "bg-[#E6F2EC]", text: "text-[#1D8348]", label: "OK",      bar: "bg-[#1D8348]" },
  warning: { bg: "bg-[#FBF1E0]", text: "text-[#D4860B]", label: "Alerte",  bar: "bg-[#D4860B]" },
  danger:  { bg: "bg-[#F9ECEA]", text: "text-[#C0392B]", label: "Épuisé",  bar: "bg-[#C0392B]" },
};

function parseDlc(dlc: string): Date {
  const [dd, mm, yyyy] = dlc.split('/');
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
}

function formatDlc(dlc: string | null): string | null {
  if (!dlc) return null;
  return dlc;
}

function isDlcSoon(dlc: string | null): boolean {
  if (!dlc) return false;
  const diff = parseDlc(dlc).getTime() - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 30;
}

function isDlcPast(dlc: string | null): boolean {
  if (!dlc) return false;
  return parseDlc(dlc).getTime() < Date.now();
}

interface Lot {
  qty: string;
  dlc: string;
}

interface RearmModal {
  itemId: number | null;
  lots: Lot[];
  saving: boolean;
}

function toApiDlc(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export default function SacPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<SacResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [rearm, setRearm] = useState<RearmModal | null>(null);

  async function load() {
    const res = await api.get<SacResponse>("/sac");
    setData(res);
    const hasIssues = res.stats.alertes > 0 || res.stats.epuises > 0;
    if (hasIssues) {
      setOpenCats(
        new Set(
          CATEGORIE_ORDER.filter((c) => {
            const g = res.categories[c];
            return g && (g.alertes > 0 || g.epuises > 0);
          })
        )
      );
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await api.put<{ checked_at: string }>("/sac/check", {});
      setCheckedAt(res.checked_at);
      await load();
    } finally {
      setChecking(false);
    }
  }

  function toggleCat(cat: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function openRearm() {
    setRearm({ itemId: null, lots: [{ qty: "", dlc: "" }], saving: false });
  }

  async function handleRearm() {
    if (!rearm || !rearm.itemId) return;
    const valid = rearm.lots.filter((l) => l.qty && parseInt(l.qty) > 0);
    if (valid.length === 0) return;
    setRearm((r) => r && { ...r, saving: true });
    try {
      await api.post(`/sac/items/${rearm.itemId}/restock`, {
        lots: valid.map((l) => ({
          qty: parseInt(l.qty),
          dlc: l.dlc ? toApiDlc(l.dlc) : null,
        })),
      });
      setRearm(null);
      await load();
    } finally {
      setRearm((r) => r && { ...r, saving: false });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Sac d'intervention" />

      <div className="px-4 py-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-[#1C1F26] text-xl font-bold">Sac d&apos;intervention</h2>
          {stats && (
            <span className={`text-xs font-semibold px-2 py-1 rounded ${
              stats.taux_conformite >= 80
                ? "bg-[#E6F2EC] text-[#1D8348]"
                : stats.taux_conformite >= 50
                ? "bg-[#FBF1E0] text-[#D4860B]"
                : "bg-[#F9ECEA] text-[#C0392B]"
            }`}>
              {stats.taux_conformite}% conforme
            </span>
          )}
        </div>

        {stats && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#E6F2EC] rounded-lg">
                <div className="text-[#1D8348] font-bold text-2xl font-mono">{stats.conformes}</div>
                <div className="text-[#1D8348] text-xs font-semibold">OK</div>
              </div>
              <div className="text-center p-2 bg-[#FBF1E0] rounded-lg">
                <div className="text-[#D4860B] font-bold text-2xl font-mono">{stats.alertes}</div>
                <div className="text-[#D4860B] text-xs font-semibold">Alertes</div>
              </div>
              <div className="text-center p-2 bg-[#F9ECEA] rounded-lg">
                <div className="text-[#C0392B] font-bold text-2xl font-mono">{stats.epuises}</div>
                <div className="text-[#C0392B] text-xs font-semibold">Épuisés</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCheck}
                disabled={checking}
                className="bg-[#2E86C1] text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50"
              >
                {checking ? "Vérification…" : "Marquer comme vérifié"}
              </button>
              <button
                onClick={openRearm}
                className="bg-[#E6F2EC] text-[#1D8348] text-sm font-semibold py-2.5 rounded-lg"
              >
                Réarmer
              </button>
            </div>

            {checkedAt && (
              <p className="text-center text-xs text-[#1D8348]">
                Vérifié à {new Date(checkedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}

        {data && CATEGORIE_ORDER.map((cat) => {
          const group = data.categories[cat];
          if (!group) return null;

          const open = openCats.has(cat);
          const hasIssue = group.alertes > 0 || group.epuises > 0;

          return (
            <div key={cat} className="bg-white rounded-xl border border-[#D1D8E0] overflow-hidden">
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#0A1E3D] font-bold text-sm">{CATEGORIE_LABELS[cat]}</span>
                  {hasIssue && (
                    <span className="w-2 h-2 rounded-full bg-[#C0392B]" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8694A7] text-xs">{group.total} articles</span>
                  <svg
                    className={`text-[#8694A7] transition-transform ${open ? "rotate-180" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {open && (
                <div className="border-t border-[#D1D8E0] divide-y divide-[#F0F2F5]">
                  {group.items.map((item) => {
                    const style = STATUS_STYLE[item.status];
                    const dlcStr = formatDlc(item.dlc);
                    const dlcPast = isDlcPast(item.dlc);
                    const dlcSoon = isDlcSoon(item.dlc);

                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[#1C1F26] text-sm font-medium">{item.name}</span>
                            {item.note && (
                              <p className="text-[#8694A7] text-xs mt-0.5 truncate">{item.note}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-[#8694A7]">
                            <span>{item.qty_current} / {item.qty_max}</span>
                            <span>{item.qty_pct}%</span>
                          </div>
                          <div className="h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${style.bar}`}
                              style={{ width: `${item.qty_pct}%` }}
                            />
                          </div>

                          {dlcStr && (
                            <div className={`text-xs font-medium ${
                              dlcPast ? "text-[#C0392B]" : dlcSoon ? "text-[#D4860B]" : "text-[#8694A7]"
                            }`}>
                              DLC {dlcStr}{dlcPast ? " — expiré" : dlcSoon ? " — bientôt" : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {data && Object.keys(data.categories).length === 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
            <p className="text-[#8694A7] text-sm">Aucun article dans le sac</p>
          </div>
        )}

      </div>

      {rearm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end overflow-y-auto">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 mt-auto">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Réarmement</h3>

            <div>
              <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Article</label>
              <select
                value={rearm.itemId ?? ""}
                onChange={(e) => setRearm((r) => r && { ...r, itemId: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1] bg-white"
              >
                <option value="">Sélectionner un article…</option>
                {data && CATEGORIE_ORDER.flatMap((cat) => {
                  const group = data.categories[cat];
                  if (!group) return [];
                  return [
                    <option key={`cat-${cat}`} disabled className="text-[#8694A7] font-semibold">
                      — {CATEGORIE_LABELS[cat]} —
                    </option>,
                    ...group.items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    )),
                  ];
                })}
              </select>
            </div>

            <div className="space-y-2">
              {rearm.lots.map((lot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={lot.qty}
                    onChange={(e) =>
                      setRearm((r) => r && {
                        ...r,
                        lots: r.lots.map((l, j) => j === i ? { ...l, qty: e.target.value } : l),
                      })
                    }
                    placeholder="Qté"
                    className="w-20 border border-[#D1D8E0] rounded-xl px-3 py-2 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                  />
                  <input
                    type="date"
                    value={lot.dlc}
                    onChange={(e) =>
                      setRearm((r) => r && {
                        ...r,
                        lots: r.lots.map((l, j) => j === i ? { ...l, dlc: e.target.value } : l),
                      })
                    }
                    className="flex-1 border border-[#D1D8E0] rounded-xl px-3 py-2 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                  />
                  {rearm.lots.length > 1 && (
                    <button
                      onClick={() => setRearm((r) => r && { ...r, lots: r.lots.filter((_, j) => j !== i) })}
                      className="text-[#C0392B] text-sm font-bold px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setRearm((r) => r && { ...r, lots: [...r.lots, { qty: "", dlc: "" }] })}
              className="text-[#2E86C1] text-sm font-semibold"
            >
              + Ajouter un lot
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setRearm(null)}
                className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleRearm}
                disabled={rearm.saving}
                className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold disabled:opacity-50"
              >
                {rearm.saving ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
