"use client";

import { useState } from "react";
import NameTagGenerator from "@/components/NameTagGenerator";
import ClassTimer from "@/components/ClassTimer";
import RandomPicker from "@/components/RandomPicker";

type Tab = "nametag" | "timer" | "random";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "nametag", label: "이름표", icon: "🪪" },
  { id: "timer", label: "타이머", icon: "⏱️" },
  { id: "random", label: "뽑기", icon: "🎲" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("nametag");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="chalk-header">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black text-lg select-none">
              쌤
            </div>
            <div>
              <h1 className="chalk-text text-xl font-bold leading-tight">쌤툴</h1>
              <p className="text-[#A8D5B7] text-xs">한국어 강사 수업 도구</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chalk-badge text-xs hidden sm:inline">MVP</span>
            <button className="text-[#A8D5B7] hover:text-white text-sm transition-colors px-3 py-1.5 rounded border border-[#2D6A4F] hover:border-[#A8D5B7]">
              로그인
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-md transition-all ${
                activeTab === tab.id
                  ? "bg-[#F5F0E8] text-[#1B4332] font-bold"
                  : "text-[#A8D5B7] hover:text-white hover:bg-[#2D6A4F]"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === "nametag" && <NameTagGenerator />}
        {activeTab === "timer" && <ClassTimer />}
        {activeTab === "random" && <RandomPicker />}
      </main>

      <footer className="text-center py-4 text-xs text-[#9A9A9A] border-t border-[#E8E0D0]">
        쌤툴 MVP · 한국어 강사를 위한 수업 도구
      </footer>
    </div>
  );
}
