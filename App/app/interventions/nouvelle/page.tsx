"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useGardeActive } from "@/hooks/useGardeActive";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import type { Intervention } from "@/lib/types";

type Categorie = Intervention["categorie"];
type Sexe = Intervention["patient_sexe"];
type AgeRange = NonNullable<Intervention["patient_age_range"]>;

const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: "respi", label: "Respi" },
  { value: "cardio", label: "Cardio" },
  { value: "trauma", label: "Trauma" },
  { value: "neuro", label: "Neuro" },
  { value: "pediatrie", label: "Pédiatrie" },
  { value: "psychiatrie", label: "Psychiatrie" },
  { value: "autre", label: "Autre" },
];

const GESTES_SUGGERES = [
  "VVP", "O2", "ECG", "Scope", "MCE", "DAE",
  "Garrot", "Pansement compressif", "Attelle",
  "Glycémie cap.", "PLS", "Position antalgique",
  "Intubation", "Aspiration",
];

const TYPE_LABELS: Record<string, string> = {
  jour: "Garde de jour", nuit: "Garde de nuit", garde_24h: "Garde 24h", astreinte: "Astreinte",
};

export default function NouvelleInterventionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { garde: gardeActive } = useGardeActive(user);

  const [motif, setMotif] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("autre");
  const [sexe, setSexe] = useState<Sexe>("inconnu");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [heureAlerte, setHeureAlerte] = useState("");
  const [heureDepart, setHeureDepart] = useState("");
  const [heureArrivee, setHeureArrivee] = useState("");
  const [gestes, setGestes] = useState<string[]>([]);
  const [gesteInput, setGesteInput] = useState("");
  const [spo2, setSpo2] = useState("");
  const [fc, setFc] = useState("");
  const [pas, setPas] = useState("");
  const [pad, setPad] = useState("");
  const [temperature, setTemperature] = useState("");
  const [dextro, setDextro] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addGeste(g: string) {
    const trimmed = g.trim();
    if (!trimmed || gestes.includes(trimmed)) return;
    setGestes((prev) => [...prev, trimmed]);
    setGesteInput("");
  }

  function removeGeste(g: string) {
    setGestes((prev) => prev.filter((x) => x !== g));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motif.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        motif: motif.trim(),
        categorie,
        patient_sexe: sexe,
        ...(ageRange ? { patient_age_range: ageRange } : {}),
        ...(adresseDepart ? { adresse_depart: adresseDepart } : {}),
        ...(destination ? { destination } : {}),
        ...(heureAlerte ? { heure_alerte: heureAlerte } : {}),
        ...(heureDepart ? { heure_depart: heureDepart } : {}),
        ...(heureArrivee ? { heure_arrivee: heureArrivee } : {}),
        ...(gestes.length ? { gestes } : {}),
        ...(spo2 ? { spo2: parseInt(spo2) } : {}),
        ...(fc ? { fc: parseInt(fc) } : {}),
        ...(pas ? { pas: parseInt(pas) } : {}),
        ...(pad ? { pad: parseInt(pad) } : {}),
        ...(temperature ? { temperature: Math.round(parseFloat(temperature) * 10) } : {}),
        ...(dextro ? { dextro: parseInt(dextro) } : {}),
        ...(notes ? { notes } : {}),
      };
      await api.post("/interventions", payload);
      router.push("/interventions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-[#F0F2F5] pb-10">
      <MobileHeader
        title="Nouvelle intervention"
        showBack
        onBack={() => router.push("/interventions")}
      />

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4">
        <h2 className="text-[#1C1F26] text-xl font-bold">Nouvelle intervention</h2>

        {gardeActive && (
          <div className="flex items-center gap-2 bg-[#E6F9ED] border border-[#B2E0C4] rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-[#27AE60] shrink-0 animate-pulse" />
            <span className="text-[#1D8348] text-sm font-semibold">
              {TYPE_LABELS[gardeActive.type]} en cours — rattachement automatique
            </span>
          </div>
        )}

        {error && (
          <div className="bg-[#FDEDEC] border border-[#F1948A] rounded-xl px-4 py-3 text-[#922B21] text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Essentiel</h3>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-1">Motif *</label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Douleur thoracique, AVC, chute…"
              className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-2">Catégorie *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategorie(cat.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    categorie === cat.value
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-[#F0F2F5] text-[#5D6D7E] border-[#D1D8E0]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Patient</h3>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-2">Sexe</label>
            <div className="flex gap-2">
              {([
                { value: "m" as Sexe, label: "Homme" },
                { value: "f" as Sexe, label: "Femme" },
                { value: "inconnu" as Sexe, label: "Inconnu" },
              ] as { value: Sexe; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSexe(opt.value)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${
                    sexe === opt.value
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-[#F0F2F5] text-[#5D6D7E] border-[#D1D8E0]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-2">Tranche d'âge</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "pedia" as AgeRange, label: "Pédiatrie" },
                { value: "adult" as AgeRange, label: "Adulte" },
                { value: "senior" as AgeRange, label: "Senior" },
                { value: "elderly" as AgeRange, label: "Très âgé" },
              ] as { value: AgeRange; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAgeRange(ageRange === opt.value ? "" : opt.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    ageRange === opt.value
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-[#F0F2F5] text-[#5D6D7E] border-[#D1D8E0]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Localisation</h3>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-1">Adresse de départ</label>
            <input
              type="text"
              value={adresseDepart}
              onChange={(e) => setAdresseDepart(e.target.value)}
              placeholder="Ex: 12 rue de la Paix, Paris"
              className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5D6D7E] mb-1">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex: CHU Lariboisière"
              className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Horaires</h3>
          {(
            [
              { label: "Alerte", value: heureAlerte, setter: setHeureAlerte },
              { label: "Départ", value: heureDepart, setter: setHeureDepart },
              { label: "Arrivée", value: heureArrivee, setter: setHeureArrivee },
            ] as { label: string; value: string; setter: (v: string) => void }[]
          ).map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-[#5D6D7E] mb-1">{label}</label>
              <input
                type="datetime-local"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] outline-none focus:border-[#2E86C1]"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Gestes réalisés</h3>
          <div className="flex flex-wrap gap-2">
            {GESTES_SUGGERES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => (gestes.includes(g) ? removeGeste(g) : addGeste(g))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  gestes.includes(g)
                    ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                    : "bg-[#F0F2F5] text-[#5D6D7E] border-[#D1D8E0]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={gesteInput}
              onChange={(e) => setGesteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGeste(gesteInput);
                }
              }}
              placeholder="Autre geste…"
              className="flex-1 bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
            />
            <button
              type="button"
              onClick={() => addGeste(gesteInput)}
              className="bg-[#2E86C1] text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              +
            </button>
          </div>
          {gestes.filter((g) => !GESTES_SUGGERES.includes(g)).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {gestes
                .filter((g) => !GESTES_SUGGERES.includes(g))
                .map((g) => (
                  <span
                    key={g}
                    className="flex items-center gap-1 bg-[#EBF5FB] text-[#1A5276] text-xs font-semibold px-2 py-1 rounded-full"
                  >
                    {g}
                    <button
                      type="button"
                      onClick={() => removeGeste(g)}
                      className="text-[#1A5276] leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Constantes</h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { label: "SpO2 (%)", value: spo2, setter: setSpo2, placeholder: "98", step: "1" },
                { label: "FC (bpm)", value: fc, setter: setFc, placeholder: "72", step: "1" },
                { label: "PAS (mmHg)", value: pas, setter: setPas, placeholder: "120", step: "1" },
                { label: "PAD (mmHg)", value: pad, setter: setPad, placeholder: "80", step: "1" },
                { label: "Dextro (mg/dL)", value: dextro, setter: setDextro, placeholder: "100", step: "1" },
                { label: "Température (°C)", value: temperature, setter: setTemperature, placeholder: "36.5", step: "0.1" },
              ] as { label: string; value: string; setter: (v: string) => void; placeholder: string; step: string }[]
            ).map(({ label, value, setter, placeholder, step }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-[#5D6D7E] mb-1">{label}</label>
                <input
                  type="number"
                  step={step}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D1D8E0] p-4 space-y-3">
          <h3 className="text-[#0A1E3D] font-bold text-xs uppercase tracking-wide">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, contexte, transmission…"
            rows={4}
            className="w-full bg-[#F0F2F5] border border-[#D1D8E0] rounded-lg px-3 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#2E86C1] text-white font-bold text-sm rounded-xl disabled:opacity-50"
        >
          {submitting ? "Enregistrement…" : "Enregistrer l'intervention"}
        </button>
      </form>
    </div>
  );
}
