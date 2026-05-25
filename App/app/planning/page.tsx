"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGardeActive } from "@/hooks/useGardeActive";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Garde, PaginatedResponse } from "@/lib/types";

interface MaterielItem { name: string; qty_total: number }
interface CloturerResponse { recap: { materiel_sorti: MaterielItem[] } }

type GardeType = "commercial" | "garde_dep";
type VueType = "semaine" | "mois";

const TYPE_LABELS: Record<GardeType, string> = {
  commercial: "Commercial",
  garde_dep: "Garde dép.",
};

const TYPE_COLORS: Record<GardeType, { bg: string; text: string; border: string; dot: string }> = {
  commercial: { bg: "bg-[#EBF5FB]", text: "text-[#1A5276]", border: "border-[#2E86C1]", dot: "bg-[#2E86C1]" },
  garde_dep: { bg: "bg-[#F4ECF7]", text: "text-[#6C3483]", border: "border-[#8E44AD]", dot: "bg-[#8E44AD]" },
};

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DOW_LABELS = ["L","M","M","J","V","S","D"];

function amplitudeMin(g: Garde): number {
  const [dh, dm] = g.heure_debut.split(":").map(Number);
  const [fh, fm] = g.heure_fin.split(":").map(Number);
  let debut = dh * 60 + dm, fin = fh * 60 + fm;
  if (fin < debut) fin += 1440;
  return fin - debut;
}

