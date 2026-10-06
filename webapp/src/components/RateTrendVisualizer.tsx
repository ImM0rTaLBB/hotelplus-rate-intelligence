"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { 
  TrendingUp, BarChart3, LineChart, Layers, Calendar, 
  Sparkles, CheckCircle2, ChevronRight
} from "lucide-react";
import { 
  calculateRatesForDate, RateCalculationResult, 
  getCompetitorRatesForDate 
} from "@/lib/playbookEngine";
import historicalSummary from "@/data/historicalSummary.json";
import historicalCalculations from "@/data/historicalCalculations.json";
import { formatPrice } from "@/lib/formatters";
import { useTheme } from "@/context/ThemeContext";

interface RateTrendVisualizerProps {
  startDate: string;
  endDate: string;
  currentInspectionDate: string;
  onSelectDate: (date: string) => void;
  tierNumber?: number;
}

interface WeekendRuleItem {
  cap: number;
  occ_delta_pts: number;
  adr_delta_pct: number;
  occ_weekday: number;
  occ_weekend: number;
  adr_weekday: number;
  adr_weekend: number;
  applied_uplift: number;
}

interface RoomTierItem {
  tier: number;
  name: string;
  historical_median: number;
  step_percentage: number;
  cumulative_multiplier: number;
}

const COMPETITOR_PALETTE: Record<string, { label: string; color: string; short: string }> = {
  "Hotel Plus (Suggested)": { label: "Hotel Plus (Proposed)", color: "#0284C7", short: "H+ PROP" },
  "Bay Beach Resort Jomtien": { label: "Bay Beach Resort", color: "#10B981", short: "BAY BEACH" },
  "Zand Morada Pattaya": { label: "Zand Morada Pattaya", color: "#06B6D4", short: "ZAND MORADA" },
  "Dragon Beach Resort": { label: "Dragon Beach Resort", color: "#F97316", short: "DRAGON BEACH" },
  "Sonia Residence": { label: "Sonia Residence", color: "#EC4899", short: "SONIA RES" },
  "Inn Residence Serviced Suites Pattaya": { label: "Inn Residence", color: "#8B5CF6", short: "INN RES" },
};

