"use client";

import Sidebar from "@/components/Sidebar";
import type { User } from "@/lib/types";

interface Props {
  user: User | null;
  children: React.ReactNode;
}

export default function AdminLayout({ user, children }: Props) {
  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <Sidebar user={user} />
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
