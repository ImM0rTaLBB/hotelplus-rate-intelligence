"use client";

import React, { useState } from "react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { Navbar } from "@/components/Navbar";
import { PageIngestion } from "@/components/PageIngestion";
import { PagePricing } from "@/components/PagePricing";
import { PageAnswers } from "@/components/PageAnswers";

function MainApp() {
  const [activeTab, setActiveTab] = useState<"ingest" | "pricing" | "answers">("pricing");
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen transition-colors duration-150 ${isLight ? "bg-[#F8FAFC] text-slate-900 selection:bg-sky-200 selection:text-sky-900" : "bg-[#090D16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200"}`}>
      {/* Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container - Full Width & Mobile Responsive */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === "ingest" && <PageIngestion />}
        {activeTab === "pricing" && <PagePricing />}
        {activeTab === "answers" && <PageAnswers />}
      </main>

      {/* Modern Minimal Footer - Full Width */}
      <footer className={`border-t py-6 mt-12 text-xs sm:text-sm font-mono ${isLight ? "bg-white border-slate-200 text-slate-600" : "border-slate-900 bg-[#060910] text-slate-400"}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span className={`font-bold ${isLight ? "text-slate-800" : "text-slate-300"}`}>ระบบบริหารและวิเคราะห์ราคาห้องพัก Hotel Plus</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>กฎคำนวณราคา P0 → P8 ทำงานสมบูรณ์</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
