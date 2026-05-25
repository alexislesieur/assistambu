"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useGardeActive } from "@/hooks/useGardeActive";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Intervention, Garde } from "@/lib/types";

type GardeType = "commercial" | "garde_dep";

const TYPE_LABELS: Record<GardeType, string> = {
  commercial: "Commercial",
  garde_dep:  "Garde dép.",
};

interface MaterielItem {
  name: string;
  qty_total: number;
}

interface CloturerResponse {
  garde: Garde;
  recap: {
    materiel_sorti: MaterielItem[];
  };
}

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

function getGardeEndDatetime(garde: Garde): Date {
  const fin = garde.heure_fin.slice(0, 5);
  const debut = garde.heure_debut.slice(0, 5);
  const end = new Date(`${garde.date}T${fin}:00`);
  const start = new Date(`${garde.date}T${debut}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return end;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { garde: gardeActive, refresh: refreshActive } = useGardeActive(user);
  const [sacStats, setSacStats] = useState<SacStats | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [cloturage, setCloturage] = useState(false);
  const [showCloturer, setShowCloturer] = useState(false);
  const [notesRecap, setNotesRecap] = useState("");
  const [heureFinReelle, setHeureFinReelle] = useState("");
  const [pauses, setPauses] = useState<{ debut: string; fin: string }[]>([]);
  const [messageRearmement, setMessageRearmement] = useState<string | null>(null);

  const now = new Date();
  const [showNouvelle, setShowNouvelle] = useState(false);
  const [nouvelleForm, setNouvelleForm] = useState({
    date: now.toISOString().slice(0, 10),
    heure_debut: "07:00",
    heure_fin: "19:00",
    type: "commercial" as GardeType,
    binome: "",
  });
  const [creating, setCreating] = useState(false);

  async function handleDemarrerNouvelle() {
    setCreating(true);
    try {
      const garde = await api.post<Garde>("/gardes", {
        ...nouvelleForm,
        binome: nouvelleForm.binome || null,
      });
      await api.post(`/gardes/${garde.id}/demarrer`, {});
      setShowNouvelle(false);
      await refreshActive();
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!gardeActive) return;
    const end = getGardeEndDatetime(gardeActive);
    const delay = end.getTime() - Date.now();
    if (delay <= 0) return;
    const id = setTimeout(async () => {
      try {
        await api.post(`/gardes/${gardeActive.id}/cloturer`, {});
        await refreshActive();
      } catch { /* déjà clôturée */ }
    }, delay);
    return () => clearTimeout(id);
  }, [gardeActive?.id, gardeActive?.heure_fin, gardeActive?.date]);

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

  const heure = now.getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="AssistAmbu" />

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

        <div className="bg-[#0A1E3D] rounded-xl p-4">
          {!gardeActive ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#8694A7]" />
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  Garde
                </span>
              </div>
              <button
                onClick={() => setShowNouvelle(true)}
                className="w-full bg-[#2E86C1] text-white text-sm font-semibold py-3 rounded-lg"
              >
                Démarrer une garde
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  Garde en cours
                </span>
              </div>
              <div className="text-[#8694A7] text-xs mb-1">
                {TYPE_LABELS[gardeActive.type as GardeType] ?? gardeActive.type} · {gardeActive.heure_debut} → {gardeActive.heure_fin}
              </div>
              {gardeActive.binome && (
                <div className="text-[#8694A7] text-xs mb-3">Binôme : {gardeActive.binome}</div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#8694A7] text-xs font-mono">
                  {gardeActive.interventions_count ?? 0} intervention{(gardeActive.interventions_count ?? 0) > 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCloturer(true); setNotesRecap(""); setHeureFinReelle(gardeActive.heure_fin.slice(0, 5)); setPauses([]); }}
                    disabled={cloturage}
                    className="bg-white/10 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {cloturage ? "…" : "Fin de garde"}
                  </button>
                  <button
                    onClick={() => router.push(`/garde/intervention/nouvelle?garde_id=${gardeActive.id}`)}
                    className="bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-lg"
                  >
                    + Intervention
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#0A1E3D] font-bold text-sm uppercase tracking-wide">
              Dernières interventions
            </h3>
            <button
              onClick={() => router.push("/interventions")}
              className="text-[#2E86C1] text-xs font-semibold"
            >
              Voir tout
            </button>
          </div>

          {interventions.length === 0 && (
            <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
              <p className="text-[#8694A7] text-sm">Aucune intervention enregistrée</p>
              <button
                onClick={() => router.push("/interventions/nouvelle")}
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

      {showCloturer && gardeActive && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end overflow-y-auto">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 mt-auto">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Clôturer la garde</h3>

            <div>
              <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Heure de fin réelle</label>
              <input
                type="time"
                value={heureFinReelle}
                onChange={(e) => setHeureFinReelle(e.target.value)}
                className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Pauses</label>
                <button
                  onClick={() => setPauses((p) => [...p, { debut: "", fin: "" }])}
                  className="text-[#2E86C1] text-xs font-semibold"
                >
                  + Ajouter
                </button>
              </div>
              {pauses.length === 0 && (
                <p className="text-[#8694A7] text-xs">Aucune pause</p>
              )}
              <div className="space-y-2">
                {pauses.map((pause, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={pause.debut}
                      onChange={(e) => setPauses((p) => p.map((x, j) => j === i ? { ...x, debut: e.target.value } : x))}
                      className="flex-1 border border-[#D1D8E0] rounded-xl px-3 py-2 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                    />
                    <span className="text-[#8694A7] text-xs">→</span>
                    <input
                      type="time"
                      value={pause.fin}
                      onChange={(e) => setPauses((p) => p.map((x, j) => j === i ? { ...x, fin: e.target.value } : x))}
                      className="flex-1 border border-[#D1D8E0] rounded-xl px-3 py-2 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
                    />
                    <button
                      onClick={() => setPauses((p) => p.filter((_, j) => j !== i))}
                      className="text-[#C0392B] text-xs font-bold px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <textarea
              value={notesRecap}
              onChange={(e) => setNotesRecap(e.target.value)}
              placeholder="Notes de fin de garde (facultatif)"
              rows={2}
              className="w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1] resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloturer(false)}
                className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setCloturage(true);
                  setShowCloturer(false);
                  try {
                    const res = await api.post<CloturerResponse>(`/gardes/${gardeActive.id}/cloturer`, {
                      notes_recap: notesRecap || null,
                      heure_fin_reelle: heureFinReelle || null,
                      pauses: pauses.filter((p) => p.debut && p.fin),
                    });
                    const lignes = res.recap.materiel_sorti.length > 0
                      ? res.recap.materiel_sorti.map((m) => `- ${m.name} × ${m.qty_total}`).join("\n")
                      : "Aucun matériel consommé.";
                    setMessageRearmement(`Bonjour,\n\nVoici la liste du matériel utilisé pendant ma dernière garde :\n\n${lignes}\n\nMerci d'avance,\n${user?.first_name ?? ""}`);
                  } finally {
                    setCloturage(false);
                  }
                }}
                disabled={cloturage}
                className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white text-sm font-semibold disabled:opacity-50"
              >
                {cloturage ? "Clôture…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNouvelle && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Démarrer une garde</h3>

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
                          ? "bg-[#EBF5FB] text-[#1A5276] border-[#2E86C1]"
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
                onClick={handleDemarrerNouvelle}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold disabled:opacity-50"
              >
                {creating ? "Démarrage…" : "Démarrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {messageRearmement !== null && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Réarmement du sac</h3>
            <p className="text-[#8694A7] text-sm">Message prêt à envoyer à votre gestionnaire matériel.</p>
            <textarea
              readOnly
              value={messageRearmement}
              rows={8}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] bg-[#F8FAFB] resize-none outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(messageRearmement)}
                className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold"
              >
                Copier
              </button>
              <button
                onClick={async () => { setMessageRearmement(null); await refreshActive(); }}
                className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
