"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Garde } from "@/lib/types";

export function useGardeActive() {
  const { user } = useAuth();
  const [garde, setGarde] = useState<Garde | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<Garde | null>("/gardes/active");
      setGarde(res ?? null);
    } catch {
      setGarde(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  return { garde, loading, refresh };
}
