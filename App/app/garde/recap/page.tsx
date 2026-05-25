"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import type { Garde } from "@/lib/types";

interface InterventionBrief {
  id: number;
  motif: string;
  categorie: string;
  destination: string | null;
  created_at: string;
}

interface MaterielSorti {
  name: string;
  qty_total: number;
}

interface Recap {
  nb_interventions: number;
  interventions: InterventionBrief[];
  materiel_sorti: MaterielSorti[];
  duree_heures: number;
}

interface RecapData {
  garde: Garde;
  recap: Recap;
}

const CATEGORIE_COLORS: Record<string, { bg: string; text: string }> = {
  respi:       { bg: "bg-[#EBF5FB]", text: "text-[#1A5276]" },
  cardio:      { bg: "bg-[#FDEDEC]", text: "text-[#922B21]" },
  trauma:      { bg: "bg-[#FEF9E7]", text: "text-[#9A6B0B]" },
  neuro:       { bg: "bg-[#F4ECF7]", text: "text-[#6C3483]" },
  pediatrie:   { bg: "bg-[#FDEEF4]", text: "text-[#943D7C]" },
  psychiatrie: { bg: "bg-[#E8F8F5]", text: "text-[#1A7A6A]" },
  autre:       { bg: "bg-[#F2F3F4]", text: "text-[#5D6D7E]" },
};

const TYPE_LABELS: Record<string, string> = {
  commercial: "Commercial",
  garde_dep:  "Garde dép.",
};

export default function GardeRecapPage() {
  return (
    <Suspense>
      <GardeRecapContent />
    </Suspense>
  );
}

function GardeRecapContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gardeId = searchParams.get("id");

  const [data, setData] = useState<RecapData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !gardeId) return;

    const cached = sessionStorage.getItem(`garde_recap_${gardeId}`);
    if (cached) {
      try {
        setData(JSON.parse(cached) as RecapData);
        setFetching(false);
        return;
      } catch {
        // fallthrough
      }
    }

    api.get<Garde>(`/gardes/${gardeId}`)
      .then((garde) => {
        setData({
          garde,
          recap: {
            nb_interventions: garde.interventions_count ?? 0,
            interventions: [],
            materiel_sorti: [],
            duree_heures: Math.round((garde.duree_minutes / 60) * 10) / 10,
          },
        });
      })
      .catch(() => setError("Impossible de charger le récapitulatif."))
      .finally(() => setFetching(false));
  }, [user, gardeId]);

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F0F2F5]">
        <MobileHeader title="Récapitulatif" />
        <div className="px-4 py-10 text-center text-[#8694A7] text-sm">{error ?? "Garde introuvable."}</div>
      </div>
    );
  }

  const { garde, recap } = data;
  const date = new Date(garde.date + "T12:00:00");

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-10">
      <MobileHeader title="Récapitulatif" />

      <div className="px-4 py-5 space-y-4">

        <div className="bg-[#0A1E3D] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#27AE60]" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">Garde clôturée</span>
          </div>
          <div className="text-[#8694A7] text-sm mt-2">
            {TYPE_LABELS[garde.type]} · {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div className="text-[#8694A7] text-sm">{garde.heure_debut} → {garde.heure_fin}</div>
          {garde.binome && (
            <div className="text-[#8694A7] text-sm mt-1">Binôme : {garde.binome}</div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-white font-bold text-2xl font-mono">{recap.duree_heures}h</div>
              <div className="text-[#8694A7] text-xs mt-1">Durée</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-white font-bold text-2xl font-mono">{recap.nb_interventions}</div>
              <div className="text-[#8694A7] text-xs mt-1">
                Intervention{recap.nb_interventions > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {recap.interventions.length > 0 && (
          <div>
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide mb-2">
              Interventions
            </h3>
            <div className="space-y-2">
              {recap.interventions.map((interv) => {
                const cat = CATEGORIE_COLORS[interv.categorie] ?? CATEGORIE_COLORS.autre;
                return (
                  <div key={interv.id} className="bg-white rounded-xl border border-[#D1D8E0] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[#0A1E3D] font-bold text-sm truncate">{interv.motif}</div>
                        {interv.destination && (
                          <div className="text-[#8694A7] text-xs mt-0.5 truncate">{interv.destination}</div>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${cat.bg} ${cat.text}`}>
                        {interv.categorie}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recap.materiel_sorti.length > 0 && (
          <div>
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide mb-2">
              Matériel consommé
            </h3>
            <div className="bg-white rounded-xl border border-[#D1D8E0] divide-y divide-[#F0F2F5]">
              {recap.materiel_sorti.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[#1C1F26] text-sm">{item.name}</span>
                  <span className="text-[#8694A7] text-sm font-mono">×{item.qty_total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {garde.notes_recap && (
          <div>
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide mb-2">Notes</h3>
            <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 text-[#1C1F26] text-sm whitespace-pre-wrap">
              {garde.notes_recap}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 bg-[#2E86C1] text-white text-sm font-semibold rounded-xl"
        >
          Retour au tableau de bord
        </button>

      </div>
    </div>
  );
}