export const RateTrendVisualizer: React.FC<RateTrendVisualizerProps> = ({
  startDate,
  endDate,
  currentInspectionDate,
  onSelectDate,
  tierNumber = 1
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeView, setActiveView] = useState<"corridor" | "competitors" | "seasonality" | "weekend_uplift" | "tier_ladder">("corridor");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeCompetitorFilters, setActiveCompetitorFilters] = useState<Record<string, boolean>>({
    "Bay Beach Resort Jomtien": true,
    "Zand Morada Pattaya": true,
    "Dragon Beach Resort": true,
    "Sonia Residence": true,
    "Inn Residence Serviced Suites Pattaya": true,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // Timezone-safe UTC date range generator
  const dateRangeList = useMemo(() => {
    const list: string[] = [];
    const [sY, sM, sD] = startDate.split("-").map(Number);
    const [eY, eM, eD] = endDate.split("-").map(Number);
    let currUtc = Date.UTC(sY, sM - 1, sD);
    const endUtc = Date.UTC(eY, eM - 1, eD);
    
    let count = 0;
    while (currUtc <= endUtc && count < 90) {
      const d = new Date(currUtc);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      list.push(`${y}-${m}-${day}`);
      currUtc += 86400000;
      count++;
    }
    return list.length > 0 ? list : [startDate];
  }, [startDate, endDate]);

  // Compute daily series using O(1) competitor lookups and UTC day labels
  const dailySeries = useMemo(() => {
    return dateRangeList.map(dateStr => {
      const calc: RateCalculationResult = calculateRatesForDate(dateStr);
      const compsForDate = getCompetitorRatesForDate(dateStr);
      
      const compMap: Record<string, number | null> = {};
      compsForDate.forEach(c => {
        compMap[c.hotel_name] = c.status === "เต็ม" ? null : Number(c.price_per_night);
      });

      const tierRate = calc.finalRatesByTier.find(t => t.tier === tierNumber)?.suggestedRate || calc.finalRatesByTier[0].suggestedRate;
      const tierFloor = calc.finalRatesByTier.find(t => t.tier === tierNumber)?.priceFloor || 750;

      const [y, m, d] = dateStr.split("-").map(Number);
      const utcDate = new Date(Date.UTC(y, m - 1, d));
      const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][utcDate.getUTCDay()];
      const dayNum = utcDate.getUTCDate();

      return {
        date: dateStr,
        dayOfWeek,
        dayNum,
        season: calc.season,
        isWeekend: calc.isWeekend,
        isSpecialDay: calc.isSpecialDay,
        specialEventName: calc.specialEventName,
        baseRate: calc.baseRoomRate,
        hotelPlusRate: tierRate,
        compMedian: calc.competitorMetrics.medianCompetitorRate,
        priceFloor: tierFloor,
        soldOutCount: calc.competitorMetrics.soldOutCount,
        highSurge: calc.competitorMetrics.highDemandSurgeApplied,
        priceIndex: calc.competitorMetrics.competitorIndex,
        competitors: compMap
      };
    });
  }, [dateRangeList, tierNumber]);

  // Summary stats for the range
  const rangeStats = useMemo(() => {
    if (dailySeries.length === 0) return { min: 0, max: 0, avg: 0, compAvg: 0, surgeDays: 0 };
    const rates = dailySeries.map(d => d.hotelPlusRate);
    const compMedians = dailySeries.map(d => d.compMedian);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    const compAvg = Math.round(compMedians.reduce((a, b) => a + b, 0) / compMedians.length);
    const surgeDays = dailySeries.filter(d => d.highSurge || d.isSpecialDay).length;

    return { min, max, avg, compAvg, surgeDays };
  }, [dailySeries]);

  // SVG Dimension constants
  const svgWidth = 1000;
  const svgHeight = 280;
  const padding = useMemo(() => ({ top: 25, right: 30, bottom: 40, left: 55 }), []);
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Min and Max prices for Y-axis scale
  const yDomain = useMemo(() => {
    let minVal = 600;
    let maxVal = 2400;

    if (activeView === "corridor" || activeView === "competitors") {
      const allVals: number[] = [750];
      dailySeries.forEach(d => {
        allVals.push(d.hotelPlusRate);
        allVals.push(d.compMedian);
        if (activeView === "competitors") {
          Object.values(d.competitors).forEach(v => {
            if (v !== null) allVals.push(v);
          });
        }
      });
      minVal = Math.floor(Math.min(...allVals) / 100) * 100 - 100;
      maxVal = Math.ceil(Math.max(...allVals) / 100) * 100 + 100;
      minVal = Math.max(500, minVal);
    }
    return { min: minVal, max: maxVal };
  }, [dailySeries, activeView]);

  const getY = useCallback((val: number) => {
    return padding.top + chartHeight - ((val - yDomain.min) / (yDomain.max - yDomain.min)) * chartHeight;
  }, [padding.top, chartHeight, yDomain.min, yDomain.max]);

  const getX = useCallback((idx: number) => {
    if (dailySeries.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (dailySeries.length - 1)) * chartWidth;
  }, [padding.left, chartWidth, dailySeries.length]);

  // Build SVG Paths for Corridor
  const hotelPlusPath = useMemo(() => {
    if (dailySeries.length === 0) return "";
    return dailySeries.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.hotelPlusRate).toFixed(1)}`).join(" ");
  }, [dailySeries, getX, getY]);

  const hotelPlusArea = useMemo(() => {
    if (dailySeries.length === 0) return "";
    const line = dailySeries.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.hotelPlusRate).toFixed(1)}`).join(" ");
    const close = `L ${getX(dailySeries.length - 1).toFixed(1)} ${padding.top + chartHeight} L ${getX(0).toFixed(1)} ${padding.top + chartHeight} Z`;
    return `${line} ${close}`;
  }, [dailySeries, getX, getY, padding.top, chartHeight]);

  const compMedianPath = useMemo(() => {
    if (dailySeries.length === 0) return "";
    return dailySeries.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.compMedian).toFixed(1)}`).join(" ");
  }, [dailySeries, getX, getY]);

  const p3BasePath = useMemo(() => {
    if (dailySeries.length === 0) return "";
    return dailySeries.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.baseRate).toFixed(1)}`).join(" ");
  }, [dailySeries, getX, getY]);

  // Handle interactive touch/pointer scrubbing
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || dailySeries.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * svgWidth;
    
    const chartRelativeX = relativeX - padding.left;
    const step = chartWidth / (dailySeries.length - 1 || 1);
    let index = Math.round(chartRelativeX / step);
    index = Math.max(0, Math.min(dailySeries.length - 1, index));
    setHoveredIndex(index);
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
  };

  const handlePointClick = (idx: number) => {
    const selected = dailySeries[idx];
    if (selected) {
      onSelectDate(selected.date);
    }
  };

  const activeHoveredData = hoveredIndex !== null ? dailySeries[hoveredIndex] : null;

  return (
    <div className={`border rounded-lg overflow-hidden font-mono text-xs sm:text-sm select-none transition-colors duration-150 ${
      isLight ? "bg-white border-slate-200 text-slate-800 shadow-xs" : "bg-[#070A12] border-[#1E293B] text-slate-100 shadow-xl"
    }`}>
      
      {/* Header Controller Bar */}
      <div className={`p-3 sm:p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-[#090D17] border-[#1E293B]"
      }`}>
        <div>
          <div className="text-sm sm:text-base font-bold flex items-center space-x-2">
            <LineChart className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span className={isLight ? "text-slate-900" : "text-slate-100"}>กราฟแนวโน้มราคาห้องพัก, กรอบราคาคู่แข่ง และฤดูกาล</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono border ${
              isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-cyan-950 border-cyan-800 text-cyan-300"
            }`}>
              {startDate} → {endDate} ({dailySeries.length} วัน)
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-md border ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
        }`}>
          <button
            onClick={() => setActiveView("corridor")}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              activeView === "corridor"
                ? isLight 
                  ? "bg-white text-sky-700 border border-sky-300 shadow-xs" 
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : isLight 
                ? "text-slate-600 hover:text-slate-900" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span>กรอบราคาตลาด</span>
          </button>

          <button
            onClick={() => setActiveView("competitors")}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              activeView === "competitors"
                ? isLight 
                  ? "bg-white text-amber-700 border border-amber-300 shadow-xs" 
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : isLight 
                ? "text-slate-600 hover:text-slate-900" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
            <span>เปรียบเทียบ 5 คู่แข่ง</span>
          </button>

          <button
            onClick={() => setActiveView("seasonality")}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              activeView === "seasonality"
                ? isLight 
                  ? "bg-white text-purple-700 border border-purple-300 shadow-xs" 
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : isLight 
                ? "text-slate-600 hover:text-slate-900" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            <span>อัตราเข้าพัก & ADR</span>
          </button>

          <button
            onClick={() => setActiveView("weekend_uplift")}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              activeView === "weekend_uplift"
                ? isLight 
                  ? "bg-white text-emerald-700 border border-emerald-300 shadow-xs" 
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : isLight 
                ? "text-slate-600 hover:text-slate-900" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>ส่วนต่างวันหยุด</span>
          </button>

          <button
            onClick={() => setActiveView("tier_ladder")}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 ${
              activeView === "tier_ladder"
                ? isLight 
                  ? "bg-white text-sky-700 border border-sky-300 shadow-xs" 
                  : "bg-[#1E293B] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : isLight 
                ? "text-slate-600 hover:text-slate-900" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>บันไดราคาห้องพัก</span>
          </button>
        </div>
      </div>

      {/* Range Quick Statistics Ribbon */}
      <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 sm:p-4 border-b ${
        isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#0B0F1A] border-[#1E293B]"
      }`}>
        <div className={`border p-3 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#070A12] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>ราคาเสนอแนะเฉลี่ย</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-sky-700" : "text-cyan-400"}`}>
            {formatPrice(rangeStats.avg)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Deluxe Twin (T1)</div>
        </div>

        <div className={`border p-3 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#070A12] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>มัธยฐานคู่แข่งเฉลี่ย</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-amber-700" : "text-amber-400"}`}>
            {formatPrice(rangeStats.compAvg)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">เกณฑ์อ้างอิง (5 โรงแรม)</div>
        </div>

        <div className={`border p-3 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#070A12] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>ช่วงราคากระจายตัว</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            {formatPrice(rangeStats.min)} - {formatPrice(rangeStats.max)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className={`text-xs mt-1 font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
            Δ {formatPrice(rangeStats.max - rangeStats.min)} THB Span
          </div>
        </div>

        <div className={`border p-3 rounded-lg ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#070A12] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>วันดีมานด์พุ่งสูง / พีค</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-purple-700" : "text-purple-400"}`}>
            {rangeStats.surgeDays} / {dailySeries.length} <span className="text-xs text-slate-500 font-normal">วัน</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">P2 Peak + P5 เซิร์จสูง</div>
        </div>

        <div className={`border p-3 rounded-lg col-span-2 sm:col-span-1 ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#070A12] border-[#1E293B]"}`}>
          <div className={`text-xs font-bold uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>ผ่านเกณฑ์ Floor Price</div>
          <div className={`font-bold text-xl sm:text-2xl font-mono mt-1 ${isLight ? "text-rose-700" : "text-rose-400"}`}>
            {formatPrice(750)} <span className="text-xs text-slate-500 font-normal">THB</span>
          </div>
          <div className={`text-xs flex items-center space-x-1 mt-1 font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5 inline" />
            <span>ผ่านเกณฑ์ 100% ทุกวัน</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas Area */}
      <div className="p-3 sm:p-5 relative">
        
        {/* VIEW 1: DAILY RATE CORRIDOR */}
        {activeView === "corridor" && (
          <div className="space-y-3">
            <div className={`flex flex-wrap items-center justify-between text-xs gap-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5 font-bold">
                  <span className={`w-3.5 h-1.5 rounded-sm inline-block ${isLight ? "bg-sky-600" : "bg-cyan-400"}`}></span>
                  <span className={isLight ? "text-sky-700" : "text-cyan-300"}>ราคาเสนอแนะ Hotel Plus</span>
                </span>
                <span className="flex items-center space-x-1.5 font-bold">
                  <span className="w-3.5 h-1.5 bg-amber-500 rounded-sm inline-block"></span>
                  <span className={isLight ? "text-amber-800" : "text-amber-300"}>มัธยฐานคู่แข่ง (Median)</span>
                </span>
                <span className="flex items-center space-x-1.5 hidden sm:flex">
                  <span className="w-3.5 h-0.5 bg-slate-400 border-b border-dashed border-slate-400 inline-block"></span>
                  <span className={isLight ? "text-slate-600" : "text-slate-400"}>ราคาฐาน (Baseline)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-0.5 bg-rose-500 border-b border-dashed border-rose-500 inline-block"></span>
                  <span className={isLight ? "text-rose-700 font-bold" : "text-rose-400 font-bold"}>เพดานขั้นต่ำ Floor (750.00 THB)</span>
                </span>
              </div>
              <span className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                💡 ชี้เมาส์เพื่อดูค่า หรือ <strong>คลิกบนกราฟ</strong> เพื่อเปลี่ยนวันตรวจเช็คที่ Rule Inspector
              </span>
            </div>

            {/* Interactive SVG Chart Container */}
            <div className="relative w-full overflow-x-auto no-scrollbar">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={`w-full h-auto min-w-[650px] rounded border cursor-crosshair ${
                  isLight ? "bg-white border-slate-200" : "bg-[#04060A] border-[#1E293B]"
                }`}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
              >
                <defs>
                  <linearGradient id="corridorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isLight ? "#0284C7" : "#06B6D4"} stopOpacity={isLight ? "0.15" : "0.25"} />
                    <stop offset="100%" stopColor={isLight ? "#0284C7" : "#06B6D4"} stopOpacity="0.0" />
                  </linearGradient>
                  <pattern id="gridPattern" width="50" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 40" fill="none" stroke={isLight ? "#F1F5F9" : "#131B2E"} strokeWidth="1" />
                  </pattern>
                </defs>

                {/* Grid Background */}
                <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="url(#gridPattern)" />

                {/* Y-Axis Horizontal Grid lines & Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const val = Math.round(yDomain.min + pct * (yDomain.max - yDomain.min));
                  const y = getY(val);
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartWidth}
                        y2={y}
                        stroke={isLight ? "#E2E8F0" : "#1E293B"}
                        strokeWidth="1"
                        strokeDasharray={pct === 0 ? "none" : "3 3"}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3.5}
                        fill={isLight ? "#475569" : "#64748B"}
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Special Event Peak Highlight Bands */}
                {dailySeries.map((d, i) => {
                  if (!d.isSpecialDay && !d.highSurge) return null;
                  const x = getX(i);
                  const stepHalf = (chartWidth / (dailySeries.length - 1 || 1)) / 2;
                  return (
                    <rect
                      key={`peak-${i}`}
                      x={x - stepHalf}
                      y={padding.top}
                      width={stepHalf * 2}
                      height={chartHeight}
                      fill={d.isSpecialDay ? (isLight ? "rgba(147, 51, 234, 0.08)" : "rgba(168, 85, 247, 0.12)") : (isLight ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.08)")}
                    />
                  );
                })}

                {/* P7 Price Floor Line (750 THB) */}
                <line
                  x1={padding.left}
                  y1={getY(750)}
                  x2={padding.left + chartWidth}
                  y2={getY(750)}
                  stroke="#E11D48"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left + chartWidth - 5}
                  y={getY(750) - 5}
                  fill="#E11D48"
                  fontSize="8.5"
                  textAnchor="end"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  P7 FLOOR: {formatPrice(750)} THB
                </text>

                {/* P3 Baseline Line */}
                <path
                  d={p3BasePath}
                  fill="none"
                  stroke={isLight ? "#94A3B8" : "#475569"}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Shaded Area under Hotel Plus */}
                <path d={hotelPlusArea} fill="url(#corridorGradient)" />

                {/* Competitor Median Line */}
                <path
                  d={compMedianPath}
                  fill="none"
                  stroke={isLight ? "#D97706" : "#F59E0B"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Hotel Plus Proposed Rate Line */}
                <path
                  d={hotelPlusPath}
                  fill="none"
                  stroke={isLight ? "#0284C7" : "#06B6D4"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data Points on Hotel Plus Line */}
                {dailySeries.map((d, i) => {
                  const x = getX(i);
                  const y = getY(d.hotelPlusRate);
                  const isCurrentInspected = d.date === currentInspectionDate;
                  const isHovered = hoveredIndex === i;

                  return (
                    <g 
                      key={`pt-${i}`}
                      onClick={() => handlePointClick(i)}
                      className="cursor-pointer"
                    >
                      {/* Active inspection ring */}
                      {isCurrentInspected && (
                        <circle
                          cx={x}
                          y={y}
                          r="7"
                          fill="none"
                          stroke={isLight ? "#0284C7" : "#38BDF8"}
                          strokeWidth="2"
                          className="animate-ping"
                        />
                      )}

                      <circle
                        cx={x}
                        y={y}
                        r={isHovered ? "5.5" : isCurrentInspected ? "4.5" : d.isWeekend ? "3.5" : "2.5"}
                        fill={isCurrentInspected ? (isLight ? "#0284C7" : "#38BDF8") : d.isSpecialDay ? "#9333EA" : d.isWeekend ? "#10B981" : (isLight ? "#0284C7" : "#06B6D4")}
                        stroke={isLight ? "#FFFFFF" : "#070A12"}
                        strokeWidth="1.5"
                      />

                      {/* X-axis ticks */}
                      {(i % Math.ceil(dailySeries.length / 10) === 0 || i === dailySeries.length - 1) && (
                        <g>
                          <line
                            x1={x}
                            y1={padding.top + chartHeight}
                            x2={x}
                            y2={padding.top + chartHeight + 5}
                            stroke={isLight ? "#CBD5E1" : "#334155"}
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={padding.top + chartHeight + 16}
                            fill={isCurrentInspected ? (isLight ? "#0284C7" : "#38BDF8") : (isLight ? "#475569" : "#64748B")}
                            fontSize="8.5"
                            textAnchor="middle"
                            fontFamily="monospace"
                            fontWeight={isCurrentInspected ? "bold" : "normal"}
                          >
                            {d.dayNum} ({d.dayOfWeek})
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Vertical Cursor Crosshair on Hover */}
                {hoveredIndex !== null && activeHoveredData && (
                  <g pointerEvents="none">
                    <line
                      x1={getX(hoveredIndex)}
                      y1={padding.top}
                      x2={getX(hoveredIndex)}
                      y2={padding.top + chartHeight}
                      stroke={isLight ? "#0284C7" : "#38BDF8"}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={getX(hoveredIndex)}
                      y={getY(activeHoveredData.hotelPlusRate)}
                      r="5"
                      fill={isLight ? "#0284C7" : "#38BDF8"}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={getX(hoveredIndex)}
                      y={getY(activeHoveredData.compMedian)}
                      r="4"
                      fill={isLight ? "#D97706" : "#F59E0B"}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>

              {/* Floating Scrub HUD Card */}
              {activeHoveredData && (
                <div className={`mt-3 p-4 border rounded-lg text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-5 gap-3 shadow-md animate-in fade-in duration-150 ${
                  isLight 
                    ? "bg-white border-sky-300 text-slate-800" 
                    : "bg-[#0A1222] border-cyan-700/80 text-slate-100"
                }`}>
                  <div className={`border-r pr-2 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                    <div className="text-slate-500 text-xs font-bold">วันที่ (DATE)</div>
                    <div className={`font-bold text-sm sm:text-base font-mono mt-0.5 ${isLight ? "text-sky-700" : "text-cyan-300"}`}>
                      {activeHoveredData.date}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {activeHoveredData.dayOfWeek} • {activeHoveredData.season} Season
                    </div>
                  </div>

                  <div className={`border-r pr-2 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                    <div className="text-slate-500 text-xs font-bold">ราคาเสนอแนะ HOTEL PLUS</div>
                    <div className={`font-bold text-base sm:text-lg font-mono mt-0.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      {formatPrice(activeHoveredData.hotelPlusRate)} THB
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      ราคาฐาน: {formatPrice(activeHoveredData.baseRate)} THB
                    </div>
                  </div>

                  <div className={`border-r pr-2 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                    <div className="text-slate-500 text-xs font-bold">มัธยฐานคู่แข่ง (MEDIAN)</div>
                    <div className={`font-bold text-base sm:text-lg font-mono mt-0.5 ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                      {formatPrice(activeHoveredData.compMedian)} THB
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      ดัชนีราคา: {activeHoveredData.priceIndex} / 100
                    </div>
                  </div>

                  <div className={`border-r pr-2 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                    <div className="text-slate-500 text-xs font-bold">ดีมานด์พุ่งสูง (SURGE)</div>
                    <div className={`font-bold text-sm sm:text-base mt-0.5 ${activeHoveredData.soldOutCount >= 3 ? "text-rose-600" : isLight ? "text-slate-800" : "text-slate-200"}`}>
                      {activeHoveredData.soldOutCount} / 5 แห่งเต็ม
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {activeHoveredData.highSurge ? "+10% เซิร์จทำงาน" : "ความจุปกติ"}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <button
                      onClick={() => onSelectDate(activeHoveredData.date)}
                      className={`px-3 py-2 rounded-md font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-1 shadow-xs ${
                        isLight 
                          ? "bg-sky-600 hover:bg-sky-700 text-white" 
                          : "bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-200"
                      }`}
                    >
                      <span>ตรวจสอบวัน</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: 5 COMPETITOR BENCHMARK COMPARISON */}
        {activeView === "competitors" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className={`font-bold ${isLight ? "text-slate-800" : "text-slate-300"}`}>เปิด/ปิดเส้นกราฟคู่แข่ง (TOGGLE):</div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(COMPETITOR_PALETTE).map(([hotel, info]) => {
                  if (hotel === "Hotel Plus (Suggested)") return null;
                  const isChecked = activeCompetitorFilters[hotel] !== false;
                  return (
                    <button
                      key={hotel}
                      onClick={() => setActiveCompetitorFilters(prev => ({ ...prev, [hotel]: !isChecked }))}
                      className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        isChecked 
                          ? isLight
                            ? "bg-slate-100 text-slate-800 border-slate-300 shadow-xs"
                            : "bg-[#111A2E] text-slate-100 border-slate-600" 
                          : "bg-transparent text-slate-400 border-slate-300 line-through"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: info.color }}></span>
                      <span>{info.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={`w-full h-auto min-w-[650px] rounded border ${
                  isLight ? "bg-white border-slate-200" : "bg-[#04060A] border-[#1E293B]"
                }`}
              >
                {/* Grid */}
                <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="none" stroke={isLight ? "#E2E8F0" : "#131B2E"} />

                {/* Y-axis */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const val = Math.round(yDomain.min + pct * (yDomain.max - yDomain.min));
                  const y = getY(val);
                  return (
                    <g key={i}>
                      <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke={isLight ? "#E2E8F0" : "#1E293B"} strokeWidth="1" strokeDasharray="3 3" />
                      <text x={padding.left - 8} y={y + 4} fill={isLight ? "#475569" : "#64748B"} fontSize="10" textAnchor="end" fontFamily="monospace">{val}</text>
                    </g>
                  );
                })}

                {/* Draw each competitor line */}
                {Object.entries(COMPETITOR_PALETTE).map(([hotel, info]) => {
                  if (hotel !== "Hotel Plus (Suggested)" && activeCompetitorFilters[hotel] === false) return null;

                  const points = dailySeries.map((d, i) => {
                    const price = hotel === "Hotel Plus (Suggested)" ? d.hotelPlusRate : d.competitors[hotel];
                    if (price === null || price === undefined) return null;
                    return { x: getX(i), y: getY(price) };
                  });

                  let dStr = "";
                  points.forEach((pt) => {
                    if (pt) {
                      dStr += `${dStr === "" ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
                    }
                  });

                  const isHotelPlus = hotel === "Hotel Plus (Suggested)";

                  return (
                    <g key={hotel}>
                      <path
                        d={dStr}
                        fill="none"
                        stroke={info.color}
                        strokeWidth={isHotelPlus ? "3.2" : "2"}
                        strokeLinecap="round"
                        strokeOpacity={isHotelPlus ? 1 : 0.85}
                      />
                      {points[points.length - 1] && (
                        <circle
                          cx={points[points.length - 1]!.x}
                          cy={points[points.length - 1]!.y}
                          r={isHotelPlus ? "5" : "3.5"}
                          fill={info.color}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* VIEW 3: HISTORICAL OCCUPANCY & ADR MONTHLY TREND */}
        {activeView === "seasonality" && (
          <div className="space-y-4">
            <div className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
              แนวโน้มอัตราเข้าพักและราคาเฉลี่ยต่อวันรายเดือน ย้อนหลัง 16,372 คืน (2025 เทียบ 2026):
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Monthly Occupancy Comparison */}
              <div className={`p-4 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#04060A] border-[#1E293B]"}`}>
                <div className={`font-bold mb-3 flex items-center justify-between text-xs sm:text-sm ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  <span>อัตราการเข้าพักรายเดือน (Monthly Occupancy %)</span>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-slate-400 rounded"></span><span>2025</span></span>
                    <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-sky-500 rounded"></span><span>2026</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  {historicalSummary.monthly_stats.map((m) => (
                    <div key={m.month} className="flex items-center text-xs space-x-2">
                      <span className={`w-9 font-mono font-bold ${isLight ? "text-slate-700" : "text-slate-400"}`}>{m.name.substring(0, 3)}</span>
                      <div className="flex-1 flex flex-col space-y-1">
                        <div className="flex items-center">
                          <div 
                            className="bg-sky-500 h-2.5 rounded-sm transition-all" 
                            style={{ width: `${Math.min(100, (m.occ_2026 / 45) * 100)}%` }}
                          ></div>
                          <span className={`ml-1.5 text-xs font-bold ${isLight ? "text-sky-800" : "text-cyan-300"}`}>{m.occ_2026}%</span>
                        </div>
                        <div className="flex items-center">
                          <div 
                            className={`h-2 rounded-sm transition-all ${isLight ? "bg-slate-300" : "bg-slate-700"}`}
                            style={{ width: `${Math.min(100, (m.occ_2025 / 45) * 100)}%` }}
                          ></div>
                          <span className={`ml-1.5 text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>{m.occ_2025}%</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        m.season === "High" 
                          ? isLight ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-amber-950 text-amber-400"
                          : m.season === "Low" 
                          ? isLight ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-blue-950 text-blue-400"
                          : isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-emerald-950 text-emerald-400"
                      }`}>
                        {m.season}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly ADR Trend */}
              <div className={`p-4 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#04060A] border-[#1E293B]"}`}>
                <div className={`font-bold mb-3 flex items-center justify-between text-xs sm:text-sm ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  <span>การกระจายราคาห้องพักเฉลี่ยต่อวัน (ADR Distribution - บาท)</span>
                  <span className={`text-xs font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>ค่าเฉลี่ยทั้งปี: 1,527.00 THB</span>
                </div>

                <div className="space-y-2">
                  {historicalSummary.monthly_stats.map((m) => (
                    <div key={m.month} className="flex items-center text-xs space-x-2">
                      <span className={`w-9 font-mono font-bold ${isLight ? "text-slate-700" : "text-slate-400"}`}>{m.name.substring(0, 3)}</span>
                      <div className={`flex-1 h-5 rounded overflow-hidden relative ${isLight ? "bg-slate-200" : "bg-[#090D17]"}`}>
                        <div 
                          className={`h-full rounded transition-all flex items-center px-2 ${isLight ? "bg-emerald-600" : "bg-emerald-600/70"}`}
                          style={{ width: `${Math.min(100, (m.adr_avg / 2800) * 100)}%` }}
                        >
                          <span className="text-xs text-white font-bold whitespace-nowrap">{formatPrice(m.adr_avg)} THB</span>
                        </div>
                      </div>
                      <span className={`w-24 text-right text-xs font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                        26: {formatPrice(m.adr_2026)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: WEEKEND PREMIUM DYNAMICS */}
        {activeView === "weekend_uplift" && (
          <div className="space-y-4">
            <div className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
              การตรวจสอบตามกฎ P4: ส่วนต่างอัตราเข้าพักและราคา ADR วันหยุดเทียบวันธรรมดา:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {Object.entries(historicalCalculations.p4_weekend_rules).map(([season, rawData]) => {
                const data = rawData as WeekendRuleItem;
                return (
                  <div key={season} className={`border rounded-lg p-4 space-y-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
                  }`}>
                    <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                      <span className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-slate-200"}`}>ฤดูกาล {season.toUpperCase()}</span>
                      <span className={`px-2.5 py-1 rounded font-bold text-xs border ${
                        isLight ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        เพดาน P4: +{(data.cap * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs sm:text-sm">
                      <div>
                        <div className={`text-xs flex justify-between font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          <span>ส่วนต่างอัตราเข้าพัก</span>
                          <span className={isLight ? "text-sky-700" : "text-cyan-400"}>+{data.occ_delta_pts} pts</span>
                        </div>
                        <div className={`flex items-center justify-between mt-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                          <span>วันธรรมดา: {data.occ_weekday}%</span>
                          <span>วันหยุด: {data.occ_weekend}%</span>
                        </div>
                      </div>

                      <div>
                        <div className={`text-xs flex justify-between font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          <span>ส่วนต่างราคา ADR</span>
                          <span className={isLight ? "text-amber-800" : "text-amber-400"}>+{data.adr_delta_pct}%</span>
                        </div>
                        <div className={`flex items-center justify-between mt-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                          <span>วันธรรมดา: {formatPrice(data.adr_weekday)} THB</span>
                          <span>วันหยุด: {formatPrice(data.adr_weekend)} THB</span>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-md border text-xs leading-relaxed font-sans ${
                        isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#090D17] border-slate-800 text-slate-300"
                      }`}>
                        สถานะ: <strong className={isLight ? "text-emerald-700" : "text-emerald-400"}>ผ่านเกณฑ์ (QUALIFIED)</strong> (Occ &ge; +3 pts & ADR &ge; +5%).
                        ปรับ Uplift สูงสุดที่ <strong>+{(data.applied_uplift * 100).toFixed(0)}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: ROOM TIER ESCALATION LADDER */}
        {activeView === "tier_ladder" && (
          <div className="space-y-4">
            <div className={`text-xs sm:text-sm font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
              กฎ P6: โครงสร้างบันไดราคา 8 ลำดับห้องพัก สำหรับวันที่ {currentInspectionDate}:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {(historicalCalculations.p6_room_tiers as unknown as RoomTierItem[]).map((tier) => {
                const currentCalc = calculateRatesForDate(currentInspectionDate);
                const tierInfo = currentCalc.finalRatesByTier.find(t => t.tier === tier.tier);
                const rate = tierInfo ? tierInfo.suggestedRate : 1000;
                const roomCount = tierInfo ? tierInfo.rooms : 0;

                return (
                  <div key={tier.tier} className={`border rounded-lg p-3 flex flex-col justify-between ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
                  }`}>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? "text-sky-700" : "text-cyan-400"}`}>TIER {tier.tier}</div>
                      <div className={`font-bold text-xs sm:text-sm mt-1 leading-snug line-clamp-2 ${isLight ? "text-slate-900" : "text-slate-100"}`}>{tier.name}</div>
                      <div className="text-slate-500 text-xs mt-1">{roomCount} ROOMS</div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                      <div className="text-slate-500 text-xs">Step: +{(tier.step_percentage * 100).toFixed(1)}%</div>
                      <div className={`font-bold text-sm sm:text-base mt-0.5 font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                        {formatPrice(rate)} <span className="text-xs text-slate-500 font-normal">THB</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
