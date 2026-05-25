"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGardeActive } from "@/hooks/useGardeActive";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Garde, PaginatedResponse, RecurrenceFrequence } from "@/lib/types";

interface MaterielItem { name: string; qty_total: number }
interface CloturerResponse { recap: { materiel_sorti: MaterielItem[] } }
interface Conge { id: number; date_debut: string; date_fin: string; type: "conge" | "maladie" | "formation"; notes: string | null }

type GardeType = "commercial" | "garde_dep";
type CongeType = "conge" | "maladie" | "formation";
type VueType = "semaine" | "mois";
type RecurrenceScope = "occurrence" | "following" | "all";

const TYPE_LABELS: Record<GardeType, string> = {
  commercial: "Commercial",
  garde_dep: "Garde dép.",
};

const TYPE_COLORS: Record<GardeType, { bg: string; text: string; border: string; dot: string }> = {
  commercial: { bg: "bg-[#EBF5FB]", text: "text-[#1A5276]", border: "border-[#2E86C1]", dot: "bg-[#2E86C1]" },
  garde_dep:  { bg: "bg-[#F4ECF7]", text: "text-[#6C3483]", border: "border-[#8E44AD]", dot: "bg-[#8E44AD]" },
};

const CONGE_LABELS: Record<CongeType, string> = {
  conge:     "Congé",
  maladie:   "Maladie",
  formation: "Formation",
};

const CONGE_COLORS: Record<CongeType, { bg: string; text: string; border: string; dot: string }> = {
  conge:     { bg: "bg-[#FEF9E7]", text: "text-[#7D6608]", border: "border-[#F39C12]",  dot: "bg-[#F39C12]" },
  maladie:   { bg: "bg-[#FDEDEC]", text: "text-[#922B21]", border: "border-[#E74C3C]",  dot: "bg-[#E74C3C]" },
  formation: { bg: "bg-[#E8F8F5]", text: "text-[#1A5276]", border: "border-[#1ABC9C]",  dot: "bg-[#1ABC9C]" },
};

const FREQ_LABELS: Record<RecurrenceFrequence, string> = {
  quotidien:      "Chaque jour",
  hebdomadaire:   "Chaque semaine",
  bihebdomadaire: "Toutes les 2 semaines",
  mensuel:        "Chaque mois",
};

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DOW_LABELS = ["L","M","M","J","V","S","D"];
const DOW_FULL   = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

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
  if (pct >= 73)  return "bg-[#F39C12]";
  return "bg-[#27AE60]";
}

function pctTextColor(pct: number): string {
  if (pct >= 100) return "text-[#E74C3C]";
  if (pct >= 73)  return "text-[#F39C12]";
  return "text-[#1D8348]";
}

function congeCoversDate(c: Conge, dateStr: string): boolean {
  return dateStr >= c.date_debut && dateStr <= c.date_fin;
}

const SCOPE_OPTIONS: { value: RecurrenceScope; label: string; desc: string }[] = [
  { value: "occurrence", label: "Cet événement",                  desc: "Modifie uniquement cette date" },
  { value: "following",  label: "Cet événement et les suivants",  desc: "Modifie à partir de cette date" },
  { value: "all",        label: "Tous les événements",            desc: "Modifie toute la série" },
];

function defaultNextMonth(d: Date): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return isoDate(next);
}

