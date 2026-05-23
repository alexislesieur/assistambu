"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Intervention } from "@/lib/types";

interface SacStats {
  total_items: number;
  conformes: number;
  alertes: number;
  epuises: number;
  taux_conformite: number;
}

interface SacResponse {
  stats: SacStats;
}

interface InterventionsResponse {
  data: Intervention[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [sacStats, setSacStats] = useState<SacStats | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<SacResponse>("/sac").then((res) => setSacStats(res.stats));
    api.get<InterventionsResponse>("/interventions?per_page=3").then((res) => setInterventions(res.data));
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  const now = new Date();
  const heure = now.getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="AssistAmbu" user={user} />

      <div className="px-4 py-5 space-y-4">

        <div>
          <h2 className="text-[#1C1F26] text-xl font-bold">
            {salutation}, {user?.first_name} 👋
          </h2>
          <p className="text-[#8694A7] text-sm mt-1">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {sacStats && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
                Sac médical
              </h3>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                sacStats.taux_conformite >= 80
                  ? "bg-[#E6F2EC] text-[#1D8348]"
                  : sacStats.taux_conformite >= 50
                  ? "bg-[#FBF1E0] text-[#D4860B]"
                  : "bg-[#F9ECEA] text-[#C0392B]"
              }`}>
                {sacStats.taux_conformite}% conforme
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#E6F2EC] rounded-lg">
                <div className="text-[#1D8348] font-bold text-xl font-mono">{sacStats.conformes}</div>
                <div className="text-[#1D8348] text-xs font-semibold">OK</div>
              </div>
              <div className="text-center p-2 bg-[#FBF1E0] rounded-lg">
                <div className="text-[#D4860B] font-bold text-xl font-mono">{sacStats.alertes}</div>
                <div className="text-[#D4860B] text-xs font-semibold">Alertes</div>
              </div>
              <div className="text-center p-2 bg-[#F9ECEA] rounded-lg">
                <div className="text-[#C0392B] font-bold text-xl font-mono">{sacStats.epuises}</div>
                <div className="text-[#C0392B] text-xs font-semibold">Épuisés</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
              Dernières interventions
            </h3>
            <button
              onClick={() => window.location.href = "/interventions"}
              className="text-[#2E86C1] text-xs font-semibold"
            >
              Voir tout
            </button>
          </div>

          {interventions.length === 0 && (
            <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
              <p className="text-[#8694A7] text-sm">Aucune intervention enregistrée</p>
              <button
                onClick={() => window.location.href = "/interventions/nouvelle"}
                className="mt-3 inline-block bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Nouvelle intervention
              </button>
            </div>
          )}

          {interventions.length > 0 && (
            <div className="space-y-2">
              {interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="bg-white rounded-xl border-l-4 border-[#2E86C1] border border-[#D1D8E0] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#0A1E3D] font-bold text-sm">{intervention.motif}</div>
                      <div className="text-[#8694A7] text-xs mt-1">
                        {intervention.destination ?? "Destination non renseignée"}
                      </div>
                    </div>
                    <div className="text-[#8694A7] text-xs font-mono">
                      {new Date(intervention.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}