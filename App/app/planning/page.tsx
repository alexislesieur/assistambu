"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useGardeActive } from "@/hooks/useGardeActive";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Garde, PaginatedResponse } from "@/lib/types";

type GardeType = Garde["type"];

const TYPE_LABELS: Record<GardeType, string> = {
  jour:      "Jour",
  nuit:      "Nuit",
  garde_24h: "24h",
  astreinte: "Astreinte",
};

const TYPE_COLORS: Record<GardeType, { bg: string; text: string; border: string }> = {
  jour:      { bg: "bg-[#EBF5FB]", text: "text-[#1A5276]", border: "border-[#2E86C1]" },
  nuit:      { bg: "bg-[#EAF0F9]", text: "text-[#0A1E3D]", border: "border-[#0A1E3D]" },
  garde_24h: { bg: "bg-[#F4ECF7]", text: "text-[#6C3483]", border: "border-[#8E44AD]" },
  astreinte: { bg: "bg-[#FBF1E0]", text: "text-[#9A6B0B]", border: "border-[#D4860B]" },
};

interface StatsMensuel {
  mois: number;
  annee: number;
  nb_gardes: number;
  total_heures: number;
  nb_interventions: number;
  gardes_cloturees: number;
}

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

export default function PlanningPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { garde: gardeActive, refresh: refreshActive } = useGardeActive(user);

  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [gardes, setGardes] = useState<Garde[]>([]);
  const [stats, setStats] = useState<StatsMensuel | null>(null);
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [cloturerId, setCloturerId] = useState<number | null>(null);
  const [notesRecap, setNotesRecap] = useState("");

  const [showNouvelle, setShowNouvelle] = useState(false);
  const [nouvelleForm, setNouvelleForm] = useState({
    date: now.toISOString().slice(0, 10),
    heure_debut: "07:00",
    heure_fin: "19:00",
    type: "jour" as GardeType,
    binome: "",
  });
  const [creating, setCreating] = useState(false);

  async function handleCreer() {
    setCreating(true);
    try {
      await api.post("/gardes", {
        ...nouvelleForm,
        binome: nouvelleForm.binome || null,
      });
      setShowNouvelle(false);
      await load(mois, annee);
    } finally {
      setCreating(false);
    }
  }

  async function load(m: number, a: number) {
    setFetching(true);
    try {
      const [gardesRes, statsRes] = await Promise.all([
        api.get<PaginatedResponse<Garde>>(`/gardes?mois=${m}&annee=${a}`),
        api.get<StatsMensuel>(`/gardes/stats/mensuel?mois=${m}&annee=${a}`),
      ]);
      setGardes(gardesRes.data);
      setStats(statsRes);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load(mois, annee);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mois, annee]);

  function prevMois() {
    if (mois === 1) { setMois(12); setAnnee((a) => a - 1); }
    else setMois((m) => m - 1);
  }

  function nextMois() {
    if (mois === 12) { setMois(1); setAnnee((a) => a + 1); }
    else setMois((m) => m + 1);
  }

  async function handleDemarrer(gardeId: number) {
    setActionId(gardeId);
    try {
      await api.post(`/gardes/${gardeId}/demarrer`, {});
      await Promise.all([load(mois, annee), refreshActive()]);
    } finally {
      setActionId(null);
    }
  }

  async function handleCloturer() {
    if (!cloturerId) return;
    setActionId(cloturerId);
    try {
      const res = await api.post<{ garde: Garde; recap: unknown }>(`/gardes/${cloturerId}/cloturer`, { notes_recap: notesRecap || null });
      sessionStorage.setItem(`garde_recap_${cloturerId}`, JSON.stringify(res));
      setCloturerId(null);
      setNotesRecap("");
      router.push(`/garde/recap?id=${cloturerId}`);
    } catch {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  const gardesSorted = [...gardes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Planning" action={
        <button
          onClick={() => setShowNouvelle(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2E86C1] text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      } />

      <div className="px-4 py-5 space-y-4">

        <div className="flex items-center justify-between">
          <button
            onClick={prevMois}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="text-center">
            <div className="text-[#1C1F26] text-lg font-bold">{MOIS_FR[mois - 1]}</div>
            <div className="text-[#8694A7] text-xs">{annee}</div>
          </div>

          <button
            onClick={nextMois}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {stats && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#EBF5FB] rounded-lg">
                <div className="text-[#1A5276] font-bold text-xl font-mono">{stats.nb_gardes}</div>
                <div className="text-[#1A5276] text-xs font-semibold">Gardes</div>
              </div>
              <div className="text-center p-2 bg-[#E6F2EC] rounded-lg">
                <div className="text-[#1D8348] font-bold text-xl font-mono">{stats.total_heures}h</div>
                <div className="text-[#1D8348] text-xs font-semibold">Heures</div>
              </div>
              <div className="text-center p-2 bg-[#F4ECF7] rounded-lg">
                <div className="text-[#6C3483] font-bold text-xl font-mono">{stats.nb_interventions}</div>
                <div className="text-[#6C3483] text-xs font-semibold">Interv.</div>
              </div>
            </div>
          </div>
        )}

        {fetching && gardes.length === 0 && (
          <div className="text-center py-10 text-[#8694A7] text-sm">Chargement…</div>
        )}

        {!fetching && gardes.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
            <p className="text-[#8694A7] text-sm">Aucune garde ce mois-ci</p>
          </div>
        )}

        {gardesSorted.length > 0 && (
          <div className="space-y-2">
            {gardesSorted.map((garde) => {
              const colors = TYPE_COLORS[garde.type];
              const date = new Date(garde.date + "T12:00:00");
              const isRunning = gardeActive?.id === garde.id;

              return (
                <div
                  key={garde.id}
                  className={`bg-white rounded-xl border border-[#D1D8E0] border-l-4 ${isRunning ? "border-[#27AE60]" : colors.border} p-4`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#0A1E3D] font-bold text-sm">
                          {date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                          {TYPE_LABELS[garde.type]}
                        </span>
                        {isRunning && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[#E6F9ED] text-[#1D8348]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" />
                            En cours
                          </span>
                        )}
                        {garde.is_cloturee && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#E6F2EC] text-[#1D8348]">
                            Clôturée
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[#8694A7] text-xs">
                        <span className="font-mono">{garde.heure_debut} → {garde.heure_fin}</span>
                        <span>{garde.duree_heures}h</span>
                        {garde.interventions_count != null && garde.interventions_count > 0 && (
                          <span>{garde.interventions_count} interv.</span>
                        )}
                      </div>

                      {garde.binome && (
                        <div className="text-[#8694A7] text-xs mt-1">Binôme : {garde.binome}</div>
                      )}
                    </div>

                    {!garde.is_cloturee && (
                      <div className="shrink-0">
                        {isRunning ? (
                          <button
                            onClick={() => { setCloturerId(garde.id); setNotesRecap(""); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F9ECEA] text-[#C0392B] border border-[#F0C4C0]"
                          >
                            Clôturer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemarrer(garde.id)}
                            disabled={actionId === garde.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#E6F9ED] text-[#1D8348] border border-[#B2E0C4] disabled:opacity-50"
                          >
                            {actionId === garde.id ? "…" : "Démarrer"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {cloturerId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Clôturer la garde</h3>
            <p className="text-[#8694A7] text-sm">
              Un récapitulatif sera généré. Vous pouvez ajouter des notes.
            </p>
            <textarea
              value={notesRecap}
              onChange={(e) => setNotesRecap(e.target.value)}
              placeholder="Notes de fin de garde (facultatif)"
              rows={3}
              className="w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1] resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setCloturerId(null); setNotesRecap(""); }}
                className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleCloturer}
                disabled={actionId === cloturerId}
                className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white text-sm font-semibold disabled:opacity-50"
              >
                {actionId === cloturerId ? "Clôture…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNouvelle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Nouvelle garde</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={nouvelleForm.date}
                  onChange={(e) => setNouvelleForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Début</label>
                  <input
                    type="time"
                    value={nouvelleForm.heure_debut}
                    onChange={(e) => setNouvelleForm((f) => ({ ...f, heure_debut: e.target.value }))}
                    className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                  />
                </div>
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Fin</label>
                  <input
                    type="time"
                    value={nouvelleForm.heure_fin}
                    onChange={(e) => setNouvelleForm((f) => ({ ...f, heure_fin: e.target.value }))}
                    className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_LABELS) as GardeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNouvelleForm((f) => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-sm font-semibold border ${
                        nouvelleForm.type === t
                          ? `${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text} ${TYPE_COLORS[t].border}`
                          : "bg-white text-[#8694A7] border-[#D1D8E0]"
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Binôme (optionnel)</label>
                <input
                  type="text"
                  value={nouvelleForm.binome}
                  onChange={(e) => setNouvelleForm((f) => ({ ...f, binome: e.target.value }))}
                  placeholder="Prénom Nom"
                  className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNouvelle(false)}
                className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleCreer}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
