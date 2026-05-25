"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import type { Garde } from "@/lib/types";

export function useGardeActive(user: User | null) {
  const [garde, setGarde] = useState<Garde | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<Garde | null>("/gardes/active");
      setGarde(res?.id != null ? res : null);
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
