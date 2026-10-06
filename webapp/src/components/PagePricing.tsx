"use client";

import React, { useState, useMemo } from "react";
import { 
  Activity, ShieldAlert, X, Terminal, 
  History, AlertTriangle, Layers, TrendingUp
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
  const [showHelperBanner, setShowHelperBanner] = useState<boolean>(true);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      timestamp: "2026-10-06 09:15:00",
      roomName: "Deluxe Room Twin Bed",
      oldPrice: 1096,
      newPrice: 1150,
      reason: "Adjusted for local festival group booking inquiry",
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

  const inspectedRoom = calculationResult.finalRatesByTier.find(t => t.tier === inspectingTier) || calculationResult.finalRatesByTier[0];

  return (
    <div className="space-y-6 font-mono text-xs sm:text-sm select-none">
      
      {/* Helper Banner (Can be dismissed) */}
      {showHelperBanner && (
        <div className={`border p-3 sm:p-4 rounded-lg flex items-center justify-between transition-colors ${
          isLight ? "bg-sky-50 border-sky-200 text-sky-900" : "bg-[#0B1528] border-cyan-800/80 text-cyan-200"
        }`}>
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-0.5 rounded font-bold text-xs border ${
              isLight ? "bg-sky-100 text-sky-800 border-sky-300" : "bg-cyan-950 text-cyan-400 border-cyan-700"
            }`}>
              TIP
            </span>
            <span className={`text-xs sm:text-sm font-sans ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              เลือกช่วงวันที่ด้านล่าง ➜ คลิกที่แถวห้องพักเพื่อดูสมการ P0–P8 ทางขวามือ ➜ กดปุ่ม <strong>EDIT</strong> เพื่อทดสอบการบล็อกราคาของระบบ
            </span>
          </div>
          <button 
            onClick={() => setShowHelperBanner(false)}
            className={`p-1 rounded transition-colors ${
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-cyan-400 hover:text-white hover:bg-slate-800"
            }`}
            aria-label="Dismiss Tip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Date Range Selector & Quick Preset Jumpers */}
      <div className={`border p-4 sm:p-5 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#090D17] border-[#1E293B]"
      }`}>
        <div>
          <div className={`text-base sm:text-lg font-bold tracking-tight flex items-center space-x-2 ${
            isLight ? "text-slate-900" : "text-slate-100"
          }`}>
            <Activity className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span>ระบบคำนวณราคาห้องพักอัจฉริยะ (Dynamic Pricing Engine)</span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 font-sans ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            เลือกช่วงวันที่เพื่อดูราคาเสนอแนะตามกฎ Playbook (P0–P8) พร้อมระบบตรวจสอบ Floor Price และ Rule Trace
          </p>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Start Date */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border ${
            isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#04060A] border-[#1E293B] text-slate-300"
          }`}>
            <span className={`text-xs font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>จากวันที่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (currentInspectionDate < e.target.value) setCurrentInspectionDate(e.target.value);
              }}
              className={`bg-transparent font-bold focus:outline-none text-xs sm:text-sm ${
                isLight ? "text-slate-900" : "text-cyan-300"
              }`}
            />
          </div>

          {/* End Date */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border ${
            isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#04060A] border-[#1E293B] text-slate-300"
          }`}>
            <span className={`text-xs font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>ถึงวันที่:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`bg-transparent font-bold focus:outline-none text-xs sm:text-sm ${
                isLight ? "text-slate-900" : "text-cyan-300"
              }`}
            />
          </div>

          {/* Active Inspection Date */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border font-bold ${
            isLight 
              ? "bg-sky-50 border-sky-300 text-sky-800" 
              : "bg-[#111A2E] border-cyan-700/60 text-cyan-300"
          }`}>
            <span className={`text-xs font-bold ${isLight ? "text-sky-700" : "text-cyan-400"}`}>วันที่ตรวจสอบ:</span>
            <input
              type="date"
              value={currentInspectionDate}
              onChange={(e) => setCurrentInspectionDate(e.target.value)}
              className={`bg-transparent font-bold focus:outline-none text-xs sm:text-sm ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            />
          </div>

          {/* Quick Presets */}
          <div className={`flex items-center space-x-1.5 p-1 rounded-md border ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
          }`}>
            <button
              onClick={() => handleApplyPreset("2026-12-01", "2026-12-31", "2026-12-15")}
              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all ${
                startDate === "2026-12-01" && endDate === "2026-12-31" 
                  ? isLight 
                    ? "bg-white text-sky-700 border border-sky-300 shadow-xs" 
                    : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ธ.ค. 2026 (ไฮซีซั่น)
            </button>
            <button
              onClick={() => handleApplyPreset("2027-09-01", "2027-09-30", "2027-09-15")}
              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all ${
                startDate === "2027-09-01" && endDate === "2027-09-30" 
                  ? isLight 
                    ? "bg-white text-sky-700 border border-sky-300 shadow-xs" 
                    : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ก.ย. 2027 (โลว์ซีซั่น)
            </button>
            <button
              onClick={() => handleApplyPreset("2026-12-24", "2027-01-01", "2026-12-25")}
              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all ${
                startDate === "2026-12-24" 
                  ? isLight
                    ? "bg-white text-purple-700 border border-purple-300 shadow-xs"
                    : "bg-[#1E293B] text-purple-300 border border-purple-500/40 shadow-sm" 
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              คริสต์มาส & ปีใหม่ (พีค)
            </button>
          </div>

          {/* Toggle Trend Visualizer Button */}
          <button
            onClick={() => setShowVisualizer(!showVisualizer)}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 text-xs sm:text-sm font-bold border ${
              showVisualizer
                ? isLight
                  ? "bg-sky-50 text-sky-700 border-sky-300 shadow-xs"
                  : "bg-cyan-950 text-cyan-300 border-cyan-600/80 shadow-sm"
                : isLight
                ? "bg-white text-slate-600 hover:text-slate-900 border-slate-300"
                : "bg-[#1E293B] text-slate-400 hover:text-slate-200 border-slate-700"
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span>{showVisualizer ? "ซ่อนกราฟแนวโน้มราคา" : "แสดงกราฟแนวโน้มราคา"}</span>
          </button>

          {Object.keys(manualOverrides).length > 0 && (
            <button
              onClick={() => setManualOverrides({})}
              className="px-3 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold"
            >
              รีเซ็ตราคาที่ปรับเอง ({Object.keys(manualOverrides).length})
            </button>
          )}

        </div>
      </div>

      {/* Interactive Trend Visualizer & Market Corridor Analytics Suite */}
      {showVisualizer && (
        <RateTrendVisualizer
          startDate={startDate}
          endDate={endDate}
          currentInspectionDate={currentInspectionDate}
          onSelectDate={(date) => setCurrentInspectionDate(date)}
          tierNumber={inspectingTier || 1}
        />
      )}

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P1 ฤดูกาล (Season)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${
            calculationResult.season === "High" ? (isLight ? "text-amber-600" : "text-amber-400") :
            calculationResult.season === "Low" ? (isLight ? "text-blue-600" : "text-blue-400") : 
            (isLight ? "text-emerald-600" : "text-emerald-400")
          }`}>
            {calculationResult.season}
          </div>
          <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>ราคาฐาน: {formatPrice(calculationResult.baseRoomRate)} THB</div>
        </div>

        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P4 ประเภทวัน (Day Type)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            {calculationResult.isSpecialDay ? "วันหยุดพิเศษ" : calculationResult.isWeekend ? "สุดสัปดาห์" : "วันธรรมดา"}
          </div>
          <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {calculationResult.isSpecialDay ? "+40% ส่วนเพิ่ม" : calculationResult.isWeekend ? `+${calculationResult.season === 'High'?15:(calculationResult.season==='Low'?5:10)}% เพดาน` : "ราคามาตรฐาน"}
          </div>
        </div>

        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P5 มัธยฐานคู่แข่ง (Comp Median)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            {formatPrice(calculationResult.competitorMetrics.medianCompetitorRate)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>เป้าหมายดัชนี: {calculationResult.competitorMetrics.targetIndexRange}</div>
        </div>

        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P5 ดัชนีราคา (Price Index)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-sky-700" : "text-cyan-400"}`}>
            {calculationResult.competitorMetrics.competitorIndex} <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </div>
          <div className={`text-xs mt-1 font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>อยู่ในกรอบเป้าหมาย</div>
        </div>

        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P5 ดีมานด์พุ่งสูง (Surge)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            {calculationResult.competitorMetrics.soldOutCount} / 5 แห่งเต็ม
          </div>
          <div className={`text-xs mt-1 ${calculationResult.competitorMetrics.highDemandSurgeApplied ? "text-amber-600 font-bold" : isLight ? "text-slate-500" : "text-slate-400"}`}>
            {calculationResult.competitorMetrics.highDemandSurgeApplied ? "+10% เซิร์จอัตโนมัติ" : "ปกติ"}
          </div>
        </div>

        <div className={`border p-3 sm:p-4 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>P7 เพดานราคาต่ำสุด (Floor)</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            {formatPrice(calculationResult.finalRatesByTier[0].priceFloor)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className={`text-xs mt-1 ${isLight ? "text-rose-700" : "text-rose-400"}`}>จุดบล็อกเด็ดขาด: {formatPrice(calculationResult.finalRatesByTier[0].hardBlockFloor)} THB</div>
        </div>
      </div>

      {calculationResult.warnings.length > 0 && (
        <div className={`p-3.5 rounded-lg border text-xs sm:text-sm space-y-1 font-sans ${
          isLight ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-amber-950/20 border-amber-700/60 text-amber-300"
        }`}>
          <div className="font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>แจ้งเตือนจากระบบ (Playbook Advisory):</span>
          </div>
          {calculationResult.warnings.map((w, idx) => (
            <div key={idx} className="pl-6">• {w}</div>
          ))}
        </div>
      )}

      {/* Main Split Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left: 8-Tier Ladder Matrix (lg:col-span-7) */}
        <div className={`lg:col-span-7 border rounded-lg p-4 sm:p-5 ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b mb-3 gap-2 ${
            isLight ? "border-slate-200" : "border-[#1E293B]"
          }`}>
            <div className="flex items-center space-x-2">
              <Layers className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                ตารางโครงสร้างราคาห้องพัก (8 หมวดหมู่)
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                isLight ? "bg-slate-100 text-sky-800 border border-slate-200" : "bg-[#1E293B] text-cyan-300"
              }`}>
                {currentInspectionDate}
              </span>
            </div>
            <span className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              คลิกแถวเพื่อดูสมการ P0–P8
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse border text-xs sm:text-sm min-w-[580px] ${
              isLight ? "border-slate-200" : "border-[#1E293B]"
            }`}>
              <thead>
                <tr className={`border-b text-xs font-bold uppercase ${
                  isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-400"
                }`}>
                  <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ลำดับ</th>
                  <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ประเภทห้องพัก (Room Category)</th>
                  <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>จำนวนห้อง</th>
                  <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ตัวคูณ</th>
                  <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาเสนอแนะ</th>
                  <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาขายจริง</th>
                  <th className="p-2.5 sm:p-3 text-center">จัดการ</th>
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
                      <td className={`p-2.5 sm:p-3 border-r font-bold ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>
                        Tier {t.tier}
                      </td>

                      <td className={`p-2.5 sm:p-3 border-r font-semibold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>
                        {t.roomName}
                        {t.tier === 1 && (
                          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded font-bold font-mono border ${
                            isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "text-cyan-400 border-cyan-700/60"
                          }`}>
                            BASE
                          </span>
                        )}
                      </td>

                      <td className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>
                        {t.rooms}
                      </td>

                      <td className={`p-2.5 sm:p-3 border-r text-right font-mono ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>
                        {t.stepMultiplier.toFixed(2)}x
                      </td>

                      <td className={`p-2.5 sm:p-3 border-r text-right font-bold font-mono text-sm sm:text-base ${isLight ? "border-slate-200 text-slate-800" : "border-[#1E293B] text-slate-200"}`}>
                        {formatPrice(t.suggestedRate)}
                      </td>

                      <td className={`p-2.5 sm:p-3 border-r text-right font-bold font-mono text-sm sm:text-base ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                        <span className={hasOverride ? "text-amber-600 underline" : (isLight ? "text-emerald-700 font-bold" : "text-emerald-400")}>
                          {formatPrice(currentPrice)}
                        </span>
                      </td>

                      <td className="p-2.5 sm:p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(t.tier, currentPrice);
                          }}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors border ${
                            isLight 
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-700" 
                              : "bg-[#1E293B] hover:bg-[#334155] border-[#475569] text-cyan-300"
                          }`}
                        >
                          EDIT
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Docked Rule Execution Inspector (lg:col-span-5) */}
        <div className={`lg:col-span-5 border rounded-lg p-4 sm:p-5 flex flex-col justify-between ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
        }`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
              <div className="flex items-center space-x-2">
                <Terminal className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
                <span className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                  ขั้นตอนและสูตรคำนวณตามกฎ (P0–P8 Rule Trace)
                </span>
              </div>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "text-cyan-400 bg-cyan-950 border-cyan-800"
              }`}>
                TIER {inspectedRoom.tier}
              </span>
            </div>

            <div className={`p-3 rounded-lg border mb-3 flex items-center justify-between ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
            }`}>
              <div>
                <div className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-100"}`}>{inspectedRoom.roomName}</div>
                <div className={`text-xs font-mono mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>เพดานขั้นต่ำ: {formatPrice(inspectedRoom.priceFloor)} THB | บล็อกเด็ดขาด: {formatPrice(inspectedRoom.hardBlockFloor)} THB</div>
              </div>
              <div className="text-right">
                <div className={`text-xl sm:text-2xl font-bold font-mono ${isLight ? "text-sky-700" : "text-cyan-400"}`}>{formatPrice(inspectedRoom.suggestedRate)} <span className="text-xs text-slate-500 font-normal">THB</span></div>
                <div className="text-xs text-slate-500">ราคาเสนอแนะสุทธิ</div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {calculationResult.ruleExecutionTrace.map((step, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#04060A] border-[#151D2C]"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs sm:text-sm ${isLight ? "text-sky-800" : "text-cyan-300"}`}>{step.ruleCode} — {step.ruleName}</span>
                    <span className={`text-xs ${isLight ? "text-slate-600 font-bold" : "text-slate-400"}`}>[{step.status}]</span>
                  </div>
                  <div className={`text-xs font-sans leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>{step.description}</div>
                  <div className={`p-2 rounded border text-xs space-y-1 mt-1 font-mono ${
                    isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0B0F1A] border-[#151D2C] text-slate-300"
                  }`}>
                    <div><span className="text-slate-500 font-semibold">ข้อมูลนำเข้า:</span> {step.inputData}</div>
                    <div><span className="text-slate-500 font-semibold">สูตรคำนวณ:</span> <span className={`font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>{step.arithmetic}</span></div>
                    <div><span className="text-slate-500 font-semibold">ผลลัพธ์:</span> <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{String(step.outputValue)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-3 pt-2.5 border-t text-xs text-center ${isLight ? "border-slate-200 text-slate-500" : "border-[#1E293B] text-slate-400"}`}>
            ตรวจสอบสูตรสมบูรณ์สำหรับห้อง {inspectedRoom.roomName} (ลำดับที่ {inspectedRoom.tier})
          </div>
        </div>

      </div>

      {/* Audit Log Table (P8 Compliance) */}
      <div className={`border rounded-lg p-4 sm:p-5 ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
      }`}>
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
          <div className="flex items-center space-x-2">
            <History className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span className={`font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              บันทึกประวัติการปรับเปลี่ยนราคา (Audit Trail)
            </span>
          </div>
          <span className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            จำนวนรายการ: {auditLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse border text-xs sm:text-sm ${
            isLight ? "border-slate-200" : "border-[#1E293B]"
          }`}>
            <thead>
              <tr className={`border-b text-xs font-bold uppercase ${
                isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-400"
              }`}>
                <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>วัน-เวลา</th>
                <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ประเภทห้องพัก</th>
                <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาก่อนหน้า</th>
                <th className={`p-2.5 sm:p-3 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาใหม่ที่ปรับ</th>
                <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ผู้ดำเนินการ</th>
                <th className={`p-2.5 sm:p-3 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>เหตุผลความจำเป็น</th>
                <th className="p-2.5 sm:p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-[#151D2C]"}`}>
              {auditLogs.map((log, i) => (
                <tr key={i} className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                  <td className={`p-2.5 sm:p-3 border-r font-mono ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>{log.timestamp}</td>
                  <td className={`p-2.5 sm:p-3 border-r font-semibold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>{log.roomName}</td>
                  <td className={`p-2.5 sm:p-3 border-r text-right font-mono ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-400"}`}>{formatPrice(log.oldPrice)} THB</td>
                  <td className={`p-2.5 sm:p-3 border-r text-right font-bold font-mono ${isLight ? "border-slate-200 text-amber-700" : "border-[#1E293B] text-amber-400"}`}>{formatPrice(log.newPrice)} THB</td>
                  <td className={`p-2.5 sm:p-3 border-r font-mono ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{log.user}</td>
                  <td className={`p-2.5 sm:p-3 border-r font-sans ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{log.reason}</td>
                  <td className="p-2.5 sm:p-3 text-center">
                    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${
                      isLight ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-emerald-950/80 border border-emerald-800 text-emerald-400"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical RM Override Modal */}
      {editingTier !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className={`border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl transition-colors ${
            isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#0B0F1A] border-[#334155] text-slate-100"
          }`}>
            
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
              <div className="flex items-center space-x-2">
                <ShieldAlert className={`w-5 h-5 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
                <span className={`font-bold text-base sm:text-lg ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                  ปรับราคาห้องพักด้วยตนเอง — ลำดับที่ {editingTier}
                </span>
              </div>
              <button 
                onClick={() => setEditingTier(null)}
                className={`p-1 rounded transition-colors ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-sans">
              <div>
                <label className={`text-xs sm:text-sm font-bold block mb-1.5 font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  ระบุราคาใหม่ที่ต้องการขาย (บาท):
                </label>
                <input
                  type="number"
                  value={editInputPrice}
                  onChange={(e) => setEditInputPrice(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xl font-bold font-mono focus:outline-none ${
                    isLight 
                      ? "bg-slate-50 border-slate-300 text-sky-800 focus:border-sky-500" 
                      : "bg-[#04060A] border-[#334155] text-cyan-300 focus:border-cyan-400"
                  }`}
                />
              </div>

              {editValidation && (
                <div className={`p-3.5 rounded-lg border text-xs sm:text-sm ${
                  editValidation.severity === "BLOCKED"
                    ? isLight ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-rose-950/30 border-rose-700/80 text-rose-300"
                    : editValidation.severity === "WARNING"
                    ? isLight ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-amber-950/30 border-amber-700/80 text-amber-300"
                    : isLight ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-emerald-950/30 border-emerald-700/80 text-emerald-300"
                }`}>
                  <div className="font-bold">{editValidation.message}</div>
                  {editValidation.violations.length > 0 && (
                    <div className="mt-1.5 text-xs opacity-90 space-y-0.5">
                      {editValidation.violations.map((v, i) => (
                        <div key={i}>• {v}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editValidation?.severity === "WARNING" && (
                <div>
                  <label className={`text-xs sm:text-sm font-bold block mb-1.5 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                    * เหตุผลความจำเป็นทางธุรกิจ (Required by P7):
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={3}
                    placeholder="ระบุเหตุผลในการตั้งราคาต่ำกว่า Floor..."
                    className={`w-full p-2.5 rounded-lg border text-xs sm:text-sm focus:outline-none ${
                      isLight 
                        ? "bg-slate-50 border-amber-400 text-slate-800 focus:border-amber-500" 
                        : "bg-[#04060A] border-amber-600/60 text-slate-100"
                    }`}
                  />
                </div>
              )}

              <div className={`flex items-center justify-end space-x-3 pt-3 border-t ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                <button
                  onClick={() => setEditingTier(null)}
                  className={`px-4 py-2 rounded-md text-xs sm:text-sm font-bold font-mono ${
                    isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-[#111827] text-slate-300 hover:text-white"
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editValidation || !editValidation.canSave}
                  className={`px-5 py-2 rounded-md font-bold text-xs sm:text-sm font-mono transition-all ${
                    !editValidation || !editValidation.canSave
                      ? isLight ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                      : isLight ? "bg-sky-600 hover:bg-sky-700 text-white shadow-xs" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                  }`}
                >
                  บันทึกราคาใหม่
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
