"use client";

import React from "react";
import { Terminal, ArrowRight, X, BookOpen, ShieldCheck, Database, TrendingUp, Sparkles } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface QuickGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: "ingest" | "pricing" | "answers") => void;
}

export const QuickGuideModal: React.FC<QuickGuideProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none">
      <div className={`border rounded-xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative transition-colors ${
        isLight 
          ? "bg-white border-slate-300 text-slate-800" 
          : "bg-[#0B0F1A] border-cyan-700/60 text-slate-100"
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-md transition-colors ${
            isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          aria-label="Close Guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className={`flex items-center space-x-2.5 mb-1 ${isLight ? "text-sky-700" : "text-cyan-400"}`}>
          <BookOpen className="w-5 h-5" />
          <span className={`font-bold text-base sm:text-lg font-mono tracking-wide ${isLight ? "text-slate-900" : "text-slate-100"}`}>
            คู่มือการใช้งานระบบเริ่มต้น (Quick Start Guide)
          </span>
        </div>
        <p className={`text-xs sm:text-sm mb-5 font-sans ${isLight ? "text-slate-600" : "text-slate-300"}`}>
          คำแนะนำขั้นตอนการใช้งานระบบ 4 ขั้นตอน:
        </p>

        {/* 4 Clean Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 font-sans">
          
          {/* Step 1 */}
          <div className={`p-4 rounded-lg space-y-2 border ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
          }`}>
            <div className="flex items-center justify-between font-mono">
              <span className={`px-2.5 py-1 rounded font-bold text-xs border ${
                isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-cyan-950 text-cyan-300 border-cyan-800"
              }`}>
                ขั้นตอนที่ 1
              </span>
              <button 
                onClick={() => { onNavigateTab("ingest"); onClose(); }}
                className={`text-xs hover:underline flex items-center space-x-1 font-bold ${
                  isLight ? "text-sky-700" : "text-cyan-400"
                }`}
              >
                <span>เปิดแท็บ [1]</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className={`font-bold text-sm flex items-center space-x-2 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
              <Database className={`w-4 h-4 shrink-0 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span>นำเข้าข้อมูล & ตรวจทาน OCR</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              ไปที่แท็บ <strong>[1] นำเข้าและตรวจสอบข้อมูล</strong> เพื่อดูภาพหน้าจอ OTA จริงจาก Booking.com, Agoda และ Expedia ท่านสามารถแก้ไขค่าตัวเลขได้ทันที และส่งออกข้อมูลเป็น JSON หรือ Markdown
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-4 rounded-lg space-y-2 border ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
          }`}>
            <div className="flex items-center justify-between font-mono">
              <span className={`px-2.5 py-1 rounded font-bold text-xs border ${
                isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-cyan-950 text-cyan-300 border-cyan-800"
              }`}>
                ขั้นตอนที่ 2
              </span>
              <button 
                onClick={() => { onNavigateTab("pricing"); onClose(); }}
                className={`text-xs hover:underline flex items-center space-x-1 font-bold ${
                  isLight ? "text-sky-700" : "text-cyan-400"
                }`}
              >
                <span>เปิดแท็บ [2]</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className={`font-bold text-sm flex items-center space-x-2 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
              <TrendingUp className={`w-4 h-4 shrink-0 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span>เลือกช่วงวันที่ & คำนวณราคา</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              ไปที่แท็บ <strong>[2] ระบบคำนวณราคาห้องพัก</strong> เลือกวันที่หรือกดปุ่มลัด Preset เช่น <code className={`px-1 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-sky-800" : "text-cyan-300 bg-slate-900"}`}>ธ.ค. 2026</code> หรือ <code className={`px-1 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-sky-800" : "text-cyan-300 bg-slate-900"}`}>ก.ย. 2027</code> ระบบจะคำนวณราคาเสนอแนะ 8 ลำดับห้องพักอัตโนมัติ
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-4 rounded-lg space-y-2 border ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
          }`}>
            <div className="flex items-center justify-between font-mono">
              <span className={`px-2.5 py-1 rounded font-bold text-xs border ${
                isLight ? "bg-sky-50 text-sky-700 border-sky-300" : "bg-cyan-950 text-cyan-300 border-cyan-800"
              }`}>
                ขั้นตอนที่ 3
              </span>
              <span className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>โต้ตอบได้</span>
            </div>
            <div className={`font-bold text-sm flex items-center space-x-2 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
              <Terminal className={`w-4 h-4 shrink-0 ${isLight ? "text-sky-600" : "text-cyan-400"}`} />
              <span>ตรวจสอบที่มาของตัวเลข (Rule Trace)</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              <strong>คลิกแถวห้องพักใดก็ได้</strong> ในตาราง 8 ลำดับห้อง แผงด้านขวาจะแสดงสมการที่มาของราคาตั้งแต่กฎ P0 ถึง P8 พร้อมตัวเลขและเหตุผลอย่างโปร่งใส
            </p>
          </div>

          {/* Step 4 */}
          <div className={`p-4 rounded-lg space-y-2 border ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#070A12] border-[#1E293B]"
          }`}>
            <div className="flex items-center justify-between font-mono">
              <span className={`px-2.5 py-1 rounded font-bold text-xs border ${
                isLight ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-cyan-950 text-cyan-300 border-cyan-800"
              }`}>
                ขั้นตอนที่ 4
              </span>
              <span className={`text-xs font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>การตรวจสอบ</span>
            </div>
            <div className={`font-bold text-sm flex items-center space-x-2 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
              <ShieldCheck className={`w-4 h-4 shrink-0 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
              <span>ทดสอบแก้ราคา & การบล็อกของระบบ</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              กดปุ่ม <code className={`px-1 py-0.5 rounded font-mono ${isLight ? "bg-slate-200 text-sky-800" : "text-cyan-300 bg-slate-900"}`}>ปรับราคา</code> ที่ห้องพักเพื่อปรับราคา:
              <br />• หากต่ำกว่า 85% ของ Floor → <strong className={isLight ? "text-rose-700" : "text-rose-400"}>ระบบบล็อกและไม่อนุญาตให้บันทึก</strong>
              <br />• หากต่ำกว่า Floor ปกติ → <strong className={isLight ? "text-amber-700" : "text-amber-400"}>ระบบแจ้งเตือนและบังคับระบุเหตุผล</strong>
            </p>
          </div>

        </div>

        {/* Footer Jump */}
        <div className={`mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 font-sans ${
          isLight ? "border-slate-200" : "border-[#1E293B]"
        }`}>
          <button
            onClick={() => { onNavigateTab("answers"); onClose(); }}
            className={`text-xs sm:text-sm hover:underline flex items-center space-x-1.5 font-semibold ${
              isLight ? "text-amber-800 hover:text-amber-900" : "text-amber-300 hover:text-amber-200"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <span>ดูสรุปราคาข้อ 5 และประเด็นข้อ 6</span>
          </button>

          <button
            onClick={onClose}
            className={`w-full sm:w-auto px-5 py-2 rounded-md font-bold text-xs sm:text-sm font-mono transition-colors shadow-xs ${
              isLight ? "bg-sky-600 hover:bg-sky-700 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
            }`}
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