function formatH(min: number): string {
  if (min <= 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function weekRangeLabel(ws: Date): string {
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  const mS = MOIS_FR[ws.getMonth()].slice(0, 3).toLowerCase();
  const mE = MOIS_FR[we.getMonth()].slice(0, 3).toLowerCase();
  if (ws.getMonth() === we.getMonth()) return `${ws.getDate()} – ${we.getDate()} ${mE}.`;
  return `${ws.getDate()} ${mS}. – ${we.getDate()} ${mE}.`;
}

function pctColor(pct: number): string {
  if (pct >= 100) return "bg-[#E74C3C]";
  if (pct >= 73) return "bg-[#F39C12]";
  return "bg-[#27AE60]";
}

function pctTextColor(pct: number): string {
  if (pct >= 100) return "text-[#E74C3C]";
  if (pct >= 73) return "text-[#F39C12]";
  return "text-[#1D8348]";
}

export default function PlanningPage() {
  const { user, loading } = useAuth();
  const { garde: gardeActive, refresh: refreshActive } = useGardeActive(user);

  const now = new Date();
  const [vue, setVue] = useState<VueType>("mois");
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [gardes, setGardes] = useState<Garde[]>([]);
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [cloturerId, setCloturerId] = useState<number | null>(null);
  const [notesRecap, setNotesRecap] = useState("");
  const [messageRearmement, setMessageRearmement] = useState<string | null>(null);
  const [showNouvelle, setShowNouvelle] = useState(false);
  const [nouvelleForm, setNouvelleForm] = useState({
    date: isoDate(now),
    heure_debut: "07:00",
    heure_fin: "19:00",
    type: "commercial" as GardeType,
    binome: "",
  });
  const [creating, setCreating] = useState(false);

  const mois = selectedDate.getMonth() + 1;
  const annee = selectedDate.getFullYear();

  async function load(m: number, a: number) {
    setFetching(true);
    try {
      const res = await api.get<PaginatedResponse<Garde>>(`/gardes?mois=${m}&annee=${a}`);
      setGardes(res.data);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load(mois, annee);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mois, annee]);

  function navigate(dir: -1 | 1) {
    const d = new Date(selectedDate);
    if (vue === "mois") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  }

  function navLabel(): string {
    if (vue === "mois") return `${MOIS_FR[mois - 1]} ${annee}`;
    const start = startOfWeek(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const mS = MOIS_FR[start.getMonth()].slice(0, 3).toLowerCase();
    const mE = MOIS_FR[end.getMonth()].slice(0, 3).toLowerCase();
    if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} ${mE}.`;
    return `${start.getDate()} ${mS}. – ${end.getDate()} ${mE}.`;
  }

  const gardesByDate = useMemo(() => {
    const map: Record<string, Garde[]> = {};
    gardes.forEach((g) => {
      if (!map[g.date]) map[g.date] = [];
      map[g.date].push(g);
    });
    return map;
  }, [gardes]);

  const gardesVisible = useMemo(() => {
    const all = [...gardes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (vue === "mois") return all;
    const start = startOfWeek(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return all.filter((g) => {
      const d = new Date(g.date + "T12:00:00");
      return d >= start && d <= end;
    });
  }, [gardes, vue, selectedDate]);

  const stats = useMemo(() => {
    const amplitude = gardesVisible.reduce((s, g) => s + amplitudeMin(g), 0);
    const tte = gardesVisible.reduce((s, g) => s + g.duree_minutes, 0);
    const pause = Math.max(0, amplitude - tte);
    return {
      nb: gardesVisible.length,
      amplitude,
      tte,
      pause,
      interventions: gardesVisible.reduce((s, g) => s + (g.interventions_count ?? 0), 0),
      ttePct48h: Math.min(100, Math.round((tte / 2880) * 100)),
    };
  }, [gardesVisible]);

  // Regroupement par semaine pour la vue mois
  const gardesByWeek = useMemo(() => {
    if (vue !== "mois") return [];
    const groups = new Map<string, { weekStart: Date; gardes: Garde[] }>();
    gardesVisible.forEach((g) => {
      const ws = startOfWeek(new Date(g.date + "T12:00:00"));
      const key = isoDate(ws);
      if (!groups.has(key)) groups.set(key, { weekStart: ws, gardes: [] });
      groups.get(key)!.gardes.push(g);
    });
    return Array.from(groups.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [gardesVisible, vue]);

  async function handleCreer() {
    setCreating(true);
    try {
      await api.post("/gardes", { ...nouvelleForm, binome: nouvelleForm.binome || null });
      setShowNouvelle(false);
      await load(mois, annee);
    } finally {
      setCreating(false);
    }
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
      const res = await api.post<CloturerResponse>(`/gardes/${cloturerId}/cloturer`, { notes_recap: notesRecap || null });
      const lignes = res.recap.materiel_sorti.length > 0
        ? res.recap.materiel_sorti.map((m) => `- ${m.name} × ${m.qty_total}`).join("\n")
        : "Aucun matériel consommé.";
      setCloturerId(null);
      setNotesRecap("");
      await Promise.all([load(mois, annee), refreshActive()]);
      setMessageRearmement(`Bonjour,\n\nVoici la liste du matériel utilisé pendant ma dernière garde :\n\n${lignes}\n\nMerci d'avance,\n${user?.first_name ?? ""}`);
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

  const todayStr = isoDate(now);

  // Cellules calendrier mois
  const calendarCells = (() => {
    const firstDay = new Date(annee, mois - 1, 1);
    const daysInMonth = new Date(annee, mois, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  // Jours de la semaine sélectionnée
  const weekDays = (() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  function GardeCard({ garde }: { garde: Garde }) {
    const colors = TYPE_COLORS[garde.type];
    const date = new Date(garde.date + "T12:00:00");
    const isRunning = gardeActive?.id === garde.id;

    return (
      <div className={`bg-white rounded-xl border border-[#D1D8E0] border-l-4 ${isRunning ? "border-[#27AE60]" : colors.border} p-4`}>
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
              <span>{formatH(garde.duree_minutes)}</span>
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
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Planning" />

      <div className="px-4 py-5 space-y-4">

        {/* Vue toggle */}
        <div className="flex rounded-xl bg-white border border-[#D1D8E0] p-1 gap-1">
          {(["semaine", "mois"] as VueType[]).map((v) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                vue === v ? "bg-[#0A1E3D] text-white" : "text-[#8694A7]"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="text-[#1C1F26] text-base font-bold">{navLabel()}</div>
          <button
            onClick={() => navigate(1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Calendrier mois */}
        {vue === "mois" && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-3">
            <div className="grid grid-cols-7 mb-1">
              {DOW_LABELS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-[#8694A7] py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={idx} className="h-9" />;
                const dateStr = `${annee}-${String(mois).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayGardes = gardesByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={idx}
                    className={`h-9 flex flex-col items-center justify-center rounded-lg ${isToday ? "bg-[#EBF5FB]" : ""}`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "text-[#2E86C1]" : "text-[#1C1F26]"}`}>{day}</span>
                    {dayGardes.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayGardes.slice(0, 2).map((g, i) => (
                          <span key={i} className={`w-1 h-1 rounded-full ${TYPE_COLORS[g.type].dot}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bande semaine */}
        {vue === "semaine" && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-3">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d, i) => {
                const dateStr = isoDate(d);
                const dayGardes = gardesByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center py-2 rounded-lg ${isToday ? "bg-[#EBF5FB]" : ""}`}
                  >
                    <span className="text-[10px] font-semibold text-[#8694A7]">{DOW_LABELS[i]}</span>
                    <span className={`text-sm font-bold ${isToday ? "text-[#2E86C1]" : "text-[#1C1F26]"}`}>
                      {d.getDate()}
                    </span>
                    {dayGardes.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayGardes.slice(0, 2).map((g, j) => (
                          <span key={j} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[g.type].dot}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats semaine : TTE vers 48h + détail */}
        {vue === "semaine" && gardesVisible.length > 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 text-center p-2 bg-[#EBF5FB] rounded-lg">
                <div className="text-[#1A5276] font-bold text-xl font-mono">{stats.nb}</div>
                <div className="text-[#1A5276] text-xs font-semibold">Gardes</div>
              </div>
              <div className="flex-1 text-center p-2 bg-[#F4ECF7] rounded-lg">
                <div className="text-[#6C3483] font-bold text-xl font-mono">{stats.interventions}</div>
                <div className="text-[#6C3483] text-xs font-semibold">Interv.</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-[#8694A7] uppercase tracking-wide">TTE semaine</span>
                <span className={`text-xs font-bold font-mono ${pctTextColor(stats.ttePct48h)}`}>
                  {formatH(stats.tte)} / 48h
                </span>
              </div>
              <div className="h-3 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pctColor(stats.ttePct48h)}`}
                  style={{ width: `${stats.ttePct48h}%` }}
                />
              </div>
              {stats.ttePct48h >= 100 && (
                <p className="text-[10px] text-[#E74C3C] font-semibold mt-1">Seuil légal 48h dépassé</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#F0F2F5]">
              <div className="text-center">
                <div className="text-[#1D8348] font-bold text-base font-mono">{formatH(stats.tte)}</div>
                <div className="text-[#8694A7] text-xs">TTE</div>
              </div>
              <div className="text-center border-x border-[#D1D8E0]">
                <div className="text-[#784212] font-bold text-base font-mono">{formatH(stats.pause)}</div>
                <div className="text-[#8694A7] text-xs">Pause</div>
              </div>
              <div className="text-center">
                <div className="text-[#7D6608] font-bold text-base font-mono">{formatH(stats.amplitude)}</div>
                <div className="text-[#8694A7] text-xs">Amplitude</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats mois : barre empilée TTE + Pause */}
        {vue === "mois" && gardesVisible.length > 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 text-center p-2 bg-[#EBF5FB] rounded-lg">
                <div className="text-[#1A5276] font-bold text-xl font-mono">{stats.nb}</div>
                <div className="text-[#1A5276] text-xs font-semibold">Gardes</div>
              </div>
              <div className="flex-1 text-center p-2 bg-[#F4ECF7] rounded-lg">
                <div className="text-[#6C3483] font-bold text-xl font-mono">{stats.interventions}</div>
                <div className="text-[#6C3483] text-xs font-semibold">Interv.</div>
              </div>
            </div>

            {stats.amplitude > 0 && (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-semibold text-[#8694A7] uppercase tracking-wide">Amplitude mensuelle</span>
                  <span className="text-xs font-bold font-mono text-[#7D6608]">{formatH(stats.amplitude)}</span>
                </div>
                <div className="h-3 bg-[#F0F2F5] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#27AE60] rounded-l-full"
                    style={{ width: `${Math.round((stats.tte / stats.amplitude) * 100)}%` }}
                  />
                  {stats.pause > 0 && (
                    <div
                      className="h-full bg-[#F39C12]"
                      style={{ width: `${Math.round((stats.pause / stats.amplitude) * 100)}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#27AE60] inline-block" />
                    <span className="text-xs text-[#8694A7]">TTE <span className="font-bold font-mono text-[#1D8348]">{formatH(stats.tte)}</span></span>
                  </div>
                  {stats.pause > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F39C12] inline-block" />
                      <span className="text-xs text-[#8694A7]">Pause <span className="font-bold font-mono text-[#784212]">{formatH(stats.pause)}</span></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {fetching && gardes.length === 0 && (
          <div className="text-center py-10 text-[#8694A7] text-sm">Chargement…</div>
        )}

        {!fetching && gardesVisible.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
            <p className="text-[#8694A7] text-sm">
              {vue === "semaine" ? "Aucune garde cette semaine" : "Aucune garde ce mois-ci"}
            </p>
          </div>
        )}

        {/* Liste semaine : flat */}
        {vue === "semaine" && gardesVisible.length > 0 && (
          <div className="space-y-2">
            {gardesVisible.map((garde) => <GardeCard key={garde.id} garde={garde} />)}
          </div>
        )}

        {/* Liste mois : regroupée par semaine */}
        {vue === "mois" && gardesByWeek.map(({ weekStart, gardes: wGardes }) => {
          const wTTE = wGardes.reduce((s, g) => s + g.duree_minutes, 0);
          const wAmp = wGardes.reduce((s, g) => s + amplitudeMin(g), 0);
          const wPause = Math.max(0, wAmp - wTTE);
          const wPct = Math.min(100, Math.round((wTTE / 2880) * 100));

          return (
            <div key={isoDate(weekStart)} className="space-y-2">
              <div className="bg-white rounded-xl border border-[#D1D8E0] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#0A1E3D]">{weekRangeLabel(weekStart)}</span>
                  <span className={`text-xs font-bold font-mono ${pctTextColor(wPct)}`}>
                    {formatH(wTTE)} TTE
                  </span>
                </div>
                <div className="h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(wPct)}`}
                    style={{ width: `${wPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-[#8694A7]">{wPct}% de 48h</span>
                  {wPause > 0 && (
                    <span className="text-[10px] text-[#8694A7]">{formatH(wPause)} pause</span>
                  )}
                </div>
              </div>

              {wGardes.map((garde) => <GardeCard key={garde.id} garde={garde} />)}
            </div>
          );
        })}

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

      {messageRearmement !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
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
                onClick={() => setMessageRearmement(null)}
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
