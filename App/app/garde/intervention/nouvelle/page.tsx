"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import type { Garde, Intervention, SacItem } from "@/lib/types";

type Categorie = Intervention["categorie"];
type Sexe = Intervention["patient_sexe"];
type AgeRange = NonNullable<Intervention["patient_age_range"]>;
type TypeMission = "commercial" | "samu";
type StepKey = "type_mission" | "motif" | "categorie" | "patient" | "gestes" | "materiel" | "destination" | "valider";

interface SacCatGroup { items: SacItem[] }
interface SacResponse { categories: Partial<Record<SacItem["categorie"], SacCatGroup>> }
interface Commune { nom: string; departement?: { nom: string } }

const CATEGORIES: { value: Categorie; label: string; emoji: string }[] = [
  { value: "respi",       label: "Respi",       emoji: "🫁" },
  { value: "cardio",      label: "Cardio",      emoji: "❤️" },
  { value: "trauma",      label: "Trauma",      emoji: "🩹" },
  { value: "neuro",       label: "Neuro",       emoji: "🧠" },
  { value: "pediatrie",   label: "Pédiatrie",   emoji: "👶" },
  { value: "psychiatrie", label: "Psychiatrie", emoji: "🧩" },
  { value: "autre",       label: "Autre",       emoji: "📋" },
];

const SEXES: { value: Sexe; label: string }[] = [
  { value: "m", label: "Homme" },
  { value: "f", label: "Femme" },
];

const GESTES = [
  "VVP", "O2", "ECG", "Scope", "MCE", "DAE",
  "Garrot", "Pansement compressif", "Attelle",
  "Glycémie cap.", "PLS", "Position antalgique",
  "Intubation", "Aspiration",
];

const DESTINATIONS = [
  "CHU / Hôpital",
  "Clinique",
  "SAU / Urgences",
  "Domicile",
  "EHPAD / Maison de retraite",
  "Médecin de garde",
  "Maison médicale",
];

const MOTIFS_COMMERCIAL = [
  { label: "Consultation",    emoji: "🩺" },
  { label: "Hôpital de jour", emoji: "🏥" },
  { label: "Dialyse",         emoji: "💧" },
  { label: "Transfert",       emoji: "🔄" },
  { label: "Urgence médecin", emoji: "🚨" },
  { label: "Sortie",          emoji: "🏠" },
];

const STEP_LABELS: Record<StepKey, string> = {
  type_mission: "Type",
  motif:        "Motif",
  categorie:    "Catégorie",
  patient:      "Patient",
  gestes:       "Gestes",
  materiel:     "Matériel",
  destination:  "Destination",
  valider:      "Valider",
};

function ageToRange(age: number): AgeRange {
  if (age < 18) return "pedia";
  if (age < 60) return "adult";
  if (age < 75) return "senior";
  return "elderly";
}

export default function NouvelleInterventionGardePage() {
  return (
    <Suspense>
      <WizardContent />
    </Suspense>
  );
}

function WizardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gardeId = searchParams.get("garde_id");

  const [step, setStep] = useState(0);
  const [garde, setGarde] = useState<Garde | null>(null);
  const [gardeLoading, setGardeLoading] = useState(!!gardeId);

  const isCommercial = garde?.type === "commercial";

  const [typeMission, setTypeMission]       = useState<TypeMission | null>(null);
  const [motifCommercial, setMotifCommercial] = useState<string | null>(null);
  const [categorie, setCategorie]           = useState<Categorie | null>(null);
  const [sexe, setSexe]                     = useState<Sexe>("m");
  const [age, setAge]                       = useState("");
  const [gestes, setGestes]                 = useState<string[]>([]);
  const [sacItems, setSacItems]             = useState<SacItem[]>([]);
  const [materiel, setMateriel]             = useState<Record<number, number>>({});
  const [materielSearch, setMaterielSearch] = useState("");
  const [destination, setDestination]       = useState("");

  // Ville autocomplete (commercial)
  const [villeQuery, setVilleQuery]         = useState("");
  const [villeSuggestions, setVilleSuggestions] = useState<Commune[]>([]);
  const villeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sacLoading, setSacLoading]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Flux simplifié pour commercial non-urgence (pas de gestes / matériel)
  const isCommercialSimple =
    isCommercial &&
    typeMission === "commercial" &&
    motifCommercial !== null &&
    motifCommercial !== "Urgence médecin";

  const stepKeys: StepKey[] = [
    ...(isCommercial ? (["type_mission"] as StepKey[]) : []),
    ...(isCommercial && typeMission === "commercial"
      ? (["motif"] as StepKey[])
      : (["categorie"] as StepKey[])),
    "patient",
    ...(isCommercialSimple ? [] : (["gestes", "materiel"] as StepKey[])),
    "destination",
    "valider",
  ];

  const currentKey = stepKeys[step] ?? "valider";

  useEffect(() => {
    if (!user) return;
    if (gardeId) {
      api.get<Garde>(`/gardes/${gardeId}`)
        .then(setGarde)
        .catch(() => {})
        .finally(() => setGardeLoading(false));
    }
    setSacLoading(true);
    api.get<SacResponse>("/sac")
      .then((res) => {
        const all = Object.values(res.categories).flatMap((g) => g?.items ?? []);
        setSacItems(all);
      })
      .finally(() => setSacLoading(false));
  }, [user]);

  useEffect(() => {
    if (!villeQuery || villeQuery.length < 2) {
      setVilleSuggestions([]);
      return;
    }
    if (villeTimer.current) clearTimeout(villeTimer.current);
    villeTimer.current = setTimeout(() => {
      fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeQuery)}&fields=nom,departement&boost=population&limit=8`
      )
        .then((r) => r.json())
        .then((data: Commune[]) => setVilleSuggestions(data))
        .catch(() => {});
    }, 250);
    return () => {
      if (villeTimer.current) clearTimeout(villeTimer.current);
    };
  }, [villeQuery]);

  function next() { setStep((s) => s + 1); }

  function toggleGeste(g: string) {
    setGestes((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function toggleMateriel(id: number) {
    setMateriel((prev) => {
      if (prev[id]) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: 1 };
    });
  }

  function setQty(id: number, qty: number) {
    if (qty <= 0) {
      setMateriel((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setMateriel((prev) => ({ ...prev, [id]: qty }));
    }
  }

  async function handleSubmit() {
    const isCommercialMission = typeMission === "commercial";
    if (!isCommercialMission && !categorie) return;
    if (isCommercialMission && !motifCommercial) return;
    setError(null);
    setSubmitting(true);
    try {
      const motif = isCommercialMission
        ? motifCommercial!
        : CATEGORIES.find((c) => c.value === categorie)!.label;
      const ageNum = age ? parseInt(age) : null;

      const materielPayload = Object.entries(materiel).map(([id, qty]) => {
        const item = sacItems.find((i) => i.id === parseInt(id));
        return { sac_item_id: parseInt(id), name: item?.name ?? "", qty_used: qty };
      });

      const payload: Record<string, unknown> = {
        motif,
        categorie: isCommercialMission ? "autre" : categorie,
        patient_sexe: sexe,
        ...(ageNum !== null ? { patient_age_range: ageToRange(ageNum) } : {}),
        ...(gestes.length ? { gestes } : {}),
        ...(materielPayload.length ? { materiel_consomme: materielPayload } : {}),
        ...(destination ? { destination } : {}),
        ...(gardeId ? { garde_id: parseInt(gardeId) } : {}),
        ...(typeMission ? { type_mission: typeMission } : {}),
      };

      await api.post("/interventions", payload);
      window.location.href = gardeId ? "/dashboard" : "/interventions";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  }

  const cat = categorie ? CATEGORIES.find((c) => c.value === categorie) : null;
  const selectedMateriel = sacItems.filter((i) => materiel[i.id]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <MobileHeader
        title="Intervention rapide"
        showBack
        onBack={() => {
          if (step === 0) router.back();
          else setStep((s) => s - 1);
        }}
      />

      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1.5">
          {stepKeys.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#2E86C1]" : "bg-[#D1D8E0]"
              }`}
            />
          ))}
        </div>
        <div className="text-[#8694A7] text-xs mt-1.5 text-right">
          {STEP_LABELS[currentKey]} · {step + 1} / {stepKeys.length}
        </div>
      </div>

      <div className="flex-1 px-4 pb-6">

        {gardeLoading && (
          <div className="flex items-center justify-center h-40 text-[#8694A7] text-sm">Chargement…</div>
        )}

        {/* Type de mission */}
        {!gardeLoading && currentKey === "type_mission" && (
          <div className="space-y-3 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Type de mission</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "commercial" as TypeMission, label: "Commerciale", emoji: "🚑" },
                { value: "samu"       as TypeMission, label: "SAMU",        emoji: "🆘" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTypeMission(opt.value); next(); }}
                  className={`flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 text-sm font-bold transition-colors ${
                    typeMission === opt.value
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                  }`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Motif commercial */}
        {!gardeLoading && currentKey === "motif" && (
          <div className="space-y-3 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Motif</h2>
            <div className="grid grid-cols-2 gap-3">
              {MOTIFS_COMMERCIAL.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => { setMotifCommercial(m.label); next(); }}
                  className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 text-sm font-bold transition-colors ${
                    motifCommercial === m.label
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Catégorie médicale */}
        {!gardeLoading && currentKey === "categorie" && (
          <div className="space-y-3 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Catégorie</h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setCategorie(c.value); next(); }}
                  className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 text-sm font-bold transition-colors ${
                    categorie === c.value
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Patient */}
        {!gardeLoading && currentKey === "patient" && (
          <div className="space-y-5 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Patient</h2>

            <div>
              <div className="text-xs font-semibold text-[#5D6D7E] mb-2 uppercase tracking-wide">Sexe</div>
              <div className="grid grid-cols-2 gap-3">
                {SEXES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSexe(opt.value)}
                    className={`py-4 rounded-xl border-2 text-sm font-bold transition-colors ${
                      sexe === opt.value
                        ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                        : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {!isCommercialSimple && (
              <div>
                <div className="text-xs font-semibold text-[#5D6D7E] mb-2 uppercase tracking-wide">Âge</div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex: 45"
                  className="w-full bg-white border-2 border-[#D1D8E0] rounded-xl px-4 py-4 text-2xl font-bold text-center text-[#1C1F26] placeholder-[#D1D8E0] outline-none focus:border-[#2E86C1]"
                />
                {age && (
                  <div className="text-center text-xs text-[#8694A7] mt-1">
                    {ageToRange(parseInt(age)) === "pedia"   && "Pédiatrie (< 18 ans)"}
                    {ageToRange(parseInt(age)) === "adult"   && "Adulte (18–59 ans)"}
                    {ageToRange(parseInt(age)) === "senior"  && "Senior (60–74 ans)"}
                    {ageToRange(parseInt(age)) === "elderly" && "Très âgé (75 ans et +)"}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={next}
              className="w-full py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl"
            >
              Suivant
            </button>
          </div>
        )}

        {/* Gestes */}
        {!gardeLoading && currentKey === "gestes" && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Gestes réalisés</h2>
            <div className="grid grid-cols-2 gap-2">
              {GESTES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGeste(g)}
                  className={`py-3.5 px-3 rounded-xl border-2 text-sm font-semibold transition-colors text-center ${
                    gestes.includes(g)
                      ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                      : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]">
                Passer
              </button>
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl">
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Matériel */}
        {!gardeLoading && currentKey === "materiel" && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Matériel utilisé</h2>

            {sacLoading && (
              <div className="text-center py-8 text-[#8694A7] text-sm">Chargement…</div>
            )}

            {!sacLoading && sacItems.length === 0 && (
              <div className="text-center py-8 text-[#8694A7] text-sm">Aucun article dans le sac</div>
            )}

            {!sacLoading && sacItems.length > 0 && (
              <>
                <input
                  type="search"
                  value={materielSearch}
                  onChange={(e) => setMaterielSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="w-full bg-white border-2 border-[#D1D8E0] rounded-xl px-4 py-3 text-sm text-[#1C1F26] placeholder-[#D1D8E0] outline-none focus:border-[#2E86C1]"
                />
                <div className="space-y-2">
                  {sacItems
                    .filter((item) => item.name.toLowerCase().includes(materielSearch.toLowerCase()))
                    .map((item) => {
                      const selected = !!materiel[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-xl border-2 transition-colors ${
                            selected ? "border-[#2E86C1]" : "border-[#D1D8E0]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleMateriel(item.id)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                          >
                            <span className={`font-semibold text-sm ${selected ? "text-[#2E86C1]" : "text-[#1C1F26]"}`}>
                              {item.name}
                            </span>
                            <span className="text-xs text-[#8694A7] font-mono">stock: {item.qty_current}</span>
                          </button>
                          {selected && (
                            <div className="border-t border-[#EBF5FB] flex items-center justify-between px-4 py-2">
                              <span className="text-xs font-semibold text-[#5D6D7E]">Qté utilisée</span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setQty(item.id, (materiel[item.id] ?? 1) - 1)}
                                  className="w-8 h-8 rounded-full bg-[#F0F2F5] text-[#1C1F26] font-bold text-lg flex items-center justify-center"
                                >
                                  −
                                </button>
                                <span className="font-bold text-[#1C1F26] w-6 text-center">{materiel[item.id]}</span>
                                <button
                                  type="button"
                                  onClick={() => setQty(item.id, (materiel[item.id] ?? 1) + 1)}
                                  className="w-8 h-8 rounded-full bg-[#2E86C1] text-white font-bold text-lg flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]">
                Passer
              </button>
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl">
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Destination */}
        {!gardeLoading && currentKey === "destination" && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Destination</h2>

            {isCommercialSimple ? (
              /* Ville autocomplete pour missions commerciales simples */
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={villeQuery}
                    onChange={(e) => {
                      setVilleQuery(e.target.value);
                      setDestination(e.target.value);
                    }}
                    placeholder="Rechercher une ville…"
                    className="w-full bg-white border-2 border-[#D1D8E0] rounded-xl px-4 py-4 text-sm text-[#1C1F26] placeholder-[#D1D8E0] outline-none focus:border-[#2E86C1]"
                  />
                </div>
                {villeSuggestions.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-[#D1D8E0] divide-y divide-[#F0F2F5] overflow-hidden">
                    {villeSuggestions.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const label = v.departement ? `${v.nom} (${v.departement.nom})` : v.nom;
                          setDestination(label);
                          setVilleQuery(label);
                          setVilleSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-[#1C1F26] hover:bg-[#EBF5FB] transition-colors"
                      >
                        <span className="font-semibold">{v.nom}</span>
                        {v.departement && (
                          <span className="text-[#8694A7] ml-1.5">{v.departement.nom}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Liste statique pour SAMU / urgence */
              <>
                <div className="space-y-2">
                  {DESTINATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDestination(d)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        destination === d
                          ? "bg-[#EBF5FB] text-[#1A5276] border-[#2E86C1]"
                          : "bg-white text-[#1C1F26] border-[#D1D8E0]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#5D6D7E] mb-2 uppercase tracking-wide">Autre</div>
                  <input
                    type="text"
                    value={DESTINATIONS.includes(destination) ? "" : destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Préciser…"
                    className="w-full bg-white border-2 border-[#D1D8E0] rounded-xl px-4 py-3.5 text-sm text-[#1C1F26] placeholder-[#D1D8E0] outline-none focus:border-[#2E86C1]"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]">
                Passer
              </button>
              <button type="button" onClick={next} className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl">
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Valider */}
        {!gardeLoading && currentKey === "valider" && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Récapitulatif</h2>

            <div className="bg-white rounded-2xl border border-[#D1D8E0] divide-y divide-[#F0F2F5]">
              {typeMission && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Mission</span>
                  <span className="font-bold text-[#1C1F26] text-sm">
                    {typeMission === "commercial" ? "🚑 Commerciale" : "🆘 SAMU"}
                  </span>
                </div>
              )}
              {typeMission === "commercial" ? (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Motif</span>
                  <span className="font-bold text-[#1C1F26] text-sm">{motifCommercial}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Catégorie</span>
                  <span className="font-bold text-[#1C1F26] text-sm">{cat?.emoji} {cat?.label}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Sexe</span>
                <span className="font-bold text-[#1C1F26] text-sm">
                  {SEXES.find((s) => s.value === sexe)!.label}
                </span>
              </div>
              {age && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Âge</span>
                  <span className="font-bold text-[#1C1F26] text-sm">{age} ans</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Destination</span>
                  <span className="font-bold text-[#1C1F26] text-sm">{destination}</span>
                </div>
              )}
              {gestes.length > 0 && (
                <div className="px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide block mb-2">Gestes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {gestes.map((g) => (
                      <span key={g} className="bg-[#EBF5FB] text-[#1A5276] text-xs font-semibold px-2.5 py-1 rounded-full">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedMateriel.length > 0 && (
                <div className="px-4 py-3.5">
                  <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide block mb-2">Matériel</span>
                  <div className="space-y-1">
                    {selectedMateriel.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-[#1C1F26]">{item.name}</span>
                        <span className="text-[#8694A7] font-mono">×{materiel[item.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#FDEDEC] border border-[#F1948A] rounded-xl px-4 py-3 text-[#922B21] text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || (typeMission === "commercial" ? !motifCommercial : !categorie)}
              className="w-full py-4 bg-[#27AE60] text-white font-bold text-base rounded-xl disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