export default function PlanningPage() {
  const { user, loading } = useAuth();
  const { garde: gardeActive, refresh: refreshActive } = useGardeActive(user);

  const now = new Date();
  const [vue, setVue] = useState<VueType>("mois");
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [gardes, setGardes] = useState<Garde[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [cloturerId, setCloturerId] = useState<number | null>(null);
  const [notesRecap, setNotesRecap] = useState("");
  const [messageRearmement, setMessageRearmement] = useState<string | null>(null);

  // Scope modal (edit ou delete d'une garde récurrente)
  const [scopeModal, setScopeModal] = useState<{ garde: Garde; action: "edit" | "delete" } | null>(null);
  const [selectedScope, setSelectedScope] = useState<RecurrenceScope>("occurrence");

  // Modale nouvelle garde (avec option répéter)
  const [showNouvelle, setShowNouvelle] = useState(false);
  const [nouvelleForm, setNouvelleForm] = useState({
    date:        isoDate(now),
    heure_debut: "07:00",
    heure_fin:   "19:00",
    type:        "commercial" as GardeType,
    binome:      "",
    repeter:     false,
    frequence:   "hebdomadaire" as RecurrenceFrequence,
    jours:       [] as number[],
    date_fin:    defaultNextMonth(now),
  });
  const [creating, setCreating] = useState(false);

  // Modale edit garde
  const [editGarde, setEditGarde]   = useState<Garde | null>(null);
  const [editScope, setEditScope]   = useState<RecurrenceScope>("occurrence");
  const [editForm, setEditForm]     = useState({
    date: "", heure_debut: "", heure_fin: "", type: "commercial" as GardeType, binome: "",
  });
  const [saving, setSaving] = useState(false);

  // Confirm suppression garde (non-récurrente)
  const [deleteGardeId, setDeleteGardeId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Congés
  const [showConge, setShowConge]   = useState(false);
  const [congeForm, setCongeForm]   = useState({ date_debut: isoDate(now), date_fin: isoDate(now), type: "conge" as CongeType, notes: "" });
  const [creatingConge, setCreatingConge] = useState(false);
  const [editConge, setEditConge]   = useState<Conge | null>(null);
  const [deleteCongeId, setDeleteCongeId] = useState<number | null>(null);

  // Menu contextuel garde
  const [menuGardeId, setMenuGardeId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const mois  = selectedDate.getMonth() + 1;
  const annee = selectedDate.getFullYear();

  async function load(m: number, a: number) {
    setFetching(true);
    try {
      const [gardesRes, congesRes] = await Promise.all([
        api.get<PaginatedResponse<Garde>>(`/gardes?mois=${m}&annee=${a}`),
        api.get<Conge[]>(`/conges?mois=${m}&annee=${a}`),
      ]);
      setGardes(gardesRes.data);
      setConges(congesRes);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load(mois, annee);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mois, annee]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuGardeId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(dir: -1 | 1) {
    const d = new Date(selectedDate);
    if (vue === "mois") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  }

  function navLabel(): string {
    if (vue === "mois") return `${MOIS_FR[mois - 1]} ${annee}`;
    const start = startOfWeek(selectedDate);
    const end   = new Date(start);
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
    const end   = new Date(start);
    end.setDate(start.getDate() + 6);
    return all.filter((g) => {
      const d = new Date(g.date + "T12:00:00");
      return d >= start && d <= end;
    });
  }, [gardes, vue, selectedDate]);

  const congesVisible = useMemo(() => {
    if (vue !== "semaine") return [];
    const start    = startOfWeek(selectedDate);
    const end      = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = isoDate(start);
    const endStr   = isoDate(end);
    return conges.filter((c) => c.date_debut <= endStr && c.date_fin >= startStr);
  }, [conges, vue, selectedDate]);

  const stats = useMemo(() => {
    const amplitude = gardesVisible.reduce((s, g) => s + amplitudeMin(g), 0);
    const tte       = gardesVisible.reduce((s, g) => s + g.duree_minutes, 0);
    const pause     = Math.max(0, amplitude - tte);
    return {
      nb: gardesVisible.length,
      amplitude,
      tte,
      pause,
      interventions: gardesVisible.reduce((s, g) => s + (g.interventions_count ?? 0), 0),
      ttePct48h: Math.min(100, Math.round((tte / 2880) * 100)),
    };
  }, [gardesVisible]);

  const gardesByWeek = useMemo(() => {
    if (vue !== "mois") return [];
    const groups = new Map<string, { weekStart: Date; gardes: Garde[] }>();
    gardesVisible.forEach((g) => {
      const ws  = startOfWeek(new Date(g.date + "T12:00:00"));
      const key = isoDate(ws);
      if (!groups.has(key)) groups.set(key, { weekStart: ws, gardes: [] });
      groups.get(key)!.gardes.push(g);
    });
    return Array.from(groups.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [gardesVisible, vue]);

  function openMenuEdit(garde: Garde) {
    setMenuGardeId(null);
    if (garde.recurrence_id) {
      // Scope modal first
      setSelectedScope("occurrence");
      setScopeModal({ garde, action: "edit" });
    } else {
      openEditForm(garde, "occurrence");
    }
  }

  function openMenuDelete(garde: Garde) {
    setMenuGardeId(null);
    if (garde.recurrence_id) {
      setSelectedScope("occurrence");
      setScopeModal({ garde, action: "delete" });
    } else {
      setDeleteGardeId(garde.id);
    }
  }

  function openEditForm(garde: Garde, scope: RecurrenceScope) {
    setEditScope(scope);
    setEditForm({
      date:        garde.date,
      heure_debut: garde.heure_debut,
      heure_fin:   garde.heure_fin,
      type:        garde.type,
      binome:      garde.binome ?? "",
    });
    setEditGarde(garde);
  }

  function confirmScope() {
    if (!scopeModal) return;
    if (scopeModal.action === "edit") {
      openEditForm(scopeModal.garde, selectedScope);
      setScopeModal(null);
    } else {
      handleDeleteWithScope(scopeModal.garde.id, selectedScope);
      setScopeModal(null);
    }
  }

  async function handleCreer() {
    setCreating(true);
    try {
      if (nouvelleForm.repeter) {
        await api.post("/gardes/recurrence", {
          date_debut:    nouvelleForm.date,
          date_fin:      nouvelleForm.date_fin || null,
          frequence:     nouvelleForm.frequence,
          jours_semaine: ["hebdomadaire", "bihebdomadaire"].includes(nouvelleForm.frequence)
            ? nouvelleForm.jours
            : undefined,
          heure_debut:   nouvelleForm.heure_debut,
          heure_fin:     nouvelleForm.heure_fin,
          type:          nouvelleForm.type,
          binome:        nouvelleForm.binome || null,
        });
      } else {
        await api.post("/gardes", {
          date:        nouvelleForm.date,
          heure_debut: nouvelleForm.heure_debut,
          heure_fin:   nouvelleForm.heure_fin,
          type:        nouvelleForm.type,
          binome:      nouvelleForm.binome || null,
        });
      }
      setShowNouvelle(false);
      await load(mois, annee);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editGarde) return;
    setSaving(true);
    try {
      await api.put(`/gardes/${editGarde.id}`, {
        scope:       editGarde.recurrence_id ? editScope : undefined,
        date:        editScope === "occurrence" ? editForm.date : undefined,
        heure_debut: editForm.heure_debut,
        heure_fin:   editForm.heure_fin,
        type:        editForm.type,
        binome:      editForm.binome || null,
      });
      setEditGarde(null);
      await load(mois, annee);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGarde() {
    if (!deleteGardeId) return;
    setDeleting(true);
    try {
      await api.delete(`/gardes/${deleteGardeId}`);
      setDeleteGardeId(null);
      await Promise.all([load(mois, annee), refreshActive()]);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteWithScope(gardeId: number, scope: RecurrenceScope) {
    await api.delete(`/gardes/${gardeId}?scope=${scope}`);
    await Promise.all([load(mois, annee), refreshActive()]);
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

  async function handleCreerConge() {
    setCreatingConge(true);
    try {
      if (editConge) {
        await api.put(`/conges/${editConge.id}`, { ...congeForm, notes: congeForm.notes || null });
      } else {
        await api.post("/conges", { ...congeForm, notes: congeForm.notes || null });
      }
      setShowConge(false);
      setEditConge(null);
      await load(mois, annee);
    } finally {
      setCreatingConge(false);
    }
  }

  async function handleDeleteConge() {
    if (!deleteCongeId) return;
    try {
      await api.delete(`/conges/${deleteCongeId}`);
      setDeleteCongeId(null);
      await load(mois, annee);
    } catch { /* noop */ }
  }

  function openEditConge(conge: Conge) {
    setCongeForm({ date_debut: conge.date_debut, date_fin: conge.date_fin, type: conge.type, notes: conge.notes ?? "" });
    setEditConge(conge);
    setShowConge(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  const todayStr = isoDate(now);

  const calendarCells = (() => {
    const firstDay    = new Date(annee, mois - 1, 1);
    const daysInMonth = new Date(annee, mois, 0).getDate();
    const startDow    = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const weekDays = (() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  const IconRepeat = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block opacity-60">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );

  function GardeCard({ garde }: { garde: Garde }) {
    const colors    = TYPE_COLORS[garde.type];
    const date      = new Date(garde.date + "T12:00:00");
    const isRunning = gardeActive?.id === garde.id;
    const isMenuOpen = menuGardeId === garde.id;

    return (
      <div className={`bg-white rounded-xl border border-[#D1D8E0] border-l-4 ${isRunning ? "border-l-[#27AE60]" : colors.border} p-4`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#0A1E3D] font-bold text-sm">
                {date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                {TYPE_LABELS[garde.type]}
              </span>
              {garde.recurrence_id && (
                <span className="text-[#8694A7]"><IconRepeat /></span>
              )}
              {isRunning && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[#E6F9ED] text-[#1D8348]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" />
                  En cours
                </span>
              )}
              {garde.is_cloturee && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#E6F2EC] text-[#1D8348]">Clôturée</span>
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

          <div className="shrink-0 flex items-center gap-1">
            {!garde.is_cloturee && (
              isRunning ? (
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
              )
            )}
            <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
              <button
                onClick={() => setMenuGardeId(isMenuOpen ? null : garde.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8694A7] hover:bg-[#F0F2F5]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-9 bg-white border border-[#D1D8E0] rounded-xl shadow-lg z-20 min-w-[150px] overflow-hidden">
                  <button
                    onClick={() => openMenuEdit(garde)}
                    className="w-full text-left px-4 py-3 text-sm text-[#0A1E3D] hover:bg-[#F0F2F5] flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Modifier
                  </button>
                  <button
                    onClick={() => openMenuDelete(garde)}
                    className="w-full text-left px-4 py-3 text-sm text-[#C0392B] hover:bg-[#FDEDEC] flex items-center gap-2 border-t border-[#F0F2F5]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const needsJours = ["hebdomadaire", "bihebdomadaire"].includes(nouvelleForm.frequence);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Planning" />

      <div className="px-4 py-5 space-y-4">

        {/* Vue toggle */}
        <div className="flex rounded-xl bg-white border border-[#D1D8E0] p-1 gap-1">
          {(["semaine", "mois"] as VueType[]).map((v) => (
            <button key={v} onClick={() => setVue(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${vue === v ? "bg-[#0A1E3D] text-white" : "text-[#8694A7]"}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="text-[#1C1F26] text-base font-bold">{navLabel()}</div>
          <button onClick={() => navigate(1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#D1D8E0] text-[#0A1E3D]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Calendrier mois */}
        {vue === "mois" && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-3">
            <div className="grid grid-cols-7 mb-1">
              {DOW_LABELS.map((d, i) => <div key={i} className="text-center text-[10px] font-semibold text-[#8694A7] py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={idx} className="h-9" />;
                const dateStr   = `${annee}-${String(mois).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayGardes = gardesByDate[dateStr] ?? [];
                const dayConges = conges.filter((c) => congeCoversDate(c, dateStr));
                const isToday   = dateStr === todayStr;
                return (
                  <div key={idx} className={`h-9 flex flex-col items-center justify-center rounded-lg ${isToday ? "bg-[#EBF5FB]" : dayConges.length > 0 ? "bg-[#FEF9E7]" : ""}`}>
                    <span className={`text-xs font-semibold ${isToday ? "text-[#2E86C1]" : "text-[#1C1F26]"}`}>{day}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {dayGardes.slice(0, 2).map((g, i) => <span key={i} className={`w-1 h-1 rounded-full ${TYPE_COLORS[g.type].dot}`} />)}
                      {dayConges.length > 0 && dayGardes.length === 0 && <span className={`w-1 h-1 rounded-full ${CONGE_COLORS[dayConges[0].type].dot}`} />}
                    </div>
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
                const dateStr   = isoDate(d);
                const dayGardes = gardesByDate[dateStr] ?? [];
                const dayConges = conges.filter((c) => congeCoversDate(c, dateStr));
                const isToday   = dateStr === todayStr;
                return (
                  <div key={i} className={`flex flex-col items-center py-2 rounded-lg ${isToday ? "bg-[#EBF5FB]" : dayConges.length > 0 ? "bg-[#FEF9E7]" : ""}`}>
                    <span className="text-[10px] font-semibold text-[#8694A7]">{DOW_LABELS[i]}</span>
                    <span className={`text-sm font-bold ${isToday ? "text-[#2E86C1]" : "text-[#1C1F26]"}`}>{d.getDate()}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {dayGardes.slice(0, 2).map((g, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[g.type].dot}`} />)}
                      {dayConges.length > 0 && dayGardes.length === 0 && <span className={`w-1.5 h-1.5 rounded-full ${CONGE_COLORS[dayConges[0].type].dot}`} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Congés semaine */}
        {vue === "semaine" && congesVisible.length > 0 && (
          <div className="space-y-2">
            {congesVisible.map((conge) => {
              const colors = CONGE_COLORS[conge.type];
              return (
                <div key={conge.id} className={`bg-white rounded-xl border border-l-4 ${colors.border} p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{CONGE_LABELS[conge.type]}</span>
                      <div className="text-[#8694A7] text-xs mt-1 font-mono">
                        {conge.date_debut === conge.date_fin
                          ? new Date(conge.date_debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
                          : `${new Date(conge.date_debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → ${new Date(conge.date_fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                      </div>
                      {conge.notes && <div className="text-[#8694A7] text-xs mt-0.5">{conge.notes}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditConge(conge)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8694A7] hover:bg-[#F0F2F5]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setDeleteCongeId(conge.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#C0392B] hover:bg-[#FDEDEC]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats semaine */}
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
                <span className={`text-xs font-bold font-mono ${pctTextColor(stats.ttePct48h)}`}>{formatH(stats.tte)} / 48h</span>
              </div>
              <div className="h-3 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pctColor(stats.ttePct48h)}`} style={{ width: `${stats.ttePct48h}%` }} />
              </div>
              {stats.ttePct48h >= 100 && <p className="text-[10px] text-[#E74C3C] font-semibold mt-1">Seuil légal 48h dépassé</p>}
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

        {/* Stats mois */}
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
                  <div className="h-full bg-[#27AE60] rounded-l-full" style={{ width: `${Math.round((stats.tte / stats.amplitude) * 100)}%` }} />
                  {stats.pause > 0 && <div className="h-full bg-[#F39C12]" style={{ width: `${Math.round((stats.pause / stats.amplitude) * 100)}%` }} />}
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

        {fetching && gardes.length === 0 && <div className="text-center py-10 text-[#8694A7] text-sm">Chargement…</div>}

        {!fetching && gardesVisible.length === 0 && congesVisible.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
            <p className="text-[#8694A7] text-sm">{vue === "semaine" ? "Aucune garde cette semaine" : "Aucune garde ce mois-ci"}</p>
          </div>
        )}

        {vue === "semaine" && gardesVisible.length > 0 && (
          <div className="space-y-2">
            {gardesVisible.map((g) => <GardeCard key={g.id} garde={g} />)}
          </div>
        )}

        {vue === "mois" && gardesByWeek.map(({ weekStart, gardes: wGardes }) => {
          const wTTE   = wGardes.reduce((s, g) => s + g.duree_minutes, 0);
          const wAmp   = wGardes.reduce((s, g) => s + amplitudeMin(g), 0);
          const wPause = Math.max(0, wAmp - wTTE);
          const wPct   = Math.min(100, Math.round((wTTE / 2880) * 100));
          return (
            <div key={isoDate(weekStart)} className="space-y-2">
              <div className="bg-white rounded-xl border border-[#D1D8E0] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#0A1E3D]">{weekRangeLabel(weekStart)}</span>
                  <span className={`text-xs font-bold font-mono ${pctTextColor(wPct)}`}>{formatH(wTTE)} TTE</span>
                </div>
                <div className="h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctColor(wPct)}`} style={{ width: `${wPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-[#8694A7]">{wPct}% de 48h</span>
                  {wPause > 0 && <span className="text-[10px] text-[#8694A7]">{formatH(wPause)} pause</span>}
                </div>
              </div>
              {wGardes.map((g) => <GardeCard key={g.id} garde={g} />)}
            </div>
          );
        })}

        {/* Boutons actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { setShowNouvelle(true); setNouvelleForm({ date: isoDate(now), heure_debut: "07:00", heure_fin: "19:00", type: "commercial", binome: "", repeter: false, frequence: "hebdomadaire", jours: [], date_fin: defaultNextMonth(now) }); }}
            className="flex-1 py-3 rounded-xl bg-[#0A1E3D] text-white text-sm font-semibold"
          >
            + Garde
          </button>
          <button
            onClick={() => { setShowConge(true); setEditConge(null); setCongeForm({ date_debut: isoDate(now), date_fin: isoDate(now), type: "conge", notes: "" }); }}
            className="flex-1 py-3 rounded-xl bg-[#FEF9E7] border border-[#F39C12] text-[#7D6608] text-sm font-semibold"
          >
            Congé / absence
          </button>
        </div>
      </div>

      {/* ── Scope modal (récurrence) ── */}
      {scopeModal && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <div>
              <h3 className="text-[#0A1E3D] font-bold text-lg">
                {scopeModal.action === "edit" ? "Modifier la garde" : "Supprimer la garde"}
              </h3>
              <p className="text-[#8694A7] text-sm mt-1">Cette garde fait partie d'une série récurrente.</p>
            </div>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedScope(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedScope === opt.value ? "border-[#0A1E3D] bg-[#F0F2F5]" : "border-[#D1D8E0] bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedScope === opt.value ? "border-[#0A1E3D]" : "border-[#D1D8E0]"}`}>
                      {selectedScope === opt.value && <div className="w-2 h-2 rounded-full bg-[#0A1E3D]" />}
                    </div>
                    <div>
                      <div className="text-[#0A1E3D] text-sm font-semibold">{opt.label}</div>
                      <div className="text-[#8694A7] text-xs">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScopeModal(null)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button
                onClick={confirmScope}
                className={`flex-1 py-3 rounded-xl text-white text-sm font-semibold ${scopeModal.action === "delete" ? "bg-[#C0392B]" : "bg-[#2E86C1]"}`}
              >
                {scopeModal.action === "edit" ? "Modifier" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clôturer ── */}
      {cloturerId !== null && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Clôturer la garde</h3>
            <p className="text-[#8694A7] text-sm">Un récapitulatif sera généré. Vous pouvez ajouter des notes.</p>
            <textarea value={notesRecap} onChange={(e) => setNotesRecap(e.target.value)} placeholder="Notes de fin de garde (facultatif)" rows={3} className="w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1] resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setCloturerId(null); setNotesRecap(""); }} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleCloturer} disabled={actionId === cloturerId} className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white text-sm font-semibold disabled:opacity-50">
                {actionId === cloturerId ? "Clôture…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nouvelle garde ── */}
      {showNouvelle && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Nouvelle garde</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Date de début</label>
                <input type="date" value={nouvelleForm.date} onChange={(e) => setNouvelleForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Début</label>
                  <input type="time" value={nouvelleForm.heure_debut} onChange={(e) => setNouvelleForm((f) => ({ ...f, heure_debut: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Fin</label>
                  <input type="time" value={nouvelleForm.heure_fin} onChange={(e) => setNouvelleForm((f) => ({ ...f, heure_fin: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_LABELS) as GardeType[]).map((t) => (
                    <button key={t} onClick={() => setNouvelleForm((f) => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-sm font-semibold border ${nouvelleForm.type === t ? `${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text} ${TYPE_COLORS[t].border}` : "bg-white text-[#8694A7] border-[#D1D8E0]"}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Binôme (optionnel)</label>
                <input type="text" value={nouvelleForm.binome} onChange={(e) => setNouvelleForm((f) => ({ ...f, binome: e.target.value }))} placeholder="Prénom Nom" className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]" />
              </div>

              {/* Récurrence */}
              <div className="pt-1 border-t border-[#F0F2F5]">
                <button
                  onClick={() => setNouvelleForm((f) => ({ ...f, repeter: !f.repeter }))}
                  className="flex items-center justify-between w-full"
                >
                  <span className="text-[#0A1E3D] text-sm font-semibold flex items-center gap-2">
                    <IconRepeat /> Répéter
                  </span>
                  <div className={`w-11 h-6 rounded-full transition-colors ${nouvelleForm.repeter ? "bg-[#0A1E3D]" : "bg-[#D1D8E0]"} relative`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${nouvelleForm.repeter ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </button>

                {nouvelleForm.repeter && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Fréquence</label>
                      <div className="mt-1 space-y-1">
                        {(Object.keys(FREQ_LABELS) as RecurrenceFrequence[]).map((f) => (
                          <button key={f} onClick={() => setNouvelleForm((nf) => ({ ...nf, frequence: f, jours: [] }))}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${nouvelleForm.frequence === f ? "bg-[#EBF5FB] text-[#1A5276] border-[#2E86C1] font-semibold" : "bg-white text-[#8694A7] border-[#D1D8E0]"}`}>
                            {FREQ_LABELS[f]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {needsJours && (
                      <div>
                        <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Jours</label>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                          {DOW_FULL.map((label, i) => {
                            const val = i + 1;
                            const sel = nouvelleForm.jours.includes(val);
                            return (
                              <button key={val}
                                onClick={() => setNouvelleForm((nf) => ({ ...nf, jours: sel ? nf.jours.filter((j) => j !== val) : [...nf.jours, val] }))}
                                className={`py-2 rounded-lg text-xs font-bold border ${sel ? "bg-[#0A1E3D] text-white border-[#0A1E3D]" : "bg-white text-[#8694A7] border-[#D1D8E0]"}`}>
                                {label.slice(0, 1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Date de fin (optionnel)</label>
                      <input type="date" value={nouvelleForm.date_fin} onChange={(e) => setNouvelleForm((f) => ({ ...f, date_fin: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNouvelle(false)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleCreer} disabled={creating || (nouvelleForm.repeter && needsJours && nouvelleForm.jours.length === 0)} className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold disabled:opacity-50">
                {creating ? "Création…" : nouvelleForm.repeter ? "Créer la série" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit garde ── */}
      {editGarde !== null && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Modifier la garde</h3>
            <div className="space-y-3">
              {editScope === "occurrence" && (
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Date</label>
                  <input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Début</label>
                  <input type="time" value={editForm.heure_debut} onChange={(e) => setEditForm((f) => ({ ...f, heure_debut: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Fin</label>
                  <input type="time" value={editForm.heure_fin} onChange={(e) => setEditForm((f) => ({ ...f, heure_fin: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_LABELS) as GardeType[]).map((t) => (
                    <button key={t} onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-sm font-semibold border ${editForm.type === t ? `${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text} ${TYPE_COLORS[t].border}` : "bg-white text-[#8694A7] border-[#D1D8E0]"}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Binôme (optionnel)</label>
                <input type="text" value={editForm.binome} onChange={(e) => setEditForm((f) => ({ ...f, binome: e.target.value }))} placeholder="Prénom Nom" className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]" />
              </div>
              {editGarde.recurrence_id && (
                <p className="text-[#8694A7] text-xs">
                  Portée : <span className="font-semibold text-[#0A1E3D]">{SCOPE_OPTIONS.find((o) => o.value === editScope)?.label}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditGarde(null)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold disabled:opacity-50">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete garde (non-récurrente) ── */}
      {deleteGardeId !== null && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Supprimer la garde</h3>
            <p className="text-[#8694A7] text-sm">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteGardeId(null)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleDeleteGarde} disabled={deleting} className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Congé ── */}
      {showConge && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[#0A1E3D] font-bold text-lg">{editConge ? "Modifier le congé" : "Nouveau congé / absence"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Du</label>
                  <input type="date" value={congeForm.date_debut} onChange={(e) => setCongeForm((f) => ({ ...f, date_debut: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
                <div>
                  <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Au</label>
                  <input type="date" value={congeForm.date_fin} onChange={(e) => setCongeForm((f) => ({ ...f, date_fin: e.target.value }))} className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]" />
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Type</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(Object.keys(CONGE_LABELS) as CongeType[]).map((t) => (
                    <button key={t} onClick={() => setCongeForm((f) => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-xs font-semibold border ${congeForm.type === t ? `${CONGE_COLORS[t].bg} ${CONGE_COLORS[t].text} ${CONGE_COLORS[t].border}` : "bg-white text-[#8694A7] border-[#D1D8E0]"}`}>
                      {CONGE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide">Notes (optionnel)</label>
                <input type="text" value={congeForm.notes} onChange={(e) => setCongeForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Ex : vacances été" className="mt-1 w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowConge(false); setEditConge(null); }} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleCreerConge} disabled={creatingConge} className="flex-1 py-3 rounded-xl bg-[#F39C12] text-white text-sm font-semibold disabled:opacity-50">
                {creatingConge ? "Enregistrement…" : editConge ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete congé ── */}
      {deleteCongeId !== null && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Supprimer le congé</h3>
            <p className="text-[#8694A7] text-sm">Cette période de congé sera supprimée.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCongeId(null)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Annuler</button>
              <button onClick={handleDeleteConge} className="flex-1 py-3 rounded-xl bg-[#C0392B] text-white text-sm font-semibold">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Réarmement ── */}
      {messageRearmement !== null && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4">
            <h3 className="text-[#0A1E3D] font-bold text-lg">Réarmement du sac</h3>
            <p className="text-[#8694A7] text-sm">Message prêt à envoyer à votre gestionnaire matériel.</p>
            <textarea readOnly value={messageRearmement} rows={8} onClick={(e) => (e.target as HTMLTextAreaElement).select()} className="w-full border border-[#D1D8E0] rounded-xl px-3 py-2.5 text-sm text-[#1C1F26] bg-[#F8FAFB] resize-none outline-none" />
            <div className="flex gap-3">
              <button onClick={() => navigator.clipboard.writeText(messageRearmement)} className="flex-1 py-3 rounded-xl bg-[#2E86C1] text-white text-sm font-semibold">Copier</button>
              <button onClick={() => setMessageRearmement(null)} className="flex-1 py-3 rounded-xl border border-[#D1D8E0] text-[#0A1E3D] text-sm font-semibold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
