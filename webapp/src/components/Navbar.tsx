"use client";

import React, { useState } from "react";
import { Terminal, Database, Activity, Binary, HelpCircle, Sun, Moon } from "lucide-react";
import { QuickGuideModal } from "@/components/QuickGuideModal";
import { useTheme } from "@/context/ThemeContext";

interface NavbarProps {
  activeTab: "ingest" | "pricing" | "answers";
  setActiveTab: (tab: "ingest" | "pricing" | "answers") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <>
      <header className={`border-b text-xs font-mono select-none sticky top-0 z-40 transition-colors duration-150 ${
        isLight 
          ? "border-slate-200 bg-white text-slate-800 shadow-xs" 
          : "border-[#1E293B] bg-[#070A12] text-slate-100"
      }`}>
        {/* Top Telemetry Ticker */}
        <div className={`border-b px-3 sm:px-6 py-1.5 flex items-center justify-between text-xs ${
          isLight 
            ? "bg-slate-50/90 border-slate-200 text-slate-600" 
            : "bg-[#04060A] border-[#151D2C] text-slate-400"
        }`}>
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className={`font-bold tracking-wider ${isLight ? "text-slate-900" : "text-slate-200"}`}>HOTEL PLUS</span>
            <span className={isLight ? "text-slate-300" : "text-slate-600"}>/</span>
            <span className={isLight ? "text-slate-600" : "text-slate-300"}>โรงแรม โฮเทล พลัส พัทยา (144 ห้อง)</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded border font-bold transition-all ${
                isLight
                  ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200"
              }`}
              title={isLight ? "สลับไปโหมดมืด" : "สลับไปโหมดสว่าง"}
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-amber-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isLight ? "โหมดมืด" : "โหมดสว่าง"}</span>
            </button>

            <span className={`${isLight ? "text-slate-300" : "text-slate-600"} hidden md:inline`}>|</span>
            <span className={`${isLight ? "text-slate-600" : "text-slate-400"} hidden md:inline font-mono`}>
              กฎคำนวณราคา: <strong className="text-emerald-600 dark:text-emerald-400">P0–P8 ใช้งานอยู่</strong>
            </span>
          </div>
        </div>

        {/* Main Navigation Bar - Full Width with Mobile Scrollable Tabs */}
        <div className="w-full px-2 sm:px-4 md:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 sm:space-x-4 w-full md:w-auto justify-between md:justify-start">
            {/* Terminal Logo Badge */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className={`px-2.5 py-1.5 rounded border font-bold text-xs sm:text-sm flex items-center space-x-2 ${
                isLight 
                  ? "bg-slate-100 border-slate-300 text-sky-700" 
                  : "bg-[#0F172A] border-[#334155] text-cyan-400"
              }`}>
                <Terminal className="w-4 h-4" />
                <span className="tracking-wide">ระบบบริหารราคาห้องพัก</span>
              </div>
            </div>

            {/* Quick Guide Trigger on Mobile */}
            <div className="md:hidden flex items-center space-x-1.5">
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded border text-xs font-mono transition-all ${
                  isLight
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-[#111827] border-[#334155] text-amber-400"
                }`}
                title="สลับโหมดสี"
              >
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setGuideOpen(true)}
                className={`px-2.5 py-1 rounded border text-xs font-mono transition-all flex items-center space-x-1 ${
                  isLight 
                    ? "bg-slate-100 border-slate-300 text-slate-700" 
                    : "bg-[#111827] border-[#334155] text-slate-300"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                <span>คู่มือการใช้งาน</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Horizontally scrollable on mobile */}
          <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5">
            <nav className={`flex items-center space-x-1.5 p-1 rounded-lg border min-w-max ${
              isLight 
                ? "bg-slate-100 border-slate-200" 
                : "bg-[#0B0F19] border-[#1E293B]"
            }`}>
              <button
                onClick={() => setActiveTab("ingest")}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm transition-all flex items-center space-x-2 ${
                  activeTab === "ingest"
                    ? isLight
                      ? "bg-white text-sky-700 font-bold border border-sky-300 shadow-xs"
                      : "bg-[#1E293B] text-cyan-300 font-bold border border-[#38BDF8]/40 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#131B2E]"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>[1] นำเข้าและตรวจสอบข้อมูล (Ingest & OCR)</span>
              </button>

              <button
                onClick={() => setActiveTab("pricing")}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm transition-all flex items-center space-x-2 ${
                  activeTab === "pricing"
                    ? isLight
                      ? "bg-white text-sky-700 font-bold border border-sky-300 shadow-xs"
                      : "bg-[#1E293B] text-cyan-300 font-bold border border-[#38BDF8]/40 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#131B2E]"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>[2] ระบบคำนวณราคาห้องพัก (Dynamic Pricing)</span>
              </button>

              <button
                onClick={() => setActiveTab("answers")}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm transition-all flex items-center space-x-2 ${
                  activeTab === "answers"
                    ? isLight
                      ? "bg-white text-amber-700 font-bold border border-amber-300 shadow-xs"
                      : "bg-[#1E293B] text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#131B2E]"
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>[3] รายงานผลการประเมิน (Assessment Log)</span>
              </button>
            </nav>
          </div>

          {/* Quick Guide Trigger on Desktop */}
          <div className="hidden md:flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setGuideOpen(true)}
              className={`px-2.5 py-1 rounded border text-xs font-mono transition-all flex items-center space-x-1.5 ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" 
                  : "bg-[#111827] hover:bg-[#1F2937] border-[#334155] text-slate-300 hover:text-white"
              }`}
            >
              <HelpCircle className={`w-3.5 h-3.5 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span>คู่มือการใช้งาน</span>
            </button>
          </div>
        </div>
      </header>

      {/* Guide Modal */}
      <QuickGuideModal 
        isOpen={guideOpen} 
        onClose={() => setGuideOpen(false)} 
        onNavigateTab={setActiveTab}
      />
    </>
  );
};
