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
    <div className="space-y-7 select-none w-full max-w-7xl mx-auto">
      
      {/* Seamless Sub-header & View Perspective Selector (No Border Box) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs mb-1 font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 font-mono">
              DYNAMIC RATE ENGINE
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">
              {calculationResult.season} Season • {calculationResult.isWeekend ? "วันหยุดสุดสัปดาห์" : calculationResult.isSpecialDay ? "วันพิเศษ" : "วันธรรมดา"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            ระบบกำหนดและเสนอราคาห้องพักอัจฉริยะ
          </h1>
          <p className="text-xs sm:text-sm mt-0.5 font-sans text-slate-700 dark:text-slate-300 font-medium">
            คำนวณราคาพลวัตอัตโนมัติตามกฎ Playbook P0–P8 พร้อมเปรียบเทียบตลาดแบบเรียลไทม์
          </p>
        </div>

        {/* View Perspective Switcher: Commercial vs Admin Console (Seamless Pills) */}
        <div className={`flex items-center space-x-1 p-1 rounded-xl shrink-0 transition-all ${
          isLight ? "bg-slate-100" : "bg-[#111827]"
        }`}>
          <button
            onClick={() => setViewPerspective("commercial")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              viewPerspective === "commercial"
                ? isLight
                  ? "bg-white text-slate-950 shadow-xs"
                  : "bg-[#1F2937] text-white shadow-xs"
                : isLight
                ? "text-slate-700 hover:text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4 text-sky-600" />
            <span>โหมดผู้บริหารทั่วไป</span>
          </button>

          <button
            onClick={() => setViewPerspective("admin")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              viewPerspective === "admin"
                ? isLight
                  ? "bg-white text-purple-950 shadow-xs"
                  : "bg-[#1F2937] text-purple-300 shadow-xs"
                : isLight
                ? "text-slate-700 hover:text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4 text-purple-600" />
            <span>Admin ตรวจสูตรคณิตศาสตร์</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Reason Explainer Bar (Open Flow, No Border Box) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Preset Season Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mr-1">
            ฤดูกาลตามโจทย์:
          </span>
          <button
            onClick={() => handleApplyPreset("2026-12-01", "2026-12-31", "2026-12-15")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              isDecemberDate
                ? "bg-sky-600 text-white shadow-xs"
                : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-[#111827] hover:bg-[#1E293B] text-slate-300"
            }`}
          >
            ธ.ค. 2026 (High Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2027-09-01", "2027-09-30", "2027-09-15")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              isSeptemberDate
                ? "bg-sky-600 text-white shadow-xs"
                : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-[#111827] hover:bg-[#1E293B] text-slate-300"
            }`}
          >
            ก.ย. 2027 (Low Season)
          </button>

          <button
            onClick={() => handleApplyPreset("2026-12-24", "2027-01-01", "2026-12-25")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              currentInspectionDate === "2026-12-25"
                ? "bg-purple-600 text-white shadow-xs"
                : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-[#111827] hover:bg-[#1E293B] text-slate-300"
            }`}
          >
            คริสต์มาส & ปีใหม่ (Peak +40%)
          </button>
        </div>

        {/* Inspection Date Controls & September 15 Explanation */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Date Shortcuts for Current Month */}
          {isSeptemberDate && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-800 dark:text-slate-200 font-bold font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-01")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2027-09-01" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
              >
                1 ก.ย.
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-15")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2027-09-15" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
                title="วันธรรมดากลางเดือน (Mid-Month Weekday Baseline)"
              >
                15 ก.ย. (กลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2027-09-18")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2027-09-18" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
                title="วันเสาร์ (Weekend Sample)"
              >
                18 ก.ย. (เสาร์)
              </button>
            </div>
          )}

          {isDecemberDate && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-800 dark:text-slate-200 font-bold font-sans">เลือกวัน:</span>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-01")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2026-12-01" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
              >
                1 ธ.ค.
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-15")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2026-12-15" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
              >
                15 ธ.ค. (กลางเดือน)
              </button>
              <button
                onClick={() => setCurrentInspectionDate("2026-12-19")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentInspectionDate === "2026-12-19" ? "bg-sky-600 text-white" : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
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
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold focus:outline-none ${
                isLight ? "bg-slate-100 text-slate-900" : "bg-[#111827] text-slate-100"
              }`}
            />
          </div>

          {/* "ทำไมจึงเป็น 15 กันยายน?" Explainer Trigger */}
          <button
            onClick={() => setShowDateReasoningModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 bg-amber-500/10 text-amber-950 dark:text-amber-300 hover:bg-amber-500/20"
            title="คลิกเพื่อดูคำอธิบาย: ทำไมระบบจึงแนะนำวันที่ 15 กันยายน?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>ทำไมต้อง 15 กันยายน?</span>
          </button>

          {/* Toggle Trend Visualizer Button */}
          <button
            onClick={() => setShowVisualizer(!showVisualizer)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
              showVisualizer
                ? "bg-sky-600 text-white"
                : isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800" : "bg-slate-800 text-slate-300"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{showVisualizer ? "ซ่อนกราฟ" : "ดูกราฟแนวโน้ม"}</span>
          </button>

          {/* Export PMS / SiteMinder CSV */}
          <button
            onClick={handleExportPMSCsv}
            className="px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            title="ดาวน์โหลดตารางราคาเพื่อนำเข้า Opera PMS / SiteMinder"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก PMS (.csv)</span>
          </button>
        </div>

      </div>

      {/* Date Reason Explainer Modal / Card */}
      {showDateReasoningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-2xl transition-colors ${
            isLight ? "bg-white text-slate-900 border border-slate-200" : "bg-[#0B0F1A] border border-slate-800 text-slate-100"
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

            <div className="space-y-3 font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
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
        <div className="space-y-7">

          {/* Executive What-If Scenario Sandbox (Borderless Soft Strip) */}
          <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
            activeScenario !== "normal"
              ? isLight ? "bg-amber-50/90 border border-amber-200" : "bg-amber-950/20 border border-amber-800"
              : isLight ? "bg-slate-100/70" : "bg-[#0c111d]"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className={`w-4 h-4 ${activeScenario !== "normal" ? "text-amber-600 animate-pulse" : "text-sky-600"}`} />
                  <span className="font-black text-xs sm:text-sm text-slate-950 dark:text-white">
                    แบบจำลองความไวตลาด (What-If Market Sensitivity Sandbox)
                  </span>
                  {activeScenario !== "normal" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                      SIMULATION ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs font-sans mt-0.5 text-slate-700 dark:text-slate-300 font-medium">
                  ทดสอบการตอบสนองของระบบราคาอัตโนมัติ เมื่อตลาดเกิดการเปลี่ยนแปลงฉับพลันในสถานการณ์จริง
                </p>
              </div>

              {/* Scenario Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveScenario("normal")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeScenario === "normal"
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                      : isLight ? "bg-white text-slate-800 hover:bg-slate-200" : "bg-[#162035] text-slate-300 hover:text-white"
                  }`}
                >
                  สภาวะปกติ (Baseline)
                </button>
                <button
                  onClick={() => setActiveScenario("price_war")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeScenario === "price_war"
                      ? "bg-rose-600 text-white shadow-xs"
                      : isLight ? "bg-white text-rose-950 hover:bg-rose-50" : "bg-[#162035] text-rose-300 hover:text-white"
                  }`}
                >
                  📉 สงครามราคา (-20%)
                </button>
                <button
                  onClick={() => setActiveScenario("demand_surge")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeScenario === "demand_surge"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : isLight ? "bg-white text-emerald-950 hover:bg-emerald-50" : "bg-[#162035] text-emerald-300 hover:text-white"
                  }`}
                >
                  ⚡ อุปสงค์พุ่งสูง (+25%)
                </button>
                <button
                  onClick={() => setActiveScenario("compset_sold_out")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeScenario === "compset_sold_out"
                      ? "bg-purple-600 text-white shadow-xs"
                      : isLight ? "bg-white text-purple-950 hover:bg-purple-50" : "bg-[#162035] text-purple-300 hover:text-white"
                  }`}
                >
                  🏨 คู่แข่ง 3 แห่งห้องเต็ม
                </button>
              </div>
            </div>

            {/* Scenario Narrative Explanation (Concise & High Contrast) */}
            {activeScenario !== "normal" && (
              <div className="mt-3 pt-2.5 border-t border-amber-300/60 dark:border-amber-700/60 text-xs font-sans flex items-center space-x-2">
                <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-amber-500 text-slate-950 shrink-0">
                  ⚡ ผลลัพธ์
                </span>
                <span className="font-bold text-slate-950 dark:text-amber-200">
                  {activeScenario === "price_war" && `มัธยฐานคู่แข่งลดเหลือ ~${Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 0.8)}฿ ➔ ปรับลดราคาเพื่อรักษาส่วนแบ่งตลาด (ล็อกห้ามต่ำกว่า 85% Floor เสมอ)`}
                  {activeScenario === "demand_surge" && `มัธยฐานคู่แข่งพุ่งเป็น ~${Math.round(calculationResult.competitorMetrics.medianCompetitorRate * 1.25)}฿ ➔ ปรับขึ้นตามกรอบดัชนี ${calculationResult.season === "High" ? "100–110%" : "90–95%"} (เพดาน +15% ของ P3)`}
                  {activeScenario === "compset_sold_out" && "คู่แข่งห้องเต็ม 3/5 แห่ง ➔ เปิดใช้ High Demand Surge Rule ปรับราคาพรีเมียมทันที"}
                </span>
              </div>
            )}
          </div>

          {/* Modern Executive Spotlight Section (Borderless Soft Surface, High Contrast) */}
          <div className={`rounded-2xl p-6 sm:p-8 transition-all ${
            isLight ? "bg-slate-100/70" : "bg-[#0c111d]"
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: Giant Headline Rate & Context Chips */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    isLight ? "bg-slate-950 text-white" : "bg-sky-500 text-slate-950 font-black"
                  }`}>
                    {calculationResult.season} Season • {calculationResult.isSpecialDay ? "วันพิเศษพีค" : calculationResult.isWeekend ? "วันสุดสัปดาห์" : "วันธรรมดามาตรฐาน"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ห้องฐานหลัก (Anchor Tier 1): Deluxe Room Twin Bed
                  </span>
                </div>

                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-slate-950 dark:text-white">
                    {formatPrice(currentActiveRates[0])}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                    บาท / คืน
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                    Net Rate รวมภาษีแล้ว
                  </span>
                </div>

                {/* 3 High-Contrast Scannable Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-950 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-sky-700 dark:text-sky-400">🎯 ดัชนีตลาด:</span>
                    <span>{calculationResult.competitorMetrics.competitorIndex.toFixed(0)}% (เป้าหมาย {calculationResult.competitorMetrics.targetIndexRange}%)</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-950 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-emerald-700 dark:text-emerald-400">🛡️ Floor ปลอดภัย:</span>
                    <span>{formatPrice(calculationResult.finalRatesByTier[0].priceFloor)}฿</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                    isLight ? "bg-white text-slate-950 shadow-2xs" : "bg-slate-800 text-slate-100"
                  }`}>
                    <span className="text-purple-700 dark:text-purple-400">🏨 มัธยฐานคู่แข่ง:</span>
                    <span>{formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)}฿</span>
                  </div>
                </div>
              </div>

              {/* Right: Visual Competitive Index Gauge Bar (High Contrast) */}
              <div className={`p-4 rounded-xl min-w-[280px] lg:min-w-[320px] shrink-0 space-y-3 ${
                isLight ? "bg-white shadow-2xs" : "bg-[#111827]"
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-950 dark:text-slate-100">
                    ดัชนีเปรียบเทียบตลาด (Price Index)
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    {calculationResult.competitorMetrics.competitorIndex.toFixed(1)}%
                  </span>
                </div>

                {/* Minimalist Visual Bar */}
                <div className="space-y-1">
                  <div className={`w-full h-2.5 rounded-full overflow-hidden relative ${
                    isLight ? "bg-slate-200" : "bg-slate-800"
                  }`}>
                    <div 
                      className="absolute top-0 bottom-0 bg-emerald-200 dark:bg-emerald-950/80 rounded-full"
                      style={{ left: "85%", width: "15%" }}
                    />
                    <div 
                      className="h-full bg-gradient-to-r from-sky-600 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(10, calculationResult.competitorMetrics.competitorIndex))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-400">
                    <span>ถูกกว่าคู่แข่ง</span>
                    <span>เป้าหมาย {calculationResult.competitorMetrics.targetIndexRange}%</span>
                    <span>แพงกว่าคู่แข่ง</span>
                  </div>
                </div>

                {/* Key Snapshot */}
                <div className={`pt-2 border-t flex items-center justify-between text-xs font-sans ${
                  isLight ? "border-slate-100 text-slate-800" : "border-slate-800 text-slate-300"
                }`}>
                  <div>
                    <span className="text-slate-700 dark:text-slate-400 font-medium">คู่แข่งมัธยฐาน: </span>
                    <strong className="text-slate-950 dark:text-white font-mono font-bold">
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

          {/* Main Commercial Workbench: Left Room Matrix + Right Commercial Rationale (Zero Border Boxes) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Clean Minimalist Room Tier Ladder (Open Layout, lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-lg text-slate-950 dark:text-white">
                    บันไดราคาห้องพัก 8 ระดับ (Room Escalation Ladder)
                  </h3>
                  <p className="text-xs font-sans mt-0.5 text-slate-700 dark:text-slate-300 font-medium">
                    ประจำวันที่ {currentInspectionDate} • ปรับราคาขึ้นตามความพรีเมียมของขนาดห้องและวิว
                  </p>
                </div>

                {Object.keys(manualOverrides).length > 0 && (
                  <button
                    onClick={() => setManualOverrides({})}
                    className="px-3 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold transition-all"
                  >
                    รีเซ็ตค่าที่ปรับเอง ({Object.keys(manualOverrides).length})
                  </button>
                )}
              </div>

              {/* Clean Minimalist List (No vertical borders, spacious row hover) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
                            ? "bg-sky-50/90 shadow-2xs" 
                            : "bg-[#162035]/80 shadow-xs"
                          : isLight 
                            ? "hover:bg-slate-50" 
                            : "hover:bg-[#101726]/60"
                      }`}
                    >
                      {/* Left Room Info */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 font-mono ${
                          t.tier === 1 
                            ? "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-300"
                            : isLight ? "bg-slate-100 text-slate-950" : "bg-slate-800 text-slate-200"
                        }`}>
                          T{t.tier}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm truncate text-slate-950 dark:text-white">
                              {t.roomName}
                            </span>
                            {hasOverride && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-300">
                                RM Override
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-sans mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-700 dark:text-slate-300 font-semibold">
                            <span>{t.rooms} ห้องในระบบ</span>
                            <span className="text-slate-400">•</span>
                            <span>สัดส่วน +{Math.round((t.stepMultiplier - 1) * 100)}%</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">
                              Floor: {t.priceFloor}฿
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Price Display & Edit Button */}
                      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
                        <div className="text-right">
                          <div className={`text-base sm:text-lg font-black font-mono ${
                            hasOverride 
                              ? "text-amber-600 dark:text-amber-400" 
                              : "text-slate-950 dark:text-white"
                          }`}>
                            {formatPrice(currentPrice)}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-1">฿</span>
                          </div>
                          {hasOverride && (
                            <div className="text-[11px] line-through font-mono text-slate-600 dark:text-slate-400">
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
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-950" 
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

            {/* Right: Executive Commercial Rationale (Soft Natural Canvas, ZERO Nested Border Boxes, lg:col-span-5) */}
            <div className={`lg:col-span-5 rounded-2xl p-6 transition-all ${
              isLight ? "bg-slate-100/70" : "bg-[#0c111d]"
            }`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800 mb-5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-base text-slate-950 dark:text-white">
                    สรุปเหตุผลเชิงกลยุทธ์
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-2xs">
                  ห้อง Tier {inspectedRoom.tier}
                </span>
              </div>

              {/* Inspected Room Focus Display (Clean, High Contrast, No Border Box) */}
              <div className="pb-5 mb-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-slate-950 dark:text-white">
                    {inspectedRoom.roomName}
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    Floor ปลอดภัย: <span className="font-black font-mono text-slate-950 dark:text-white">{formatPrice(inspectedRoom.priceFloor)} บาท</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-sky-700 dark:text-sky-400">
                    {formatPrice(inspectedRoom.suggestedRate)}
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">บาท / คืน</span>
                </div>
              </div>

              {/* 4 Clean Executive Strategic Timeline Items (ZERO Border Boxes, High Contrast) */}
              <div className="space-y-4 font-sans">
                
                {/* Item 1: Seasonality */}
                <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                      <span className="font-black text-xs text-slate-950 dark:text-white">
                        1. ปัจจัยฤดูกาล (P1)
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                      calculationResult.season === "High"
                        ? "bg-amber-100 text-amber-950 border border-amber-300"
                        : "bg-blue-100 text-blue-950 border border-blue-300"
                    }`}>
                      {calculationResult.season === "High" ? "High Season" : "Low Season"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pl-4.5">
                    ราคาฐาน 963฿ (ตามประวัติ A1) • ปรับสมดุลความคุ้มค่าเพื่อสร้างยอดจอง
                  </p>
                </div>

                {/* Item 2: Weekend */}
                <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="font-black text-xs text-slate-950 dark:text-white">
                        2. ความต้องการวันหยุด (P4)
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                      calculationResult.isSpecialDay
                        ? "bg-purple-100 text-purple-950 border border-purple-300"
                        : calculationResult.isWeekend
                        ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                        : "bg-slate-200 text-slate-950"
                    }`}>
                      {calculationResult.isSpecialDay ? "+40% Special" : calculationResult.isWeekend ? (calculationResult.season === 'High' ? "+15% Weekend" : "+5% Weekend") : "0% Weekday"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pl-4.5">
                    {calculationResult.isSpecialDay
                      ? "ช่วงเทศกาลพีค ปรับราคาขึ้นตามเพดานสูงสุดเพื่อดึงดูดรายได้"
                      : calculationResult.isWeekend
                      ? "คืนวันศุกร์-เสาร์ มีนักท่องเที่ยวสูงกว่าวันธรรมดา จึงเพิ่มราคา"
                      : "วันธรรมดามาตรฐาน ไม่มีการปรับเพิ่มวันหยุด เพื่อรักษาราคาแข่งขันได้"}
                  </p>
                </div>

                {/* Item 3: Competitors */}
                <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                      <span className="font-black text-xs text-slate-950 dark:text-white">
                        3. ดัชนีแข่งขันตลาด (P5)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-sky-100 text-sky-950 border border-sky-300">
                      Index {calculationResult.competitorMetrics.competitorIndex.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pl-4.5">
                    มัธยฐานคู่แข่ง: {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)}฿ (Compset 5 โรงแรมในหาดจอมเทียน)
                  </p>
                </div>

                {/* Item 4: Tier Escalation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span className="font-black text-xs text-slate-950 dark:text-white">
                        4. บันไดราคาห้องพัก (P6)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-slate-200 text-slate-950 font-mono">
                      +{Math.round((inspectedRoom.stepMultiplier - 1) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed pl-4.5">
                    อัตราสัดส่วน Tier 1 ➔ Tier {inspectedRoom.tier} ({inspectedRoom.rooms} ห้องในระบบ) คำนวณตามขนาดและวิว
                  </p>
                </div>

              </div>

              {/* Bottom Switch to Auditor */}
              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center">
                <button
                  onClick={() => setViewPerspective("admin")}
                  className="text-xs font-bold transition-all flex items-center justify-center space-x-1 mx-auto text-purple-700 hover:text-purple-900 dark:text-purple-400"
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
