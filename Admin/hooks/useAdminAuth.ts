"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getToken, removeToken, redirectToAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      redirectToAuth();
      setLoading(false);
      return;
    }

    api
      .get<User>("/me")
      .then((u) => {
        if (!u.is_admin) {
          removeToken();
          redirectToAuth();
          return;
        }
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        removeToken();
        redirectToAuth();
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
