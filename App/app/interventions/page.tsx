"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import type { Intervention, PaginatedResponse } from "@/lib/types";

type Categorie = Intervention["categorie"];

const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: "respi", label: "Respi" },
  { value: "cardio", label: "Cardio" },
  { value: "trauma", label: "Trauma" },
  { value: "neuro", label: "Neuro" },
  { value: "pediatrie", label: "Pédiatrie" },
  { value: "psychiatrie", label: "Psychiatrie" },
  { value: "autre", label: "Autre" },
];

const CATEGORIE_COLORS: Record<Categorie, { bg: string; text: string }> = {
  respi:       { bg: "bg-[#EBF5FB]", text: "text-[#1A5276]" },
  cardio:      { bg: "bg-[#FDEDEC]", text: "text-[#922B21]" },
  trauma:      { bg: "bg-[#FEF9E7]", text: "text-[#9A6B0B]" },
  neuro:       { bg: "bg-[#F4ECF7]", text: "text-[#6C3483]" },
  pediatrie:   { bg: "bg-[#FDEEF4]", text: "text-[#943D7C]" },
  psychiatrie: { bg: "bg-[#E8F8F5]", text: "text-[#1A7A6A]" },
  autre:       { bg: "bg-[#F2F3F4]", text: "text-[#5D6D7E]" },
};

const BORDER_COLORS: Record<Categorie, string> = {
  respi:       "border-[#2E86C1]",
  cardio:      "border-[#C0392B]",
  trauma:      "border-[#D4860B]",
  neuro:       "border-[#8E44AD]",
  pediatrie:   "border-[#C0396B]",
  psychiatrie: "border-[#1ABC9C]",
  autre:       "border-[#8694A7]",
};

export default function InterventionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [categorie, setCategorie] = useState<Categorie | "">("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildQuery(p: number, s: string, c: string) {
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set("search", s);
    if (c) params.set("categorie", c);
    return `/interventions?${params.toString()}`;
  }

  async function load(p: number, s: string, c: string, append: boolean) {
    setFetching(true);
    try {
      const res = await api.get<PaginatedResponse<Intervention>>(buildQuery(p, s, c));
      setInterventions((prev) => (append ? [...prev, ...res.data] : res.data));
      setLastPage(res.last_page);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load(1, search, categorie, false);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(1, value, categorie, false);
    }, 400);
  }

  function handleCategorie(value: Categorie | "") {
    setCategorie(value);
    setPage(1);
    load(1, search, value, false);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    load(next, search, categorie, true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <MobileHeader title="Journal" user={user} />

      <div className="px-4 py-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-[#1C1F26] text-xl font-bold">Journal</h2>
          <button
            onClick={() => router.push("/interventions/nouvelle")}
            className="bg-[#2E86C1] text-white text-sm font-semibold px-3 py-2 rounded-lg"
          >
            + Intervention
          </button>
        </div>

        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8694A7]"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher motif, destination…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white border border-[#D1D8E0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1C1F26] placeholder-[#8694A7] outline-none focus:border-[#2E86C1]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => handleCategorie("")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              categorie === ""
                ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                : "bg-white text-[#8694A7] border-[#D1D8E0]"
            }`}
          >
            Toutes
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategorie(cat.value)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                categorie === cat.value
                  ? "bg-[#2E86C1] text-white border-[#2E86C1]"
                  : "bg-white text-[#8694A7] border-[#D1D8E0]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {fetching && interventions.length === 0 && (
          <div className="text-center py-10 text-[#8694A7] text-sm">Chargement…</div>
        )}

        {!fetching && interventions.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D1D8E0] p-6 text-center">
            <p className="text-[#8694A7] text-sm">Aucune intervention trouvée</p>
            {!search && !categorie && (
              <button
                onClick={() => router.push("/interventions/nouvelle")}
                className="mt-3 inline-block bg-[#2E86C1] text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Nouvelle intervention
              </button>
            )}
          </div>
        )}

        {interventions.length > 0 && (
          <div className="space-y-2">
            {interventions.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border border-[#D1D8E0] border-l-4 ${BORDER_COLORS[item.categorie]} p-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#0A1E3D] font-bold text-sm truncate">{item.motif}</span>
                      {item.is_locked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8694A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORIE_COLORS[item.categorie].bg} ${CATEGORIE_COLORS[item.categorie].text}`}>
                        {CATEGORIES.find((c) => c.value === item.categorie)?.label ?? item.categorie}
                      </span>
                      {item.destination && (
                        <span className="text-[#8694A7] text-xs truncate">{item.destination}</span>
                      )}
                    </div>
                    {item.gestes.length > 0 && (
                      <div className="text-[#8694A7] text-xs mt-1 truncate">
                        {item.gestes.slice(0, 3).join(" · ")}{item.gestes.length > 3 ? " …" : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-[#8694A7] text-xs font-mono shrink-0">
                    {new Date(item.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {page < lastPage && (
          <button
            onClick={handleLoadMore}
            disabled={fetching}
            className="w-full py-3 bg-white border border-[#D1D8E0] rounded-xl text-[#2E86C1] text-sm font-semibold disabled:opacity-50"
          >
            {fetching ? "Chargement…" : "Charger plus"}
          </button>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
