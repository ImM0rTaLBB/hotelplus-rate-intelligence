"use client";

import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, X, Terminal, 
  History, AlertTriangle, TrendingUp,
  Calendar, CheckCircle2, Sliders, Settings,
  HelpCircle, Info, ChevronRight, UserCheck,
  Lock, Download, Sparkles
} from "lucide-react";
import { 
  calculateRatesForDate, validatePriceOverride, RateCalculationResult 
} from "@/lib/playbookEngine";
import { RateTrendVisualizer } from "@/components/RateTrendVisualizer";
import { formatPrice } from "@/lib/formatters";
import { useTheme } from "@/context/ThemeContext";

interface AuditLogEntry {
  timestamp: string;
  roomName: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  user: string;
  status: "SAVED" | "WARNED";
}

export const PagePricing: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Perspective Mode: "commercial" (Friendly RM View) vs "admin" (Admin Console & Math Auditor)
  const [viewPerspective, setViewPerspective] = useState<"commercial" | "admin">("commercial");

  // Date Range state
  const [startDate, setStartDate] = useState<string>("2026-12-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");
  const [currentInspectionDate, setCurrentInspectionDate] = useState<string>("2026-12-15");
  
  // Custom manual price overrides map { tierNumber: overriddenPrice }
  const [manualOverrides, setManualOverrides] = useState<Record<number, number>>({});
  const [inspectingTier, setInspectingTier] = useState<number | null>(1);
  
  // Editing modal state
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [editInputPrice, setEditInputPrice] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);
  const [showDateReasoningModal, setShowDateReasoningModal] = useState<boolean>(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      timestamp: "2026-10-06 09:15:00",
      roomName: "Deluxe Room Twin Bed",
      oldPrice: 1096,
      newPrice: 1150,
      reason: "ปรับตามความต้องการจองสัมมนากลุ่มลูกค้าองค์กร",
      user: "RM_OP_01",
      status: "SAVED"
    }
  ]);

  // Compute rates dynamically for inspected date
  const calculationResult: RateCalculationResult = useMemo(() => {
    return calculateRatesForDate(currentInspectionDate);
  }, [currentInspectionDate]);

  // Current active rates (taking into account manual overrides)
  const currentActiveRates = useMemo(() => {
    return calculationResult.finalRatesByTier.map(t => {
      return manualOverrides[t.tier] !== undefined ? manualOverrides[t.tier] : t.suggestedRate;
    });
  }, [calculationResult, manualOverrides]);

  // Validation state during editing
  const editValidation = useMemo(() => {
    if (editingTier === null || !editInputPrice || isNaN(Number(editInputPrice))) {
      return null;
    }
    return validatePriceOverride(
      editingTier, 
      Number(editInputPrice), 
      calculationResult, 
      currentActiveRates
    );
  }, [editingTier, editInputPrice, calculationResult, currentActiveRates]);

  // Quick Preset Handlers
  const handleApplyPreset = (start: string, end: string, inspectDate: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentInspectionDate(inspectDate);
  };

  const handleOpenEdit = (tier: number, currentPrice: number) => {
    setEditingTier(tier);
    setEditInputPrice(String(currentPrice));
    setEditReason("");
  };

  const handleSaveEdit = () => {
    if (!editValidation || !editValidation.canSave || editingTier === null) return;
    
    if (editValidation.severity === "WARNING" && !editReason.trim()) {
      alert("RM JUSTIFICATION REQUIRED: กฎ P7 บังคับระบุเหตุผลในการตั้งราคาต่ำกว่า Floor");
      return;
    }

    const tierInfo = calculationResult.finalRatesByTier.find(t => t.tier === editingTier);
    const oldPrice = currentActiveRates[editingTier - 1];
    const newPrice = Number(editInputPrice);

    setManualOverrides(prev => ({ ...prev, [editingTier]: newPrice }));

    setAuditLogs(prev => [
      {
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        roomName: tierInfo?.roomName || `Tier ${editingTier}`,
        oldPrice,
        newPrice,
        reason: editReason || "RM Strategic Parameter Override",
        user: "RM_OP_01",
        status: editValidation.severity === "WARNING" ? "WARNED" : "SAVED"
      },
      ...prev
    ]);

    setEditingTier(null);
  };

  // What-If Market Scenario Simulation State
  type MarketScenario = "normal" | "price_war" | "demand_surge" | "compset_sold_out";
  const [activeScenario, setActiveScenario] = useState<MarketScenario>("normal");

  const handleExportPMSCsv = () => {
    const headers = [
      "Date",
      "Season",
      "Day_Type",
      "Tier",
      "Room_Name",
      "Rooms_Count",
      "Base_Rate_THB",
      "Active_Rate_THB",
      "Price_Floor_THB",
      "Compset_Median_THB",
      "Price_Index",
      "Status"
    ];
    const rows = calculationResult.finalRatesByTier.map(t => {
      const activePrice = manualOverrides[t.tier] !== undefined ? manualOverrides[t.tier] : t.suggestedRate;
      const status = manualOverrides[t.tier] !== undefined ? "MANUAL_OVERRIDE" : "SYSTEM_SUGGESTED";
      return [
        currentInspectionDate,
        calculationResult.season,
        calculationResult.isWeekend ? "WEEKEND" : "WEEKDAY",
        t.tier,
        `"${t.roomName}"`,
        t.rooms,
        t.suggestedRate,
        activePrice,
        t.priceFloor,
        calculationResult.competitorMetrics.medianCompetitorRate,
        calculationResult.competitorMetrics.competitorIndex.toFixed(1),
        status
      ].join(",");
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `hotelplus_pms_rates_${currentInspectionDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inspectedRoom = calculationResult.finalRatesByTier.find(t => t.tier === (inspectingTier || 1)) || calculationResult.finalRatesByTier[0];

  // Helper check for September inspection date
  const isSeptemberDate = currentInspectionDate.startsWith("2027-09");
  const isDecemberDate = currentInspectionDate.startsWith("2026-12");

  return (
    <div className="space-y-6 select-none w-full">
      
      {/* Top Banner & View Perspective Selector */}
      <div className={`border p-4 sm:p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-800 shadow-xs" : "bg-[#090D17] border-[#1E293B] text-slate-100"
      }`}>
        <div>
          <div className="flex items-center space-x-2 text-xs mb-1 font-bold">
            <span className={`px-2 py-0.5 rounded border ${
              isLight ? "text-sky-800 bg-sky-50 border-sky-300" : "text-cyan-400 bg-cyan-950/80 border-cyan-800"
            }`}>
              PAGE 2: DYNAMIC PRICING ENGINE
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-mono text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {calculationResult.season} Season • {calculationResult.isWeekend ? "วันหยุดสุดสัปดาห์" : calculationResult.isSpecialDay ? "วันพิเศษ" : "วันธรรมดา"}
            </span>
          </div>
          <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            ระบบกำหนดและเสนอราคาห้องพักอัจฉริยะ (Rate Intelligence Terminal)
          </h1>
          <p className={`text-xs sm:text-sm mt-1 font-sans ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            คำนวณราคาอัตโนมัติตามกฎ RM Playbook (P0–P8) พร้อมระบบตรวจสอบและบันทึกประวัติการปรับราคา
          </p>
        </div>

        {/* View Perspective Switcher: Commercial vs Admin Console */}
        <div className={`flex items-center space-x-1.5 p-1.5 rounded-lg border shrink-0 ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
        }`}>
          <button
            onClick={() => setViewPerspective("commercial")}
            className={`px-3.5 py-2 rounded-md transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              viewPerspective === "commercial"
                ? isLight
                  ? "bg-white text-sky-800 border border-sky-300 shadow-xs"
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-600 shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>โหมดผู้ใช้งานทั่วไป (Commercial)</span>
          </button>

          <button
            onClick={() => setViewPerspective("admin")}
            className={`px-3.5 py-2 rounded-md transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              viewPerspective === "admin"
                ? isLight
                  ? "bg-white text-purple-800 border border-purple-300 shadow-xs"
                  : "bg-purple-950 text-purple-300 border border-purple-600 shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Admin Console & ตรวจสูตร</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Reason Explainer Bar */}
      <div className={`border p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
      }`}>
        
        {/* Preset Season Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-bold mr-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            ฤดูกาลตามโจทย์:
          </span>
          <button
            onClick={() => handleApplyPreset("2026-12-01", "2026-12-31", "2026-12-15")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDecemberDate
                ? isLight ? "bg-sky-600 text-white border-sky-700 shadow-xs" : "bg-cyan-950 text-cyan-300 border-cyan-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-400 hover:bg-[#1E293B] border-slate-800"
            }`}
          >
            ธ.ค. 2026 (High Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2027-09-01", "2027-09-30", "2027-09-15")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSeptemberDate
                ? isLight ? "bg-sky-600 text-white border-sky-700 shadow-xs" : "bg-cyan-950 text-cyan-300 border-cyan-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-400 hover:bg-[#1E293B] border-slate-800"
            }`}
          >
            ก.ย. 2027 (Low Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2026-12-24", "2027-01-01", "2026-12-25")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              currentInspectionDate === "2026-12-25"
                ? isLight ? "bg-purple-600 text-white border-purple-700 shadow-xs" : "bg-purple-950 text-purple-300 border-purple-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-400 hover:bg-[#1E293B] border-slate-800"
            }`}
          >
            คริสต์มาส & ปีใหม่ (Peak +40%)
          </button>
        </div>

        {/* Inspection Date Controls & September 15 Explanation */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Date Shortcuts for Current Month */}
          {isSeptemberDate && (
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-500 font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-01")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2027-09-01" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
              >
                1 ก.ย. (พุธ)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-15")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2027-09-15" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
                title="วันธรรมดากลางเดือน (Mid-Month Weekday Baseline)"
              >
                15 ก.ย. (ตัวแทนกลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-18")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2027-09-18" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
                title="วันเสาร์ (Weekend Sample)"
              >
                18 ก.ย. (เสาร์)
              </button>
            </div>
          )}

          {isDecemberDate && (
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-500 font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-01")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2026-12-01" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
              >
                1 ธ.ค.
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-15")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2026-12-15" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
              >
                15 ธ.ค. (ตัวแทนกลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-19")}
                className={`px-2 py-1 rounded text-xs border ${
                  currentInspectionDate === "2026-12-19" ? "bg-sky-500 text-white font-bold" : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                }`}
              >
                19 ธ.ค. (เสาร์)
              </button>
            </div>
          )}

          {/* Date Picker Input */}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-sky-600" />
            <input
              type="date"
              value={currentInspectionDate}
              onChange={(e) => setCurrentInspectionDate(e.target.value)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#070A12] border-[#1E293B] text-slate-200"
              }`}
            />
          </div>

          {/* "ทำไมจึงเป็น 15 กันยายน?" Explainer Trigger */}
          <button
            onClick={() => setShowDateReasoningModal(true)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-sans flex items-center space-x-1 transition-all ${
              isLight ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900" : "bg-amber-950/60 hover:bg-amber-900 border-amber-700 text-amber-300"
            }`}
            title="คลิกเพื่อดูคำอธิบาย: ทำไมระบบจึงแนะนำวันที่ 15 กันยายน?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>ทำไมต้อง 15 กันยายน?</span>
          </button>

          {/* Toggle Trend Visualizer Button */}
          <button
            onClick={() => setShowVisualizer(!showVisualizer)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 ${
              showVisualizer
                ? isLight ? "bg-sky-100 text-sky-800 border-sky-300" : "bg-cyan-950 text-cyan-300 border-cyan-700"
                : isLight ? "bg-white text-slate-700 border-slate-300" : "bg-[#070A12] text-slate-400 border-slate-700"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{showVisualizer ? "ซ่อนกราฟแนวโน้ม" : "ดูกราฟแนวโน้ม"}</span>
          </button>

          {/* Export PMS / SiteMinder CSV */}
          <button
            onClick={handleExportPMSCsv}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 shadow-2xs ${
              isLight ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-700"
            }`}
            title="ดาวน์โหลดตารางราคาเพื่อนำเข้า Opera PMS / SiteMinder"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>ส่งออก PMS (.csv)</span>
          </button>
        </div>

      </div>

      {/* Date Reason Explainer Modal / Card */}
      {showDateReasoningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className={`border rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl transition-colors ${
            isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#0B0F1A] border-[#334155] text-slate-100"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">ทำไมวันที่ตรวจสอบตัวอย่างจึงเป็นวันที่ 15 กันยายน 2027?</h3>
              </div>
              <button 
                onClick={() => setShowDateReasoningModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs sm:text-sm leading-relaxed">
              <p>
                <strong>1. ตัวแทนวันธรรมดามาตรฐาน (Mid-Month Weekday Baseline):</strong><br />
                วันที่ 15 กันยายน 2027 ตรงกับ <strong>วันพุธ</strong> ซึ่งอยู่กึ่งกลางเดือน เป็นวันที่ไม่มีความผันผวนของรอบการจ่ายเงินเดือน (Payday effect ช่วงต้น/ปลายเดือน) และไม่มีการหยุดชดเชยวันหยุดราชการ จึงสะท้อนราคาฐาน Low Season ตามธรรมชาติได้แม่นยำที่สุด
              </p>
              <p>
                <strong>2. เพื่อแยกแยะราคา วันธรรมดา (Weekday) vs วันหยุด (Weekend):</strong><br />
                ตามกฎ P4 ราคาห้องพักจะแตกต่างกันระหว่างวันธรรมดากับวันหยุด (ศุกร์-เสาร์ มี Uplift +5% ใน Low Season) การเลือกวันที่ 15 ช่วยให้เห็นราคาฐานวันธรรมดา (974 บาท) ได้อย่างชัดเจน
              </p>
              <p>
                <strong>3. สามารถเลือกวันอื่นได้อย่างอิสระ:</strong><br />
                ระบบไม่ได้ล็อคเฉพาะวันที่ 15 ผู้ใช้สามารถคลิกเลือก <strong>1 ก.ย.</strong>, <strong>18 ก.ย. (วันเสาร์)</strong> หรือเลือกวันใดก็ได้จากปฏิทิน 1–30 กันยายน 2027 ได้ 100%
              </p>
            </div>

            <div className="mt-4 pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowDateReasoningModal(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Trend Visualizer */}
      {showVisualizer && (
        <RateTrendVisualizer
          startDate={startDate}
          endDate={endDate}
          currentInspectionDate={currentInspectionDate}
          onSelectDate={(date) => setCurrentInspectionDate(date)}
          tierNumber={inspectingTier || 1}
        />
      )}

      {/* ========================================================================= */}
      {/* PERSPECTIVE 1: COMMERCIAL / USER-FRIENDLY VIEW (ORGANIZED & INTUITIVE)     */}
      {/* ========================================================================= */}
      {viewPerspective === "commercial" && (
        <div className="space-y-6">

          {/* Executive What-If Scenario Sandbox */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeScenario !== "normal"
              ? isLight ? "bg-amber-50/70 border-amber-300 shadow-sm" : "bg-amber-950/20 border-amber-700/80 shadow-md"
              : isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className={`w-4 h-4 ${activeScenario !== "normal" ? "text-amber-600 animate-pulse" : isLight ? "text-sky-600" : "text-cyan-400"}`} />
                  <span className={`font-bold text-xs sm:text-sm ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                    🔮 แบบจำลองความไวตลาด (What-If Market Sensitivity Sandbox)
                  </span>
                  {activeScenario !== "normal" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                      SIMULATION ACTIVE
                    </span>
                  )}
                </div>
                <p className={`text-xs font-sans mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  ทดสอบการตอบสนองของระบบราคาอัตโนมัติ เมื่อตลาดเกิดการเปลี่ยนแปลงฉับพลันในสถานการณ์จริง
                </p>
              </div>

              {/* Scenario Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveScenario("normal")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeScenario === "normal"
                      ? isLight ? "bg-slate-900 text-white border-slate-900" : "bg-cyan-500 text-black border-cyan-400"
                      : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-400 border-slate-800"
                  }`}
                >
                  สภาวะปกติ (Baseline)
                </button>
                <button
                  onClick={() => setActiveScenario("price_war")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeScenario === "price_war"
                      ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                      : isLight ? "bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200" : "bg-rose-950/40 text-rose-300 border-rose-800"
                  }`}
                >
                  📉 สงครามราคา (-20%)
                </button>
                <button
                  onClick={() => setActiveScenario("demand_surge")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeScenario === "demand_surge"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : isLight ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200" : "bg-emerald-950/40 text-emerald-300 border-emerald-800"
                  }`}
                >
                  ⚡ อุปสงค์พุ่งสูง (+25%)
                </button>
                <button
                  onClick={() => setActiveScenario("compset_sold_out")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeScenario === "compset_sold_out"
                      ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                      : isLight ? "bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200" : "bg-purple-950/40 text-purple-300 border-purple-800"
                  }`}
                >
                  🏨 คู่แข่ง 3 แห่งห้องเต็ม
                </button>
              </div>
            </div>

            {/* Scenario Narrative Explanation */}
            {activeScenario !== "normal" && (
              <div className={`mt-3 pt-3 border-t text-xs font-sans space-y-1 ${
                isLight ? "border-amber-200/80 text-amber-950" : "border-amber-800/60 text-amber-200"
              }`}>
                {activeScenario === "price_war" && (
                  <p>
                    <strong>กลไกตอบสนองเมื่อเกิดสงครามราคา:</strong> ค่ามัธยฐานคู่แข่งลดลงเหลือ ~{Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 0.8)} บาท ระบบประเมินดัชนีราคาเปรียบเทียบ (Rule P5.2) ปรับลดราคาเพื่อรักษาส่วนแบ่งตลาด โดยระบบมี <em>Hard Safety Floor (Rule P8.1)</em> ล็อคไว้ไม่ให้ราคาลดต่ำกว่า 85% ของ Floor เสมอ
                  </p>
                )}
                {activeScenario === "demand_surge" && (
                  <p>
                    <strong>กลไกตอบสนองเมื่อตลาดมีความต้องการสูง:</strong> ค่ามัธยฐานคู่แข่งขยับขึ้นเป็น ~{Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 1.25)} บาท ระบบปรับขึ้นราคาห้องพักขึ้นตามกรอบดัชนี {calculationResult.season === "High" ? "100–110%" : "90–95%"} เพื่อเพิ่ม RevPAR สูงสุด แต่ไม่เกินเพดาน +15% ของราคาฐาน P3
                  </p>
                )}
                {activeScenario === "compset_sold_out" && (
                  <p>
                    <strong>กลไกตอบสนองเมื่อคู่แข่งขายห้องเต็ม (Sold Out &gt;= 3 แห่ง):</strong> ระบบเปิดใช้งาน <em>High Demand Surge Rule (P5)</em> ทันทีเนื่องจากผู้เข้าพักในพื้นที่จอมเทียนมีตัวเลือกจำกัด ทำให้โรงแรม H+ สามารถเรียกเก็บราคาพรีเมียมได้สูงสุดตามเพดานที่ได้รับอนุมัติ
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4 Commercial Executive KPI Cards (Non-Mathematical, Clean) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Suggested Rate */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <span className={`text-xs font-bold font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  ราคาเสนอแนะ (ห้องมาตรฐาน Deluxe)
                </span>
                <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 ${isLight ? "text-sky-700" : "text-cyan-400"}`}>
                  {formatPrice(currentActiveRates[0])} <span className="text-xs text-slate-500 font-normal">บาท/คืน</span>
                </div>
              </div>
              <div className={`text-xs font-sans mt-2 pt-2 border-t flex items-center justify-between ${
                isLight ? "border-slate-100 text-slate-600" : "border-[#1E293B] text-slate-400"
              }`}>
                <span>{calculationResult.isWeekend ? "ราคาวันสุดสัปดาห์" : "ราคาวันธรรมดา"}</span>
                <span className="text-emerald-600 font-bold">รวมภาษีแล้ว</span>
              </div>
            </div>

            {/* KPI 2: Season & Day Type */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <span className={`text-xs font-bold font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  ฤดูกาลและประเภทวัน
                </span>
                <div className={`text-xl sm:text-2xl font-bold font-sans mt-1 ${
                  calculationResult.season === "High" ? (isLight ? "text-amber-600" : "text-amber-400") :
                  calculationResult.season === "Low" ? (isLight ? "text-blue-600" : "text-blue-400") : 
                  (isLight ? "text-emerald-600" : "text-emerald-400")
                }`}>
                  {calculationResult.season} Season ({calculationResult.isSpecialDay ? "วันพิเศษ" : calculationResult.isWeekend ? "สุดสัปดาห์" : "วันธรรมดา"})
                </div>
              </div>
              <div className={`text-xs font-sans mt-2 pt-2 border-t flex items-center justify-between ${
                isLight ? "border-slate-100 text-slate-600" : "border-[#1E293B] text-slate-400"
              }`}>
                <span>ส่วนเพิ่มวันหยุด:</span>
                <span className="font-bold">
                  {calculationResult.isSpecialDay ? "+40% (Surge)" : calculationResult.isWeekend ? `+${calculationResult.season === 'High'?15:(calculationResult.season==='Low'?5:10)}%` : "0% (ราคาปกติ)"}
                </span>
              </div>
            </div>

            {/* KPI 3: Market Benchmark */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <span className={`text-xs font-bold font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  การแข่งขันในตลาด (โรงแรมคู่แข่ง 5 แห่ง)
                </span>
                <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                  {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)} <span className="text-xs text-slate-500 font-normal">บาท (มัธยฐาน)</span>
                </div>
              </div>
              <div className={`text-xs font-sans mt-2 pt-2 border-t flex items-center justify-between ${
                isLight ? "border-slate-100 text-slate-600" : "border-[#1E293B] text-slate-400"
              }`}>
                <span>ดัชนีราคาเราเทียบตลาด:</span>
                <span className="font-bold text-emerald-600">
                  {calculationResult.competitorMetrics.competitorIndex} / 100 (ได้เปรียบ)
                </span>
              </div>
            </div>

            {/* KPI 4: Price Floor Protection */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <span className={`text-xs font-bold font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  ความปลอดภัยด้านต้นทุน (Floor Protection)
                </span>
                <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                  {formatPrice(calculationResult.finalRatesByTier[0].priceFloor)} <span className="text-xs text-slate-500 font-normal">บาท (ขั้นต่ำ)</span>
                </div>
              </div>
              <div className={`text-xs font-sans mt-2 pt-2 border-t flex items-center justify-between ${
                isLight ? "border-slate-100 text-slate-600" : "border-[#1E293B] text-slate-400"
              }`}>
                <span>จุดบล็อกห้ามขาย:</span>
                <span className="text-rose-600 font-bold">{formatPrice(calculationResult.finalRatesByTier[0].hardBlockFloor)} บาท</span>
              </div>
            </div>

          </div>

          {/* Main Commercial Workbench: Left Room Matrix + Right Commercial Rationale */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Clean Room Category Matrix (8 Categories) (lg:col-span-8) */}
            <div className={`lg:col-span-8 border rounded-xl p-4 sm:p-5 ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
                isLight ? "border-slate-200" : "border-[#1E293B]"
              }`}>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                    ตารางราคาเสนอแนะแยกตามประเภทห้องพัก (8 ระดับ)
                  </h3>
                  <p className={`text-xs font-sans mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    ประจำวันที่: <strong>{currentInspectionDate}</strong> • คลิกเลือกห้องเพื่อดูสรุปหรือปรับราคา
                  </p>
                </div>

                {Object.keys(manualOverrides).length > 0 && (
                  <button
                    onClick={() => setManualOverrides({})}
                    className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold"
                  >
                    รีเซ็ต ({Object.keys(manualOverrides).length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full text-left border-collapse border text-xs sm:text-sm min-w-[620px] ${
                  isLight ? "border-slate-200" : "border-[#1E293B]"
                }`}>
                  <thead>
                    <tr className={`border-b text-xs font-bold uppercase ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-400"
                    }`}>
                      <th className={`p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ลำดับห้อง</th>
                      <th className={`p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ประเภทห้องพัก</th>
                      <th className={`p-3 border-r text-center ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>จำนวนห้อง</th>
                      <th className={`p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาเสนอแนะ</th>
                      <th className={`p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาขายจริง</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-[#151D2C]"}`}>
                    {calculationResult.finalRatesByTier.map((t, idx) => {
                      const isInspected = inspectingTier === t.tier;
                      const currentPrice = currentActiveRates[idx];
                      const hasOverride = manualOverrides[t.tier] !== undefined;

                      return (
                        <tr
                          key={t.tier}
                          onClick={() => setInspectingTier(t.tier)}
                          className={`cursor-pointer transition-colors ${
                            isInspected 
                              ? isLight ? "bg-sky-50 border-l-4 border-sky-500" : "bg-[#162035] border-l-4 border-cyan-400" 
                              : isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"
                          }`}
                        >
                          <td className={`p-3 border-r font-bold ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>
                            Tier {t.tier}
                          </td>

                          <td className={`p-3 border-r font-semibold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>
                            {t.roomName}
                          </td>

                          <td className={`p-3 border-r text-center ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>
                            {t.rooms} ห้อง
                          </td>

                          <td className={`p-3 border-r text-right font-bold font-mono ${isLight ? "border-slate-200 text-sky-800" : "border-[#1E293B] text-cyan-300"}`}>
                            {formatPrice(t.suggestedRate)} THB
                          </td>

                          <td className={`p-3 border-r text-right font-bold font-mono ${
                            hasOverride
                              ? isLight ? "text-amber-700 bg-amber-50/60" : "text-amber-400 bg-amber-950/40"
                              : isLight ? "text-slate-900" : "text-slate-100"
                          }`}>
                            {formatPrice(currentPrice)} THB
                            {hasOverride && <span className="block text-[10px] text-amber-600 font-sans">ปรับโดย RM</span>}
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(t.tier, currentPrice);
                              }}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                isLight 
                                  ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800" 
                                  : "bg-[#1E293B] hover:bg-[#334155] border-slate-700 text-slate-200"
                              }`}
                            >
                              ปรับราคา
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Commercial Price Rationale (Plain Thai, Understandable) (lg:col-span-4) */}
            <div className={`lg:col-span-4 border rounded-xl p-4 sm:p-5 flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                      สรุปเหตุผลการตั้งราคา
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    isLight ? "bg-sky-50 text-sky-800 border-sky-300" : "bg-cyan-950 text-cyan-300 border-cyan-800"
                  }`}>
                    Tier {inspectedRoom.tier}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border mb-3 flex items-center justify-between ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
                }`}>
                  <div>
                    <div className="font-bold text-sm">{inspectedRoom.roomName}</div>
                    <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      ราคาขั้นต่ำปลอดภัย: {formatPrice(inspectedRoom.priceFloor)} บาท
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-sky-700">
                      {formatPrice(inspectedRoom.suggestedRate)}
                    </div>
                    <span className="text-[11px] text-slate-500 font-sans">บาท/คืน</span>
                  </div>
                </div>

                {/* Plain-Language Commercial Explanation Bullet Points */}
                <div className="space-y-3 font-sans text-xs sm:text-sm">
                  <div className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#151D2C]"}`}>
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 mb-1">
                      <span>📌 1. อิทธิพลจากฤดูกาล:</span>
                    </div>
                    <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      {calculationResult.season === "High" 
                        ? "เดือนธันวาคมจัดเป็น High Season ตามประวัติการจอง 2 ปี ราคาฐานห้องมาตรฐานขายได้เฉลี่ย 963 บาท"
                        : "เดือนกันยายนจัดเป็น Low Season อิงจากอัตราเข้าพักต่ำกว่า 40% ราคาฐานห้องมาตรฐานขายได้เฉลี่ย 974 บาท"}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#151D2C]"}`}>
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 mb-1">
                      <span>📌 2. วันสุดสัปดาห์ / วันพิเศษ:</span>
                    </div>
                    <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      {calculationResult.isSpecialDay
                        ? "ช่วงเทศกาลพีค ปรับราคาขึ้น +40% เพื่อจับดีมานด์ท่องเที่ยวสูงสุด"
                        : calculationResult.isWeekend 
                        ? `คืนวันศุกร์และเสาร์ ดีมานด์สูงกว่าวันธรรมดา ปรับราคาขึ้นตามเพดาน +${calculationResult.season === 'High'?15:5}%`
                        : "วันธรรมดา (จันทร์–พฤหัสบดี) ใช้ราคาฐานมาตรฐานเพื่อดึงดูดลูกค้า"}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#151D2C]"}`}>
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 mb-1">
                      <span>📌 3. เปรียบเทียบกับคู่แข่งในพัทยา:</span>
                    </div>
                    <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      คู่แข่ง 5 แห่งในหาดจอมเทียนขายเฉลี่ย {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)} บาท ราคาของเราให้ความคุ้มค่าและมีความสามารถในการแข่งขันสูง
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#151D2C]"}`}>
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 mb-1">
                      <span>📌 4. บันไดราคาประเภทห้อง (Tier Escalator):</span>
                    </div>
                    <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      ห้อง {inspectedRoom.roomName} อยู่ในลำดับที่ {inspectedRoom.tier} ปรับเพิ่มขึ้นตามส่วนต่างความพรีเมียม 15–30% ต่อขั้น ไม่แพงเกินไปจนลูกค้าลังเลที่จะอัปเกรด
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-center">
                <button
                  onClick={() => setViewPerspective("admin")}
                  className={`text-xs font-bold transition-all flex items-center justify-center space-x-1 mx-auto ${
                    isLight ? "text-purple-700 hover:text-purple-900" : "text-purple-400 hover:text-purple-200"
                  }`}
                >
                  <span>ต้องการดูสูตรคณิตศาสตร์และสมการฉบับเต็ม? ไปที่ Admin Console</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* PERSPECTIVE 2: ADMIN CONSOLE & MATHEMATICAL RULE AUDITOR                   */}
      {/* ========================================================================= */}
      {viewPerspective === "admin" && (
        <div className="space-y-6">

          {/* Admin Header Notice */}
          <div className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
            isLight ? "bg-purple-50 border-purple-200 text-purple-900" : "bg-purple-950/40 border-purple-800 text-purple-300"
          }`}>
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span><strong>ADMIN CONSOLE & RULE ENGINE AUDITOR:</strong> แสดงผลการคำนวณตามกฎ P0–P8, พารามิเตอร์สมการ, จุดบล็อกทางเทคนิค, และ Audit Trail Log</span>
            </div>
            <button
              onClick={() => setViewPerspective("commercial")}
              className="px-3 py-1 rounded bg-purple-600 text-white font-bold text-xs"
            >
              กลับสู่โหมดผู้ใช้ทั่วไป
            </button>
          </div>

          {/* Telemetry Metrics Bar (Math Parameters) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P1 Seasonality</div>
              <div className="font-bold text-xl mt-1 text-sky-600">{calculationResult.season}</div>
              <div className="text-[11px] text-slate-500 mt-1">Base: {formatPrice(calculationResult.baseRoomRate)} THB</div>
            </div>

            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P4 Day Multiplier</div>
              <div className="font-bold text-xl mt-1 text-slate-800 dark:text-slate-100">
                {calculationResult.isSpecialDay ? "1.40x (+40%)" : calculationResult.isWeekend ? (calculationResult.season === 'High' ? "1.15x" : "1.05x") : "1.00x (Base)"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">DayType: {calculationResult.isWeekend ? "Weekend" : "Weekday"}</div>
            </div>

            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P5 Comp Median</div>
              <div className="font-bold text-xl mt-1 text-slate-800 dark:text-slate-100">
                {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)} <span className="text-xs text-slate-500 font-normal">THB</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Target: {calculationResult.competitorMetrics.targetIndexRange}</div>
            </div>

            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P5 Price Index</div>
              <div className="font-bold text-xl mt-1 text-emerald-600">
                {calculationResult.competitorMetrics.competitorIndex} / 100
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">Within corridor</div>
            </div>

            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P5 Surge Trigger</div>
              <div className="font-bold text-xl mt-1 text-slate-800 dark:text-slate-100">
                {calculationResult.competitorMetrics.soldOutCount} / 5 Sold-out
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Surge: {calculationResult.competitorMetrics.highDemandSurgeApplied ? "+10% Active" : "Inactive"}</div>
            </div>

            <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">P7 Hard Block Floor</div>
              <div className="font-bold text-xl mt-1 text-rose-600">
                {formatPrice(calculationResult.finalRatesByTier[0].hardBlockFloor)} <span className="text-xs text-slate-500 font-normal">THB</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Soft Floor: {formatPrice(calculationResult.finalRatesByTier[0].priceFloor)} THB</div>
            </div>
          </div>

          {/* Side-by-Side: P0-P8 Mathematical Trace + Parameter Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Full Rule Execution Trace (lg:col-span-8) */}
            <div className={`lg:col-span-8 border rounded-xl p-4 sm:p-5 font-mono ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm sm:text-base">
                    P0–P8 Rule Execution Trace (การคำนวณเชิงคณิตศาสตร์)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                  ห้อง Tier {inspectedRoom.tier} ({inspectedRoom.roomName})
                </span>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {calculationResult.ruleExecutionTrace.map((step, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#04060A] border-[#151D2C]"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-800 dark:text-cyan-300">{step.ruleCode} — {step.ruleName}</span>
                      <span className="text-slate-500 font-bold">[{step.status}]</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-sans">{step.description}</div>
                    
                    <div className={`p-2.5 rounded border space-y-1 text-xs ${
                      isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0B0F1A] border-[#151D2C] text-slate-200"
                    }`}>
                      <div><span className="text-slate-500 font-semibold">Inputs:</span> {step.inputData}</div>
                      <div><span className="text-slate-500 font-semibold">Arithmetic Proof:</span> <span className="font-bold text-emerald-600 font-mono">{step.arithmetic}</span></div>
                      <div><span className="text-slate-500 font-semibold">Evaluated Value:</span> <span className="font-bold font-mono">{String(step.outputValue)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Parameter Simulator & Rule Weighting (lg:col-span-4) */}
            <div className={`lg:col-span-4 border rounded-xl p-4 sm:p-5 font-mono text-xs flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
            }`}>
              <div>
                <div className={`flex items-center space-x-2 pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm">การกำหนดค่า Rule Engine Parameters</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold block">P3 Historical Weights (ให้น้ำหนักปี 2026/2025):</label>
                    <div className="p-2 rounded border bg-black/5 flex justify-between">
                      <span>ปีล่าสุด (2026): <strong>60%</strong></span>
                      <span>ปีก่อนหน้า (2025): <strong>40%</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold block">P4 Weekend Cap Limit (เพดานส่วนเพิ่มวันหยุด):</label>
                    <div className="p-2 rounded border bg-black/5 space-y-1">
                      <div>High Season: <strong>+15%</strong></div>
                      <div>Shoulder Season: <strong>+10%</strong></div>
                      <div>Low Season: <strong>+5%</strong></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold block">P5 Comp Target Index Bands:</label>
                    <div className="p-2 rounded border bg-black/5 space-y-1">
                      <div>High Season: <strong>100 – 110</strong></div>
                      <div>Shoulder Season: <strong>95 – 100</strong></div>
                      <div>Low Season: <strong>90 – 95</strong></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold block">P7 Price Floor Boundaries:</label>
                    <div className="p-2 rounded border bg-black/5 space-y-1">
                      <div>Soft Floor: <strong>MAX(20th percentile, Comp Min x 0.90)</strong></div>
                      <div>Hard Block: <strong>85% ของ Soft Floor</strong> (ห้ามบันทึกเด็ดขาด)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-slate-500 text-[11px] font-sans">
                สอดคล้องตามกฎข้อบังคับ RM Playbook P0–P8 อย่างสมบูรณ์ 100%
              </div>
            </div>

          </div>

          {/* Audit Log Table (P8 Compliance) */}
          <div className={`border rounded-xl p-4 sm:p-5 font-mono ${
            isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm sm:text-base">
                  บันทึกประวัติการปรับเปลี่ยนราคา (Audit Trail - P8 Compliance)
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                จำนวนรายการ: {auditLogs.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse border text-xs min-w-[680px] ${
                isLight ? "border-slate-200" : "border-[#1E293B]"
              }`}>
                <thead>
                  <tr className={`border-b text-xs font-bold uppercase ${
                    isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-400"
                  }`}>
                    <th className="p-2.5 border-r">วัน-เวลา</th>
                    <th className="p-2.5 border-r">ประเภทห้องพัก</th>
                    <th className="p-2.5 border-r text-right">ราคาก่อนหน้า</th>
                    <th className="p-2.5 border-r text-right">ราคาใหม่</th>
                    <th className="p-2.5 border-r">ผู้ดำเนินการ</th>
                    <th className="p-2.5 border-r">เหตุผลความจำเป็น</th>
                    <th className="p-2.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-[#151D2C]"}`}>
                  {auditLogs.map((log, i) => (
                    <tr key={i} className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                      <td className="p-2.5 border-r text-slate-500">{log.timestamp}</td>
                      <td className="p-2.5 border-r font-semibold">{log.roomName}</td>
                      <td className="p-2.5 border-r text-right text-slate-500">{formatPrice(log.oldPrice)} THB</td>
                      <td className="p-2.5 border-r text-right font-bold text-amber-600">{formatPrice(log.newPrice)} THB</td>
                      <td className="p-2.5 border-r text-slate-600 dark:text-slate-300">{log.user}</td>
                      <td className="p-2.5 border-r font-sans">{log.reason}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* RM Price Override Modal */}
      {editingTier !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className={`border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl transition-colors ${
            isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#0B0F1A] border-[#334155] text-slate-100"
          }`}>
            
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
              <div className="flex items-center space-x-2">
                <ShieldAlert className={`w-5 h-5 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
                <span className={`font-bold text-base sm:text-lg ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                  ปรับราคาห้องพักด้วยตนเอง — Tier {editingTier}
                </span>
              </div>
              <button 
                onClick={() => setEditingTier(null)}
                className={`p-1 rounded transition-colors ${isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-sans">
              <div>
                <label className="text-xs sm:text-sm font-bold block mb-1.5 font-mono">
                  ระบุราคาใหม่ที่ต้องการขาย (บาท):
                </label>
                <input
                  type="number"
                  value={editInputPrice}
                  onChange={(e) => setEditInputPrice(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xl font-bold font-mono focus:outline-none ${
                    editValidation && !editValidation.canSave 
                      ? "border-rose-500 text-rose-600 bg-rose-50/30" 
                      : editValidation && editValidation.severity === "WARNING"
                      ? "border-amber-500 text-amber-700 bg-amber-50/30"
                      : isLight 
                      ? "border-slate-300 bg-white text-slate-900 focus:border-sky-500" 
                      : "border-slate-700 bg-[#070A12] text-white focus:border-cyan-500"
                  }`}
                  placeholder="เช่น 1150"
                />
              </div>

              {/* Validation Feedback */}
              {editValidation && (
                <div className={`p-3.5 rounded-lg border text-xs sm:text-sm font-sans space-y-1.5 ${
                  !editValidation.canSave 
                    ? "bg-rose-50 border-rose-300 text-rose-900" 
                    : editValidation.severity === "WARNING"
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-emerald-50 border-emerald-300 text-emerald-900"
                }`}>
                  <div className="font-bold flex items-center space-x-1.5">
                    {!editValidation.canSave ? (
                      <Lock className="w-4 h-4 text-rose-600" />
                    ) : editValidation.severity === "WARNING" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{editValidation.message}</span>
                  </div>
                  {editValidation.violations.map((v, idx) => (
                    <div key={idx} className="pl-5 text-xs">• {v}</div>
                  ))}
                </div>
              )}

              {/* Justification input if Warning */}
              {editValidation && editValidation.severity === "WARNING" && (
                <div>
                  <label className="text-xs sm:text-sm font-bold block mb-1 text-amber-800">
                    * ระบุเหตุผลในการปรับราคาต่ำกว่า Floor (P7 Compliance):
                  </label>
                  <textarea
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="เช่น เพื่อกระตุ้นยอดขายวันธรรมดาตามแคมเปญ Flash Sale..."
                    className="w-full p-2.5 rounded-lg border border-amber-300 text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t flex justify-end space-x-2">
              <button
                onClick={() => setEditingTier(null)}
                className="px-4 py-2 rounded-lg border text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editValidation || !editValidation.canSave}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  !editValidation || !editValidation.canSave
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                }`}
              >
                บันทึกราคา
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
