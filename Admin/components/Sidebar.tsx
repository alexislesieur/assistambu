"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/auth";
import type { User } from "@/lib/types";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/utilisateurs",
    label: "Utilisateurs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: "/articles",
    label: "Articles",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/maintenance",
    label: "Maintenance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
];

interface Props {
  user: User | null;
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-[#0A1E3D] flex flex-col z-40">
      <div className="px-5 py-6 border-b border-[#132E5B]">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 120 120" fill="none">
            <rect width="120" height="120" rx="26" fill="#0A1E3D"/>
            <path d="M52 32H68V48H84V64H68V88H52V64H36V48H52Z" fill="#2E86C1"/>
            <path d="M24 76L40 76L46 66L52 82L58 70L62 76L96 76" stroke="#5DADE2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <div className="text-white font-bold text-base leading-tight">
              Assist<span className="text-[#5DADE2]">Ambu</span>
            </div>
            <div className="text-[#5DADE2] text-xs font-mono">Administration</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-[#132E5B] text-white border-l-2 border-[#2E86C1] pl-[10px]"
                  : "text-[#8694A7] hover:bg-[#0D2545] hover:text-white",
              ].join(" ")}
            >
              <span className={active ? "text-[#2E86C1]" : "text-[#8694A7]"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="px-3 py-4 border-t border-[#132E5B]">
          <div className="px-3 py-2 mb-1">
            <div className="text-white text-sm font-semibold">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-[#8694A7] text-xs truncate">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-[#8694A7] hover:bg-[#0D2545] hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      )}
    </aside>
  );
}
