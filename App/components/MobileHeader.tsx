"use client";

import type { User } from "@/lib/types";

interface Props {
  title: string;
  user?: User | null;
  showBack?: boolean;
  onBack?: () => void;
}

export default function MobileHeader({ title, user, showBack, onBack }: Props) {
  return (
    <div className="bg-[#0A1E3D] border-b-2 border-[#2E86C1] px-4 pt-12 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button onClick={onBack} className="text-[#5DADE2] p-1 mr-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <svg width="32" height="32" viewBox="0 0 120 120" fill="none">
            <defs>
              <linearGradient id="cb" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0A1E3D"/>
                <stop offset="100%" stopColor="#132E5B"/>
              </linearGradient>
              <linearGradient id="cc" x1="40" y1="30" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#5DADE2"/>
                <stop offset="100%" stopColor="#2E86C1"/>
              </linearGradient>
            </defs>
            <rect width="120" height="120" rx="26" fill="url(#cb)"/>
            <path d="M52 32H68V48H84V64H68V88H52V64H36V48H52Z" fill="url(#cc)"/>
            <path d="M24 76L40 76L46 66L52 82L58 70L62 76L96 76" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" fill="none"/>
          </svg>
          <h1 className="text-white font-bold text-lg">
            Assist<span className="text-[#5DADE2]">Ambu</span>
          </h1>
        </div>
        {user && (
          <div className="text-right">
            <div className="text-white text-sm font-semibold">{user.first_name}</div>
            <div className="text-[#5DADE2] text-xs font-mono">
              {user.statut.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}