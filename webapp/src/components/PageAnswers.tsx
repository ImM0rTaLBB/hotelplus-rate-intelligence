"use client";

import React, { useState } from "react";
import { 
  Terminal, Binary, AlertTriangle, CheckCircle2, Zap
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { useTheme } from "@/context/ThemeContext";

export const PageAnswers: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"simplified" | "detailed">("simplified");

  return (
    <div className="space-y-6 font-mono select-none w-full">
      
      {/* Header Controller Banner */}
      <div className={`border p-4 sm:p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isLight ? "bg-white border-slate-200 text-slate-800 shadow-xs" : "bg-[#090D17] border-[#1E293B] text-slate-100"
      }`}>
        <div>
          <div className={`flex items-center space-x-2 text-xs mb-1 font-bold ${isLight ? "text-amber-700" : "text-amber-400"}`}>
            <Binary className="w-4 h-4" />
            <span>รายงานผลการวิเคราะห์และตรวจสอบ (หน้า 3)</span>
          </div>
          <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            เฉลยคำตอบอย่างเป็นทางการ: ข้อ 5 (ตารางราคาเสนอแนะ) และข้อ 6 พิเศษ (ข้อขัดแย้งในข้อมูลจริง)
          </h1>
          <p className={`text-xs sm:text-sm mt-1 font-sans ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            สรุปผลการวิเคราะห์ราคาเสนอแนะตามกฎ RM Playbook (P0–P8) และแนวทางแก้ไขข้อขัดแย้งในข้อมูลจริง
          </p>
        </div>

        {/* Tab Switcher: Simplified (Fast Read) vs Detailed */}
        <div className={`flex items-center space-x-1.5 p-1.5 rounded-lg border shrink-0 ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#04060A] border-[#1E293B]"
        }`}>
          <button
            onClick={() => setActiveTab("simplified")}
            className={`px-3.5 py-2 rounded-md transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              activeTab === "simplified"
                ? isLight
                  ? "bg-white text-amber-800 border border-amber-300 shadow-xs"
                  : "bg-amber-950 text-amber-300 border border-amber-600 shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <span>[1] สรุปสั้น เข้าใจทันที (Fast Read)</span>
          </button>

          <button
            onClick={() => setActiveTab("detailed")}
            className={`px-3.5 py-2 rounded-md transition-all flex items-center space-x-2 font-bold text-xs sm:text-sm ${
              activeTab === "detailed"
                ? isLight
                  ? "bg-white text-sky-800 border border-sky-300 shadow-xs"
                  : "bg-cyan-950 text-cyan-300 border border-cyan-600 shadow-sm"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Binary className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
            <span>[2] เจาะลึกสมการ & ข้อมูลตรวจสอบ (Detailed)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIMPLIFIED / FAST READ / SCANNABLE IN 15 SECONDS                   */}
      {/* ========================================================================= */}
      {activeTab === "simplified" && (
        <div className="space-y-6">
          
          {/* SECTION A: QUESTION 5 RATES (BIG, BOLD, SCANNABLE) */}
          <div className="space-y-3">
            <div className={`flex items-center space-x-2 font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              <CheckCircle2 className={`w-5 h-5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
              <span>QUESTION 5: สรุปราคาเสนอแนะ (ห้อง Deluxe Room Twin Bed)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Dec 2026 Weekday */}
              <div className={`border-2 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                isLight 
                  ? "bg-white border-emerald-300 hover:border-emerald-500 shadow-xs text-slate-800" 
                  : "bg-[#0B0F1A] border-emerald-900/60 hover:border-emerald-500 text-slate-200"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-amber-800 bg-amber-50 border-amber-300" : "text-amber-400 bg-amber-950/80 border-amber-800"
                    }`}>
                      HIGH SEASON
                    </span>
                    <span className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>0% Uplift</span>
                  </div>
                  <div className={`font-bold text-sm sm:text-base mt-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>ธ.ค. 2026 // วันธรรมดา</div>
                  <div className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>จันทร์ – พฤหัสบดี (Weekday)</div>

                  <div className="my-3">
                    <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      {formatPrice(1107)} <span className="text-sm font-normal text-slate-500">THB</span>
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>รวมภาษีและบริการ (Gross Inclusive)</div>
                  </div>
                </div>

                <div className={`pt-3 border-t space-y-1.5 text-xs font-sans ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>ฐานราคา P3:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{formatPrice(963)} THB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>คู่แข่ง Median:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-amber-800" : "text-amber-300"}`}>{formatPrice(1550)} THB</span>
                  </div>
                  <div className={`font-bold text-[11px] pt-1 border-t ${isLight ? "text-emerald-700 border-slate-200" : "text-emerald-400 border-slate-800"}`}>
                    ✓ ปรับตามคู่แข่ง ชนเพดานป้องกันความเสี่ยง +15%
                  </div>
                </div>
              </div>

              {/* Card 2: Dec 2026 Weekend */}
              <div className={`border-2 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                isLight 
                  ? "bg-white border-emerald-300 hover:border-emerald-500 shadow-xs text-slate-800" 
                  : "bg-[#0B0F1A] border-emerald-900/60 hover:border-emerald-500 text-slate-200"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-amber-800 bg-amber-50 border-amber-300" : "text-amber-400 bg-amber-950/80 border-amber-800"
                    }`}>
                      HIGH SEASON
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-emerald-800 bg-emerald-50 border-emerald-300" : "text-emerald-400 bg-emerald-950/80 border-emerald-800"
                    }`}>
                      +15% Weekend
                    </span>
                  </div>
                  <div className={`font-bold text-sm sm:text-base mt-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>ธ.ค. 2026 // วันหยุด</div>
                  <div className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>ศุกร์ – เสาร์ (Weekend Night)</div>

                  <div className="my-3">
                    <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      {formatPrice(1273)} <span className="text-sm font-normal text-slate-500">THB</span>
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>รวมภาษีและบริการ (Gross Inclusive)</div>
                  </div>
                </div>

                <div className={`pt-3 border-t space-y-1.5 text-xs font-sans ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>ฐานราคา P3:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{formatPrice(963)} THB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>ดีมานด์วันหยุด:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>ADR +16.7%</span>
                  </div>
                  <div className={`font-bold text-[11px] pt-1 border-t ${isLight ? "text-emerald-700 border-slate-200" : "text-emerald-400 border-slate-800"}`}>
                    ✓ ได้รับส่วนเพิ่มวันหยุดเต็มเพดาน +15% ของ High Season
                  </div>
                </div>
              </div>

              {/* Card 3: Xmas Peak */}
              <div className={`border-2 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                isLight 
                  ? "bg-white border-purple-300 hover:border-purple-500 shadow-xs text-slate-800" 
                  : "bg-[#0B0F1A] border-purple-800/80 hover:border-purple-400 text-slate-200"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-purple-800 bg-purple-50 border-purple-300" : "text-purple-300 bg-purple-950 border-purple-700"
                    }`}>
                      PEAK FESTIVAL
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-purple-800 bg-purple-50 border-purple-300" : "text-purple-400 bg-purple-950 border-purple-800"
                    }`}>
                      +40% + Surge
                    </span>
                  </div>
                  <div className={`font-bold text-sm sm:text-base mt-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>คริสต์มาส–ปีใหม่</div>
                  <div className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>24 ธ.ค. – 1 ม.ค. (9 คืนเทศกาล)</div>

                  <div className="my-3">
                    <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${isLight ? "text-purple-700" : "text-purple-300"}`}>
                      {formatPrice(1483)} <span className="text-sm font-normal text-slate-500">THB</span>
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>รวมภาษีและบริการ (Gross Inclusive)</div>
                  </div>
                </div>

                <div className={`pt-3 border-t space-y-1.5 text-xs font-sans ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>เทศกาลพิเศษ P2:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-purple-800" : "text-purple-300"}`}>+40% Uplift</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>คู่แข่งห้องเต็ม:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-purple-800" : "text-purple-300"}`}>3/5 แห่ง (+10% Surge)</span>
                  </div>
                  <div className={`font-bold text-[11px] pt-1 border-t ${isLight ? "text-purple-700 border-slate-200" : "text-purple-300 border-slate-800"}`}>
                    ✓ ปรับขึ้นสูงสุดเพื่อดึง Revenue ช่วง High Demand
                  </div>
                </div>
              </div>

              {/* Card 4: Sep 2027 Low Season */}
              <div className={`border-2 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                isLight 
                  ? "bg-white border-sky-300 hover:border-sky-500 shadow-xs text-slate-800" 
                  : "bg-[#0B0F1A] border-blue-900/60 hover:border-blue-400 text-slate-200"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-sky-800 bg-sky-50 border-sky-300" : "text-blue-400 bg-blue-950/80 border-blue-800"
                    }`}>
                      LOW SEASON
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isLight ? "text-rose-800 bg-rose-50 border-rose-300" : "text-rose-400 bg-rose-950 border-rose-800"
                    }`}>
                      Floor: {formatPrice(750)}
                    </span>
                  </div>
                  <div className={`font-bold text-sm sm:text-base mt-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>ก.ย. 2027 // Low Season</div>
                  <div className={`text-xs font-sans ${isLight ? "text-slate-500" : "text-slate-400"}`}>วันธรรมดา & วันหยุด</div>

                  <div className="my-3">
                    <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${isLight ? "text-sky-700" : "text-blue-400"}`}>
                      {formatPrice(828)} / {formatPrice(869)} <span className="text-xs font-normal text-slate-500">THB</span>
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>วันธรรมดา {formatPrice(828)} | วันหยุด {formatPrice(869)}</div>
                  </div>
                </div>

                <div className={`pt-3 border-t space-y-1.5 text-xs font-sans ${isLight ? "border-slate-200 text-slate-600" : "border-[#1E293B] text-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>ฐานราคา P3:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{formatPrice(974)} THB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-slate-400"}>คู่แข่ง Median:</span>
                    <span className={`font-mono font-bold ${isLight ? "text-sky-800" : "text-blue-300"}`}>{formatPrice(920)} THB</span>
                  </div>
                  <div className={`font-bold text-[11px] pt-1 border-t ${isLight ? "text-sky-700 border-slate-200" : "text-blue-300 border-slate-800"}`}>
                    ✓ ปรับลดราคาลงสู้คู่แข่ง โดยไม่หลุดกรอบ Floor 750.00 THB
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION B: BONUS QUESTION 6 (CLEAR 2-COLUMN COMPARISON) */}
          <div className="space-y-3 pt-2">
            <div className={`flex items-center space-x-2 font-bold text-sm sm:text-base ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              <AlertTriangle className={`w-5 h-5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
              <span>QUESTION 6 (BONUS): สรุป 2 ข้อขัดแย้งของกฎในข้อมูลจริง & วิธีแก้ปัญหา</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Clash 1 Card */}
              <div className={`border rounded-xl p-5 space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-xs text-slate-800" : "bg-[#0B0F1A] border-[#1E293B] text-slate-200"
              }`}>
                <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                  <span className={`font-bold text-sm ${isLight ? "text-rose-700" : "text-rose-400"}`}>
                    ข้อขัดแย้งที่ 1: ปัญหาฐานคำนวณ Occupancy
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
                    isLight ? "text-rose-800 bg-rose-50 border-rose-300" : "text-rose-400 bg-rose-950 border-rose-800"
                  }`}>
                    CRITICAL BUG
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm font-sans">
                  <div className={`leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    <strong className={`font-mono ${isLight ? "text-slate-900" : "text-slate-100"}`}>ปัญหา:</strong> กฎ P1 กำหนดว่า High Season ต้องมี Occupancy ≥ 75% แต่ข้อมูล A1 มี<strong>เฉพาะยอดจอง OTA</strong> (ไม่รวม Direct/Walk-in) ทำให้เดือนที่ขายดีที่สุดในรอบ 2 ปี (ม.ค. 2026) มียอดจอง OTA เพียง <strong>41.5%</strong>
                  </div>

                  <div className={`p-2.5 rounded border text-xs ${
                    isLight ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-rose-950/30 border-rose-900/60 text-rose-300"
                  }`}>
                    ⚠️ <strong>ผลกระทบ:</strong> หากคำนวณตรงๆ ระบบจะตีความว่าทุกเดือนเป็น &quot;Low Season&quot; ทั้งหมด และสั่งตัดราคาตลอดทั้งปี!
                  </div>

                  <div className={`p-3 rounded border text-xs sm:text-sm ${
                    isLight ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  }`}>
                    ✅ <strong>ทางแก้ของเรา:</strong> คำนวณตัวคูณชดเชยสัดส่วนช่องทาง OTA (<span className="font-mono font-bold">k_OTA ≈ 2.2</span>) หรือใช้การจัดกลุ่มแบบ Relative Percentile เพื่อระบุ High Season ได้อย่างถูกต้อง
                  </div>
                </div>
              </div>

              {/* Clash 2 Card */}
              <div className={`border rounded-xl p-5 space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-xs text-slate-800" : "bg-[#0B0F1A] border-[#1E293B] text-slate-200"
              }`}>
                <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>
                  <span className={`font-bold text-sm ${isLight ? "text-amber-800" : "text-rose-400"}`}>
                    ข้อขัดแย้งที่ 2: ปัญหาราคา Low Season แพงกว่า Shoulder
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
                    isLight ? "text-amber-800 bg-amber-50 border-amber-300" : "text-amber-400 bg-amber-950 border-amber-800"
                  }`}>
                    PRICE INVERSION
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm font-sans">
                  <div className={`leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    <strong className={`font-mono ${isLight ? "text-slate-900" : "text-slate-100"}`}>ปัญหา:</strong> สถิติข้อมูล 2 ปี พบว่าค่ามัธยฐาน Low Season (<strong>{formatPrice(974)} THB</strong>) สูงกว่า Shoulder Season (<strong>{formatPrice(930)} THB</strong>) เพราะในอดีตเดือน ต.ค.–พ.ย. มีการทำ Flash Sale ลดราคาอย่างหนัก
                  </div>

                  <div className={`p-2.5 rounded border text-xs ${
                    isLight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-950/30 border-amber-900/60 text-amber-300"
                  }`}>
                    ⚠️ <strong>ผลกระทบ:</strong> แขกช่วง Low Season จะได้ราคาตั้งต้นที่แพงกว่า Shoulder ซึ่งผิดหลัก Revenue Management
                  </div>

                  <div className={`p-3 rounded border text-xs sm:text-sm ${
                    isLight ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  }`}>
                    ✅ <strong>ทางแก้ของเรา:</strong> บังคับใช้ <span className="font-mono font-bold">Monotonic Seasonal Clamp</span> เพื่อการันตีว่าราคาเรียงลำดับ <span className="font-mono font-bold">Low ≤ Shoulder ≤ High</span> เสมอ
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED TECHNICAL AUDIT & ARITHMETIC PROOFS                       */}
      {/* ========================================================================= */}
      {activeTab === "detailed" && (
        <div className="space-y-6">

          {/* SECTION 1: QUESTION 5 ANSWER TABLE & TRACE */}
          <div className={`border rounded-lg p-4 sm:p-5 ${
            isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0B0F1A] border-[#1E293B]"
          }`}>
            <div className={`flex items-center space-x-2 pb-2.5 border-b mb-3 ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-100"}`}>
              <Terminal className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span className="font-bold text-xs sm:text-sm">
                [หมวดที่ 1] // ตารางคำนวณราคาเสนอแนะอย่างเป็นทางการ (ห้อง Deluxe Room Twin Bed)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse border text-xs sm:text-sm min-w-[700px] ${
                isLight ? "border-slate-200" : "border-[#1E293B]"
              }`}>
                <thead>
                  <tr className={`border-b uppercase text-xs ${
                    isLight ? "bg-slate-100 border-slate-200 text-slate-700 font-bold" : "bg-[#070A12] border-[#1E293B] text-slate-400"
                  }`}>
                    <th className={`p-2.5 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ช่วงเวลา (Period)</th>
                    <th className={`p-2.5 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ฤดูกาล (Season)</th>
                    <th className={`p-2.5 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ฐานราคา P3</th>
                    <th className={`p-2.5 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ส่วนเพิ่ม P4/P2</th>
                    <th className={`p-2.5 border-r ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>เกณฑ์คู่แข่ง P5</th>
                    <th className={`p-2.5 border-r text-right ${isLight ? "border-slate-200" : "border-[#1E293B]"}`}>ราคาเสนอแนะสุทธิ</th>
                    <th className="p-2.5 text-right">เพดานขั้นต่ำ P7</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-[#151D2C]"}`}>
                  <tr className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>DEC_2026 (WEEKDAY)</td>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-amber-700" : "border-[#1E293B] text-amber-400"}`}>HIGH</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{formatPrice(963)} THB</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-500" : "border-[#1E293B] text-slate-400"}`}>0% (STANDARD)</td>
                    <td className={`p-2.5 border-r ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>Target index 100-110 vs {formatPrice(1550)} comp median (+15% clamp)</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-emerald-700" : "border-[#1E293B] text-emerald-400"}`}>{formatPrice(1107)} THB</td>
                    <td className={`p-2.5 text-right ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatPrice(850)} THB</td>
                  </tr>
                  <tr className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>DEC_2026 (WEEKEND)</td>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-amber-700" : "border-[#1E293B] text-amber-400"}`}>HIGH</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{formatPrice(963)} THB</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-amber-700" : "border-[#1E293B] text-amber-400"}`}>+15% (P4 CAP)</td>
                    <td className={`p-2.5 border-r ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>Indexed against weekend competitor median</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-emerald-700" : "border-[#1E293B] text-emerald-400"}`}>{formatPrice(1273)} THB</td>
                    <td className={`p-2.5 text-right ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatPrice(850)} THB</td>
                  </tr>
                  <tr className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>24 DEC - 1 JAN (PEAK)</td>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-purple-700" : "border-[#1E293B] text-purple-400"}`}>SPECIAL</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{formatPrice(963)} THB</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-purple-700" : "border-[#1E293B] text-purple-400"}`}>+40% (XMAS P2)</td>
                    <td className={`p-2.5 border-r ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>+10% Surge (≥3 competitors sold out)</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-purple-700" : "border-[#1E293B] text-purple-400"}`}>{formatPrice(1483)} THB</td>
                    <td className={`p-2.5 text-right ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatPrice(850)} THB</td>
                  </tr>
                  <tr className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>SEP_2027 (WEEKDAY)</td>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-sky-700" : "border-[#1E293B] text-blue-400"}`}>LOW</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{formatPrice(974)} THB</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-500" : "border-[#1E293B] text-slate-400"}`}>0% (STANDARD)</td>
                    <td className={`p-2.5 border-r ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>Target index 90-95 vs {formatPrice(920)} comp median (-15% clamp)</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-sky-700" : "border-[#1E293B] text-blue-400"}`}>{formatPrice(828)} THB</td>
                    <td className={`p-2.5 text-right ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatPrice(750)} THB</td>
                  </tr>
                  <tr className={isLight ? "hover:bg-slate-50" : "hover:bg-[#101726]"}>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-slate-900" : "border-[#1E293B] text-slate-200"}`}>SEP_2027 (WEEKEND)</td>
                    <td className={`p-2.5 border-r font-bold ${isLight ? "border-slate-200 text-sky-700" : "border-[#1E293B] text-blue-400"}`}>LOW</td>
                    <td className={`p-2.5 border-r text-right ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>{formatPrice(974)} THB</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-sky-700" : "border-[#1E293B] text-blue-400"}`}>+5% (P4 CAP)</td>
                    <td className={`p-2.5 border-r ${isLight ? "border-slate-200 text-slate-700" : "border-[#1E293B] text-slate-300"}`}>Indexed against Low season weekend median</td>
                    <td className={`p-2.5 border-r text-right font-bold ${isLight ? "border-slate-200 text-sky-700" : "border-[#1E293B] text-blue-400"}`}>{formatPrice(869)} THB</td>
                    <td className={`p-2.5 text-right ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatPrice(750)} THB</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Step-by-step arithmetic proof box */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className={`p-4 rounded-lg border space-y-2 ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-300"
              }`}>
                <div className={`font-bold text-xs uppercase tracking-wider ${isLight ? "text-amber-800" : "text-amber-400"}`}>[การพิสูจน์สมการคณิตศาสตร์: ธันวาคม 2026]:</div>
                <div>• P0: คัดกรองยอดจอง 16,372 รายการ; แยกห้องพักพื้นฐาน (Deluxe Twin)</div>
                <div>• P3: ฐานราคา = (978.6 × 0.60) + (940.0 × 0.40) = <strong>{formatPrice(963)} THB</strong>.</div>
                <div>• P4: วันธรรมดา 0%; วันหยุดสุดสัปดาห์ไม่เกิน +15% = <strong>{formatPrice(1107)} THB</strong>.</div>
                <div>• P5: ค่ามัธยฐาน High Season = {formatPrice(1550)} THB ปรับขึ้นไม่เกิน +15% clamp สู่เป้าหมาย = <strong>{formatPrice(1107)} THB</strong>.</div>
                <div>• P7/P8: {formatPrice(1107)} THB &gt; Floor ({formatPrice(850)} THB) → ผ่านเกณฑ์สมบูรณ์</div>
              </div>

              <div className={`p-4 rounded-lg border space-y-2 ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#070A12] border-[#1E293B] text-slate-300"
              }`}>
                <div className={`font-bold text-xs uppercase tracking-wider ${isLight ? "text-sky-800" : "text-blue-400"}`}>[การพิสูจน์สมการคณิตศาสตร์: กันยายน 2027]:</div>
                <div>• P0: ปรับมาตรฐานคืนพักเฉพาะค่าห้องสำหรับเดือนกันยายน</div>
                <div>• P3: ฐานราคา = (935.9 × 0.60) + (1030.6 × 0.40) = <strong>{formatPrice(974)} THB</strong>.</div>
                <div>• P4: วันธรรมดา 0%; วันหยุดสุดสัปดาห์ไม่เกิน +5% = <strong>{formatPrice(1023)} THB</strong>.</div>
                <div>• P5: ค่ามัธยฐาน Low Season = {formatPrice(920)} THB ปรับลดลงตาม clamp -15% สู่เป้าหมาย = <strong>{formatPrice(828)} THB</strong> (วันธรรมดา) และ <strong>{formatPrice(869)} THB</strong> (วันหยุด)</div>
                <div>• P7/P8: {formatPrice(828)} THB &gt; Floor ({formatPrice(750)} THB) และ &gt; จุดบล็อกเด็ดขาด ({formatPrice(638)} THB) → ผ่านเกณฑ์สมบูรณ์</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: BONUS QUESTION 6 ANSWER */}
          <div className={`border rounded-lg p-4 sm:p-5 space-y-4 ${
            isLight ? "bg-white border-amber-300 shadow-xs" : "bg-[#0B0F1A] border-amber-900/60"
          }`}>
            <div className={`flex items-center space-x-2 pb-2.5 border-b text-xs sm:text-sm font-bold ${
              isLight ? "border-slate-200 text-amber-800" : "border-[#1E293B] text-amber-300"
            }`}>
              <AlertTriangle className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
              <span>[หมวดที่ 2] // ข้อ 6 พิเศษ: ข้อขัดแย้งในข้อมูลจริงเชิงประจักษ์และแนวทางแก้ไข</span>
            </div>

            {/* Clash 1 */}
            <div className={`p-4 rounded-lg border space-y-2.5 text-xs sm:text-sm ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
            }`}>
              <div className={`font-bold ${isLight ? "text-rose-700" : "text-rose-400"}`}>[CLASH_01: OCCUPANCY_DENOMINATOR_MISMATCH]:</div>
              <p className={`font-sans leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <strong>ปัญหา:</strong> กฎ P1 กำหนดสูตร Occupancy = (ห้องที่ขายได้ ÷ 144 ห้อง) × 100 โดยระบุว่า High Season ต้องได้ ≥ 75% อย่างไรก็ตาม ข้อมูลจริงใน A1 เป็นยอดจองเฉพาะ 5 ช่องทาง OTA เท่านั้น (ไม่รวม Direct, Walk-in, Tour Group) ในข้อมูล 2 ปีเต็ม <strong>ไม่มีเดือนใดเลยที่มียอดจอง OTA เกิน 41.5%</strong>
              </p>
              <div className={`p-2.5 rounded border text-xs font-mono space-y-0.5 ${
                isLight ? "bg-white border-slate-200 text-slate-600" : "bg-[#04060A] border-[#151D2C] text-slate-400"
              }`}>
                <div>LOG: JAN_2026_OTA_STAYS = 1,854 / (144 × 31) = 41.5% (HIGHEST RECORDED)</div>
                <div>LOG: DEC_2025_OTA_STAYS = 1,050 / (144 × 31) = 23.5%</div>
                <div>IMPACT: หากคำนวณตรงๆ ทุกเดือนจะถูกระบบตีความเป็น Low Season ทั้งหมด!</div>
              </div>
              <div className={`font-sans ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                <strong>MITIGATION_PROPOSAL:</strong> ใช้ตัวคูณปรับสัดส่วน OTA Share (k_OTA ≈ 2.2) หรือใช้การคำนวณแบบ Relative Percentile เทียบกับเดือนที่ดีที่สุดในรอบปี
              </div>
            </div>

            {/* Clash 2 */}
            <div className={`p-4 rounded-lg border space-y-2.5 text-xs sm:text-sm ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
            }`}>
              <div className={`font-bold ${isLight ? "text-rose-700" : "text-rose-400"}`}>[CLASH_02: SEASONAL_PRICE_INVERSION]:</div>
              <p className={`font-sans leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <strong>ปัญหา:</strong> จากการคำนวณข้อมูลจริง พบว่าค่า Median ของ Low Season ({formatPrice(974)} THB) กลับสูงกว่า Shoulder Season ({formatPrice(930)} THB) เนื่องจากในอดีตเดือน ต.ค. และ พ.ย. ทางโรงแรมมีการทำ Flash Sale ลดราคาอย่างหนักจนกดค่า Median ลง
              </p>
              <div className={`p-2.5 rounded border text-xs font-mono space-y-0.5 ${
                isLight ? "bg-white border-slate-200 text-slate-600" : "bg-[#04060A] border-[#151D2C] text-slate-400"
              }`}>
                <div>LOG: P3_BASE_LOW = {formatPrice(974)} THB &gt; P3_BASE_SHOULDER = {formatPrice(930)} THB</div>
                <div>IMPACT: ลูกค้าที่จองช่วง Low Season จะได้ราคาตั้งต้นที่แพงกว่า Shoulder ซึ่งผิดหลัก Revenue Management</div>
              </div>
              <div className={`font-sans ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                <strong>MITIGATION_PROPOSAL:</strong> บังคับใช้ Monotonic Seasonal Constraint: P3(Low) ≤ P3(Shoulder) ≤ P3(High) หากพบการกลับหัวของราคา ระบบจะ Clamping P3(Low) = min(P3(Low), P3(Shoulder) × 0.95) อัตโนมัติ
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
