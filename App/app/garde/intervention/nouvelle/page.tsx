"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import type { Intervention, SacItem } from "@/lib/types";

type Categorie = Intervention["categorie"];
type Sexe = Intervention["patient_sexe"];
type AgeRange = NonNullable<Intervention["patient_age_range"]>;

interface SacCatGroup { items: SacItem[] }
interface SacResponse { categories: Partial<Record<SacItem["categorie"], SacCatGroup>> }

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
  { value: "m",       label: "Homme" },
  { value: "f",       label: "Femme" },
  { value: "inconnu", label: "Inconnu" },
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

const STEPS = ["Catégorie", "Patient", "Gestes", "Matériel", "Destination", "Valider"];

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

  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [sexe, setSexe] = useState<Sexe>("inconnu");
  const [age, setAge] = useState("");
  const [gestes, setGestes] = useState<string[]>([]);
  const [sacItems, setSacItems] = useState<SacItem[]>([]);
  const [materiel, setMateriel] = useState<Record<number, number>>({});
  const [destination, setDestination] = useState("");

  const [sacLoading, setSacLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setSacLoading(true);
    api.get<SacResponse>("/sac")
      .then((res) => {
        const all = Object.values(res.categories).flatMap((g) => g?.items ?? []);
        setSacItems(all);
      })
      .finally(() => setSacLoading(false));
  }, [user]);

  function toggleGeste(g: string) {
    setGestes((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function toggleMateriel(id: number) {
    setMateriel((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQty(id: number, qty: number) {
    if (qty <= 0) {
      setMateriel((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setMateriel((prev) => ({ ...prev, [id]: qty }));
    }
  }

  async function handleSubmit() {
    if (!categorie) return;
    setError(null);
    setSubmitting(true);
    try {
      const catLabel = CATEGORIES.find((c) => c.value === categorie)!.label;
      const ageNum = age ? parseInt(age) : null;

      const materielPayload = Object.entries(materiel).map(([id, qty]) => {
        const item = sacItems.find((i) => i.id === parseInt(id));
        return {
          sac_item_id: parseInt(id),
          name: item?.name ?? "",
          qty_used: qty,
        };
      });

      const payload: Record<string, unknown> = {
        motif: catLabel,
        categorie,
        patient_sexe: sexe,
        ...(ageNum !== null ? { patient_age_range: ageToRange(ageNum) } : {}),
        ...(gestes.length ? { gestes } : {}),
        ...(materielPayload.length ? { materiel_consomme: materielPayload } : {}),
        ...(destination ? { destination } : {}),
        ...(gardeId ? { garde_id: parseInt(gardeId) } : {}),
      };

      await api.post("/interventions", payload);
      router.push(gardeId ? "/dashboard" : "/interventions");
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
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#2E86C1]" : "bg-[#D1D8E0]"
              }`}
            />
          ))}
        </div>
        <div className="text-[#8694A7] text-xs mt-1.5 text-right">
          Étape {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="flex-1 px-4 pb-6">

        {/* Étape 0 — Catégorie */}
        {step === 0 && (
          <div className="space-y-3 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Catégorie</h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setCategorie(c.value); setStep(1); }}
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

        {/* Étape 1 — Patient */}
        {step === 1 && (
          <div className="space-y-5 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Patient</h2>

            <div>
              <div className="text-xs font-semibold text-[#5D6D7E] mb-2 uppercase tracking-wide">Sexe</div>
              <div className="grid grid-cols-3 gap-2">
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
                  {ageToRange(parseInt(age)) === "pedia" && "Pédiatrie (< 18 ans)"}
                  {ageToRange(parseInt(age)) === "adult" && "Adulte (18–59 ans)"}
                  {ageToRange(parseInt(age)) === "senior" && "Senior (60–74 ans)"}
                  {ageToRange(parseInt(age)) === "elderly" && "Très âgé (75 ans et +)"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl"
            >
              Suivant
            </button>
          </div>
        )}

        {/* Étape 2 — Gestes */}
        {step === 2 && (
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
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]"
              >
                Passer
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 — Matériel sac */}
        {step === 3 && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Matériel utilisé</h2>

            {sacLoading && (
              <div className="text-center py-8 text-[#8694A7] text-sm">Chargement…</div>
            )}

            {!sacLoading && sacItems.length === 0 && (
              <div className="text-center py-8 text-[#8694A7] text-sm">Aucun article dans le sac</div>
            )}

            {!sacLoading && sacItems.length > 0 && (
              <div className="space-y-2">
                {sacItems.map((item) => {
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
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]"
              >
                Passer
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 — Destination */}
        {step === 4 && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Destination</h2>
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
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex-1 py-4 bg-[#F0F2F5] text-[#5D6D7E] font-bold text-base rounded-xl border border-[#D1D8E0]"
              >
                Passer
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex-1 py-4 bg-[#2E86C1] text-white font-bold text-base rounded-xl"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Étape 5 — Valider */}
        {step === 5 && (
          <div className="space-y-4 mt-2">
            <h2 className="text-[#1C1F26] text-lg font-bold">Récapitulatif</h2>

            <div className="bg-white rounded-2xl border border-[#D1D8E0] divide-y divide-[#F0F2F5]">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs font-semibold text-[#5D6D7E] uppercase tracking-wide">Catégorie</span>
                <span className="font-bold text-[#1C1F26] text-sm">{cat?.emoji} {cat?.label}</span>
              </div>
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
              disabled={submitting || !categorie}
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
