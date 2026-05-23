"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { api } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import type { ServiceStatus } from "@/lib/types";

const SERVICE_LABELS: Record<string, string> = {
  app: "Application mobile",
  api: "API",
  auth: "Authentification",
};

export default function MaintenancePage() {
  const { user, loading } = useAdminAuth();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<ServiceStatus[]>("/admin/services").then(setServices).catch(console.error);
  }, [user]);

  async function toggle(s: ServiceStatus) {
    const next = !s.is_maintenance;
    let message: string | null = null;

    if (next) {
      message = window.prompt(
        `Message de maintenance pour "${SERVICE_LABELS[s.service] ?? s.service}" (optionnel) :`,
        ""
      );
      if (message === null) return;
    } else {
      if (!confirm(`Remettre "${SERVICE_LABELS[s.service] ?? s.service}" en ligne ?`)) return;
    }

    setActionLoading(s.service);
    try {
      const updated = await api.put<ServiceStatus>(
        `/admin/services/${s.service}/maintenance`,
        { is_maintenance: next, message: message || null }
      );
      setServices((prev) =>
        prev.map((item) => (item.service === s.service ? updated : item))
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
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
    <AdminLayout user={user}>
      <div className="space-y-6">

        <div>
          <h1 className="text-[#0A1E3D] text-2xl font-bold">Maintenance</h1>
          <p className="text-[#8694A7] text-sm mt-1">
            État des services et mode maintenance
          </p>
        </div>

        {services.length === 0 && (
          <div className="bg-white rounded-lg border border-[#D1D8E0] p-6 text-center text-[#8694A7] text-sm">
            Aucun service configuré
          </div>
        )}

        <div className="grid gap-4 max-w-2xl">
          {services.map((s) => {
            const isActing = actionLoading === s.service;
            return (
              <div
                key={s.service}
                className="bg-white rounded-lg border border-[#D1D8E0] p-5 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0",
                      s.is_maintenance ? "bg-[#D4860B]" : "bg-[#1D8348]",
                    ].join(" ")}
                  />
                  <div>
                    <div className="text-[#0A1E3D] font-semibold text-sm">
                      {SERVICE_LABELS[s.service] ?? s.service}
                    </div>
                    <div className="text-[#8694A7] text-xs font-mono mt-0.5">
                      {s.service}
                    </div>
                    {s.is_maintenance && s.message && (
                      <div className="text-[#D4860B] text-xs mt-1.5 bg-[#FBF1E0] px-2 py-1 rounded">
                        {s.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={[
                      "text-xs font-semibold px-2 py-1 rounded",
                      s.is_maintenance
                        ? "bg-[#FBF1E0] text-[#D4860B]"
                        : "bg-[#E6F2EC] text-[#1D8348]",
                    ].join(" ")}
                  >
                    {s.is_maintenance ? "En maintenance" : "En ligne"}
                  </span>
                  <button
                    disabled={isActing}
                    onClick={() => toggle(s)}
                    className={[
                      "text-sm font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50",
                      s.is_maintenance
                        ? "bg-[#1D8348] text-white hover:bg-[#196B3D]"
                        : "bg-[#D4860B] text-white hover:bg-[#B8720A]",
                    ].join(" ")}
                  >
                    {isActing
                      ? "..."
                      : s.is_maintenance
                      ? "Remettre en ligne"
                      : "Activer maintenance"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminLayout>
  );
}
