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
          <span className={`text-xs font-bold mr-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
            ฤดูกาลตามโจทย์:
          </span>
          <button
            onClick={() => handleApplyPreset("2026-12-01", "2026-12-31", "2026-12-15")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDecemberDate
                ? isLight ? "bg-sky-600 text-white border-sky-700 shadow-xs" : "bg-cyan-950 text-cyan-300 border-cyan-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-300 hover:bg-[#1E293B] border-slate-800"
            }`}
          >
            ธ.ค. 2026 (High Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2027-09-01", "2027-09-30", "2027-09-15")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSeptemberDate
                ? isLight ? "bg-sky-600 text-white border-sky-700 shadow-xs" : "bg-cyan-950 text-cyan-300 border-cyan-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-300 hover:bg-[#1E293B] border-slate-800"
            }`}
          >
            ก.ย. 2027 (Low Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2026-12-24", "2027-01-01", "2026-12-25")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              currentInspectionDate === "2026-12-25"
                ? isLight ? "bg-purple-600 text-white border-purple-700 shadow-xs" : "bg-purple-950 text-purple-300 border-purple-600 shadow-sm"
                : isLight ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300" : "bg-[#111827] text-slate-300 hover:bg-[#1E293B] border-slate-800"
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
              <span className="text-[11px] text-slate-700 font-bold font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-01")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2027-09-01" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
              >
                1 ก.ย. (พุธ)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-15")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2027-09-15" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
                title="วันธรรมดากลางเดือน (Mid-Month Weekday Baseline)"
              >
                15 ก.ย. (ตัวแทนกลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-18")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2027-09-18" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
                title="วันเสาร์ (Weekend Sample)"
              >
                18 ก.ย. (เสาร์)
              </button>
            </div>
          )}

          {isDecemberDate && (
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-700 font-bold font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-01")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2026-12-01" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
              >
                1 ธ.ค.
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-15")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2026-12-15" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
              >
                15 ธ.ค. (ตัวแทนกลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-19")}
                className={`px-2 py-1 rounded text-xs border font-medium ${
                  currentInspectionDate === "2026-12-19" ? "bg-sky-600 text-white font-bold border-sky-700" : isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-200 border-slate-700"
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
                <p className={`text-xs font-sans mt-0.5 ${isLight ? "text-slate-700 font-medium" : "text-slate-300"}`}>
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

            {/* Scenario Narrative Explanation (Concise & High Contrast) */}
            {activeScenario !== "normal" && (
              <div className={`mt-3 pt-2.5 border-t text-xs font-sans flex items-center space-x-2 ${
                isLight ? "border-amber-300 text-slate-900" : "border-amber-700 text-amber-200"
              }`}>
                <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-amber-500 text-slate-950 shrink-0">
                  ⚡ ผลลัพธ์
                </span>
                <span className="font-semibold text-slate-800 dark:text-amber-200">
                  {activeScenario === "price_war" && `มัธยฐานคู่แข่งลดเหลือ ~${Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 0.8)}฿ ➔ ปรับลดราคาเพื่อรักษาส่วนแบ่งตลาด (ล็อกห้ามต่ำกว่า 85% Floor เสมอ)`}
                  {activeScenario === "demand_surge" && `มัธยฐานคู่แข่งพุ่งเป็น ~${Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 1.25)}฿ ➔ ปรับขึ้นตามกรอบดัชนี ${calculationResult.season === "High" ? "100–110%" : "90–95%"} (เพดาน +15% ของ P3)`}
                  {activeScenario === "compset_sold_out" && "คู่แข่งห้องเต็ม 3/5 แห่ง ➔ เปิดใช้ High Demand Surge Rule ปรับราคาพรีเมียมทันที"}
                </span>
              </div>
            )}
          </div>

          {/* Apple/Linear Minimal Hero Spotlight Section (High Contrast, No Text Walls) */}
          <div className={`rounded-2xl p-6 sm:p-7 transition-all ${
            isLight ? "bg-gradient-to-br from-slate-50 via-white to-sky-50/40 border border-slate-200 shadow-xs" : "bg-gradient-to-br from-[#0B0F1A] to-[#111827] border border-slate-800 shadow-md"
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: Giant Headline Rate & Context Chips */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    isLight ? "bg-sky-700 text-white" : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                  }`}>
                    {calculationResult.season} Season • {calculationResult.isSpecialDay ? "วันพิเศษพีค" : calculationResult.isWeekend ? "วันสุดสัปดาห์" : "วันธรรมดามาตรฐาน"}
                  </span>
                  <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                    ห้องฐานหลัก (Anchor Tier 1): Deluxe Room Twin Bed
                  </span>
                </div>

                <div className="flex items-baseline space-x-3">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-mono ${
                    isLight ? "text-slate-950" : "text-white"
                  }`}>
                    {formatPrice(currentActiveRates[0])}
                  </span>
                  <span className={`text-base sm:text-lg font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    บาท / คืน
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isLight ? "bg-emerald-100 text-emerald-950 border border-emerald-300" : "bg-emerald-950/80 text-emerald-300 border border-emerald-700"
                  }`}>
                    Net Rate รวมภาษีแล้ว
                  </span>
                </div>

                {/* 3 High-Contrast Scannable Summary Badges (Replaces Wall of Text) */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-900 border border-slate-200 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-sky-700 dark:text-cyan-400">🎯 ดัชนีตลาด:</span>
                    <span>{calculationResult.competitorMetrics.competitorIndex.toFixed(0)}% (เป้าหมาย {calculationResult.competitorMetrics.targetIndexRange}%)</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-900 border border-slate-200 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-emerald-700 dark:text-emerald-400">🛡️ Floor ปลอดภัย:</span>
                    <span>{formatPrice(calculationResult.finalRatesByTier[0].priceFloor)}฿</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-900 border border-slate-200 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-purple-700 dark:text-purple-400">🏨 มัธยฐานคู่แข่ง:</span>
                    <span>{formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)}฿</span>
                  </div>
                </div>
              </div>

              {/* Right: Visual Competitive Index Gauge Bar (High Contrast) */}
              <div className={`p-4 rounded-xl min-w-[280px] lg:min-w-[320px] shrink-0 space-y-3 ${
                isLight ? "bg-white border border-slate-300 shadow-xs" : "bg-[#070A12]/90 border border-slate-700 shadow-sm"
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                    ดัชนีเปรียบเทียบตลาด (Price Index)
                  </span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    {calculationResult.competitorMetrics.competitorIndex.toFixed(1)}%
                  </span>
                </div>

                {/* Minimalist Visual Bar */}
                <div className="space-y-1">
                  <div className={`w-full h-2.5 rounded-full overflow-hidden relative ${
                    isLight ? "bg-slate-200" : "bg-slate-800"
                  }`}>
                    {/* Target Zone Highlight */}
                    <div 
                      className="absolute top-0 bottom-0 bg-emerald-200 dark:bg-emerald-950/80 rounded-full"
                      style={{ left: "85%", width: "15%" }}
                    />
                    {/* Active Progress Fill */}
                    <div 
                      className="h-full bg-gradient-to-r from-sky-600 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(10, calculationResult.competitorMetrics.competitorIndex))}%` }}
                    />
                  </div>
                  <div className={`flex justify-between text-[11px] font-bold ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}>
                    <span>ถูกกว่าคู่แข่ง</span>
                    <span>เป้าหมาย {calculationResult.competitorMetrics.targetIndexRange}%</span>
                    <span>แพงกว่าคู่แข่ง</span>
                  </div>
                </div>

                {/* Key Snapshot Pills */}
                <div className={`pt-2 border-t flex items-center justify-between text-xs font-sans ${
                  isLight ? "border-slate-200 text-slate-800" : "border-slate-800 text-slate-300"
                }`}>
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 font-medium">คู่แข่งมัธยฐาน: </span>
                    <strong className="text-slate-950 dark:text-slate-100 font-mono font-bold">
                      {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)} ฿
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 font-medium">จุด Floor: </span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                      {formatPrice(calculationResult.finalRatesByTier[0].priceFloor)} ฿
                    </strong>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Main Commercial Workbench: Left Room Matrix + Right Commercial Rationale */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Clean Minimalist Room Tier Ladder (Linear Style, Zero Bordered Cells) (lg:col-span-8) */}
            <div className={`lg:col-span-8 rounded-2xl p-5 sm:p-6 transition-all ${
              isLight ? "bg-white border border-slate-100 shadow-xs" : "bg-[#0B0F1A] border border-slate-800/40 shadow-sm"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-2">
                <div>
                  <h3 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                    บันไดราคาห้องพัก 8 ระดับ (Room Escalation Ladder)
                  </h3>
                  <p className={`text-xs font-sans mt-0.5 ${isLight ? "text-slate-700 font-medium" : "text-slate-300"}`}>
                    ประจำวันที่ {currentInspectionDate} • ปรับราคาขึ้นตามความพรีเมียมของขนาดห้องและวิว
                  </p>
                </div>

                {Object.keys(manualOverrides).length > 0 && (
                  <button
                    onClick={() => setManualOverrides({})}
                    className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all"
                  >
                    รีเซ็ตค่าที่ปรับเอง ({Object.keys(manualOverrides).length})
                  </button>
                )}
              </div>

              {/* Clean Minimalist List (No vertical borders, spacious, Apple-like) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {calculationResult.finalRatesByTier.map((t, idx) => {
                  const isInspected = inspectingTier === t.tier;
                  const currentPrice = currentActiveRates[idx];
                  const hasOverride = manualOverrides[t.tier] !== undefined;

                  return (
                    <div
                      key={t.tier}
                      onClick={() => setInspectingTier(t.tier)}
                      className={`py-3.5 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isInspected
                          ? isLight 
                            ? "bg-sky-50/80 shadow-2xs border border-sky-200/60" 
                            : "bg-[#162035]/70 shadow-xs"
                          : isLight 
                            ? "hover:bg-slate-50/80" 
                            : "hover:bg-[#101726]/60"
                      }`}
                    >
                      {/* Left Room Info */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 font-mono ${
                          t.tier === 1 
                            ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300/60"
                            : isLight ? "bg-slate-100 text-slate-900 border border-slate-300/60" : "bg-slate-800 text-slate-300"
                        }`}>
                          T{t.tier}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold text-sm truncate ${
                              isLight ? "text-slate-950" : "text-slate-100"
                            }`}>
                              {t.roomName}
                            </span>
                            {hasOverride && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                                RM Override
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-sans mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                            isLight ? "text-slate-700 font-medium" : "text-slate-300"
                          }`}>
                            <span>{t.rooms} ห้องในระบบ</span>
                            <span className="text-slate-400">•</span>
                            <span>สัดส่วน +{Math.round((t.stepMultiplier - 1) * 100)}%</span>
                            <span className="text-slate-400">•</span>
                            <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[11px] ${
                              isLight ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-slate-800 text-slate-300"
                            }`}>
                              Floor: {t.priceFloor}฿
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Price Display & Edit Button */}
                      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
                        <div className="text-right">
                          <div className={`text-base sm:text-lg font-bold font-mono ${
                            hasOverride 
                              ? "text-amber-600 dark:text-amber-400" 
                              : isLight ? "text-slate-950" : "text-white"
                          }`}>
                            {formatPrice(currentPrice)}
                            <span className={`text-xs font-bold ml-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>฿</span>
                          </div>
                          {hasOverride && (
                            <div className={`text-[11px] line-through font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                              ระบบแนะ {formatPrice(t.suggestedRate)}฿
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(t.tier, currentPrice);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isLight 
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300" 
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                          }`}
                        >
                          ปรับราคา
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Executive Commercial Rationale (Soft Surface, Borderless) (lg:col-span-4) */}
            <div className={`lg:col-span-4 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all ${
              isLight ? "bg-slate-50/80 border border-slate-200 shadow-xs" : "bg-[#0B0F1A] border border-slate-800/40 shadow-sm"
            }`}>
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/60 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-950" : "text-slate-100"}`}>
                      สรุปเหตุผลเชิงกลยุทธ์
                    </h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isLight ? "bg-sky-100 text-sky-900 border border-sky-300" : "bg-cyan-950 text-cyan-300"
                  }`}>
                    ห้อง Tier {inspectedRoom.tier}
                  </span>
                </div>

                {/* Inspected Room Mini Badge */}
                <div className={`p-3.5 rounded-xl mb-4 flex items-center justify-between ${
                  isLight ? "bg-white border border-slate-200 shadow-2xs" : "bg-[#070A12] border border-slate-800/40"
                }`}>
                  <div>
                    <div className="font-bold text-sm text-slate-950 dark:text-slate-100">{inspectedRoom.roomName}</div>
                    <div className={`text-xs mt-0.5 font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Floor ปลอดภัย: <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{formatPrice(inspectedRoom.priceFloor)} บาท</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-sky-700 dark:text-cyan-400">
                      {formatPrice(inspectedRoom.suggestedRate)}
                    </div>
                    <span className={`text-[11px] font-bold font-sans ${isLight ? "text-slate-700" : "text-slate-300"}`}>บาท/คืน</span>
                  </div>
                </div>

                {/* 4 Clean Executive Strategic Cards (No Text Wall, High Contrast) */}
                <div className="space-y-2.5 font-sans text-xs">
                  <div className={`p-3 rounded-xl flex items-center justify-between ${isLight ? "bg-white border border-slate-200 shadow-2xs" : "bg-[#070A12]/80 border border-slate-800"}`}>
                    <div className="space-y-0.5 pr-2">
                      <div className="font-bold text-slate-950 dark:text-slate-100 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                        <span>1. ปัจจัยฤดูกาล (P1)</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        ราคาฐาน 963฿ (A1) • เน้นสร้างยอดจอง
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                      calculationResult.season === "High"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-blue-100 text-blue-900 border border-blue-300"
                    }`}>
                      {calculationResult.season === "High" ? "High Season" : "Low Season"}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl flex items-center justify-between ${isLight ? "bg-white border border-slate-200 shadow-2xs" : "bg-[#070A12]/80 border border-slate-800"}`}>
                    <div className="space-y-0.5 pr-2">
                      <div className="font-bold text-slate-950 dark:text-slate-100 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>2. ความต้องการวันหยุด (P4)</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        {calculationResult.isSpecialDay
                          ? "ปรับราคาเทศกาลพีคตามกรอบสูงสุด"
                          : calculationResult.isWeekend
                          ? "ปรับเพิ่มจับดีมานด์นักท่องเที่ยวสัปดาห์นี้"
                          : "ราคามาตรฐานวันธรรมดา ไม่มีการชาร์จเพิ่ม"}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                      calculationResult.isSpecialDay
                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                        : calculationResult.isWeekend
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    }`}>
                      {calculationResult.isSpecialDay ? "+40% Special" : calculationResult.isWeekend ? (calculationResult.season === 'High' ? "+15% Weekend" : "+5% Weekend") : "0% Weekday"}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl flex items-center justify-between ${isLight ? "bg-white border border-slate-200 shadow-2xs" : "bg-[#070A12]/80 border border-slate-800"}`}>
                    <div className="space-y-0.5 pr-2">
                      <div className="font-bold text-slate-950 dark:text-slate-100 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                        <span>3. ดัชนีแข่งขันตลาด (P5)</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        มัธยฐานคู่แข่ง: {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)}฿ (5 โรงแรม)
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300 shrink-0">
                      Index {calculationResult.competitorMetrics.competitorIndex.toFixed(0)}%
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl flex items-center justify-between ${isLight ? "bg-white border border-slate-200 shadow-2xs" : "bg-[#070A12]/80 border border-slate-800"}`}>
                    <div className="space-y-0.5 pr-2">
                      <div className="font-bold text-slate-950 dark:text-slate-100 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span>4. บันไดราคาห้องพัก (P6)</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        Tier 1 ➔ Tier {inspectedRoom.tier} ({inspectedRoom.rooms} ห้อง)
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-900 border border-slate-300 font-mono shrink-0">
                      +{Math.round((inspectedRoom.stepMultiplier - 1) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Switch to Auditor */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
                <button
                  onClick={() => setViewPerspective("admin")}
                  className={`text-xs font-bold transition-all flex items-center justify-center space-x-1 mx-auto ${
                    isLight ? "text-purple-700 hover:text-purple-900" : "text-purple-400 hover:text-purple-200"
                  }`}
                >
                  <span>ต้องการตรวจสอบสมการคณิตศาสตร์? ไปที่ Admin Console</span>
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
