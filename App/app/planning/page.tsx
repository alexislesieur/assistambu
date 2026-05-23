"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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

  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [gardes, setGardes] = useState<Garde[]>([]);
  const [stats, setStats] = useState<StatsMensuel | null>(null);
  const [fetching, setFetching] = useState(false);

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
      <MobileHeader title="Planning" user={user} />

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
              return (
                <div
                  key={garde.id}
                  className={`bg-white rounded-xl border border-[#D1D8E0] border-l-4 ${colors.border} p-4`}
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

                      {(garde.vehicule || garde.service || garde.binome) && (
                        <div className="flex gap-3 mt-1 text-[#8694A7] text-xs flex-wrap">
                          {garde.vehicule && <span>{garde.vehicule}</span>}
                          {garde.service && <span>{garde.service}</span>}
                          {garde.binome && <span>Binôme: {garde.binome}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
