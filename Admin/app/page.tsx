"use client";

import { useEffect } from "react";
import { setToken, isAuthenticated, redirectToAuth } from "@/lib/auth";

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setToken(token);
      window.location.href = "/dashboard";
      return;
    }

    if (isAuthenticated()) {
      window.location.href = "/dashboard";
    } else {
      redirectToAuth();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1E3D] flex items-center justify-center">
      <div className="text-[#8694A7] text-sm">Chargement...</div>
    </div>
  );
}
