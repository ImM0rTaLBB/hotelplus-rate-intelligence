"use client";

import React, { useState } from "react";
import { Database, Activity, Binary, HelpCircle, Sun, Moon } from "lucide-react";
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
      <header className={`sticky top-0 z-40 transition-colors backdrop-blur-md border-b ${
        isLight 
          ? "bg-white/95 border-slate-200 text-slate-900" 
          : "bg-[#070A12]/95 border-slate-800 text-slate-100"
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Left: Brand & Property Identity */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              HP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-black text-base tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                  HOTEL PLUS
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  P0–P8 Active
                </span>
              </div>
              <div className={`text-xs font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                พัทยา (144 ห้อง) • ระบบคำนวณราคาอัจฉริยะ
              </div>
            </div>
          </div>

          {/* Center: Modern Seamless Tab Navigation (No boxy borders) */}
          <nav className={`flex items-center space-x-1 p-1 rounded-xl transition-all ${
            isLight ? "bg-slate-100/90 text-slate-700" : "bg-[#111827] text-slate-300"
          }`}>
            <button
              onClick={() => setActiveTab("ingest")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
                activeTab === "ingest"
                  ? isLight
                    ? "bg-white text-slate-950 shadow-xs"
                    : "bg-[#1F2937] text-white shadow-xs"
                  : isLight
                    ? "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                    : "text-slate-400 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span>1. ตรวจสอบข้อมูล OCR</span>
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
                activeTab === "pricing"
                  ? isLight
                    ? "bg-white text-slate-950 shadow-xs"
                    : "bg-[#1F2937] text-white shadow-xs"
                  : isLight
                    ? "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                    : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. ระบบราคา Dynamic</span>
            </button>

            <button
              onClick={() => setActiveTab("answers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
                activeTab === "answers"
                  ? isLight
                    ? "bg-white text-slate-950 shadow-xs"
                    : "bg-[#1F2937] text-white shadow-xs"
                  : isLight
                    ? "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                    : "text-slate-400 hover:text-white"
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-amber-600" />
              <span>3. รายงานโจทย์</span>
            </button>
          </nav>

          {/* Right: Quick Guide & Theme Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setGuideOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800" 
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">คู่มือโจทย์</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800" 
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
              title={isLight ? "สลับไปโหมดมืด" : "สลับไปโหมดสว่าง"}
            >
              {isLight ? <Moon className="w-4 h-4 text-slate-800" /> : <Sun className="w-4 h-4 text-amber-400" />}
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
