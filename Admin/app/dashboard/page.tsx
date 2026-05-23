"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { api } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import type { AdminStats } from "@/lib/types";

const CATEGORIES: Record<string, string> = {
  respi: "Respiratoire",
  cardio: "Cardiologie",
  trauma: "Traumatologie",
  neuro: "Neurologie",
  pediatrie: "Pédiatrie",
  psychiatrie: "Psychiatrie",
  autre: "Autre",
};

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}

function StatCard({ label, value, sub, accent, danger }: StatCardProps) {
  const valueColor = danger
    ? "text-[#C0392B]"
    : accent
    ? "text-[#2E86C1]"
    : "text-[#0A1E3D]";

  return (
    <div className="bg-white rounded-lg border border-[#D1D8E0] p-5">
      <div className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className={`font-bold text-3xl font-mono ${valueColor}`}>{value}</div>
      {sub && <div className="text-[#8694A7] text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<AdminStats>("/admin/stats").then(setStats).catch(console.error);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
        <div className="text-[#8694A7] text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="space-y-8">

        <div>
          <h1 className="text-[#0A1E3D] text-2xl font-bold">Dashboard</h1>
          <p className="text-[#8694A7] text-sm mt-1">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {stats ? (
          <>
            <section>
              <h2 className="text-[#0A1E3D] text-sm font-bold uppercase tracking-wide mb-3">
                Utilisateurs
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Total" value={stats.utilisateurs.total} />
                <StatCard label="Premium" value={stats.utilisateurs.premium} accent />
                <StatCard label="Actifs 7j" value={stats.utilisateurs.actifs_7j} />
                <StatCard label="Nouveaux 30j" value={stats.utilisateurs.nouveaux_30j} accent />
                <StatCard label="Bloqués" value={stats.utilisateurs.bloques} danger={stats.utilisateurs.bloques > 0} />
              </div>
            </section>

            <section>
              <h2 className="text-[#0A1E3D] text-sm font-bold uppercase tracking-wide mb-3">
                Interventions
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard label="Total" value={stats.interventions.total} />
                <StatCard label="Aujourd'hui" value={stats.interventions.aujourd_hui} accent />
                <StatCard label="Ce mois" value={stats.interventions.ce_mois} />
              </div>

              {Object.keys(stats.interventions.par_categorie).length > 0 && (
                <div className="bg-white rounded-lg border border-[#D1D8E0] p-5">
                  <div className="text-[#8694A7] text-xs font-semibold uppercase tracking-wide mb-3">
                    Par catégorie
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.interventions.par_categorie)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => {
                        const total = stats.interventions.total || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={cat} className="flex items-center gap-3">
                            <div className="w-28 text-[#1C1F26] text-sm shrink-0">
                              {CATEGORIES[cat] ?? cat}
                            </div>
                            <div className="flex-1 bg-[#F0F2F5] rounded-full h-2">
                              <div
                                className="bg-[#2E86C1] h-2 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="w-8 text-right text-[#8694A7] text-sm font-mono shrink-0">
                              {count}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[#0A1E3D] text-sm font-bold uppercase tracking-wide mb-3">
                Gardes
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Total" value={stats.gardes.total} />
                <StatCard label="Ce mois" value={stats.gardes.ce_mois} accent />
              </div>
            </section>
          </>
        ) : (
          <div className="text-[#8694A7] text-sm">Chargement des statistiques...</div>
        )}

      </div>
    </AdminLayout>
  );
}
