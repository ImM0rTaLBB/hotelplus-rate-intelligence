"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  align?: "left" | "right";
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือกรายการ",
  align = "left",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
          isLight
            ? "bg-white hover:bg-slate-50 text-slate-950 border-slate-300 shadow-2xs"
            : "bg-[#111827] hover:bg-[#1A2333] text-slate-100 border-slate-700 shadow-xs"
        } ${isOpen ? (isLight ? "ring-2 ring-sky-500/20 border-sky-500" : "ring-2 ring-sky-400/20 border-sky-400") : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2 truncate">
          {label && (
            <span className={`text-[11px] font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {label}:
            </span>
          )}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate text-slate-950 dark:text-white font-bold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
              isLight ? "bg-sky-100 text-sky-900" : "bg-sky-950 text-sky-300"
            }`}>
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-sky-600" : "text-slate-500"
          }`}
        />
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[220px] max-w-[320px] rounded-xl border shadow-xl p-1.5 transition-all animate-in fade-in-50 zoom-in-95 ${
            align === "right" ? "right-0" : "left-0"
          } ${
            isLight
              ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/50"
              : "bg-[#0F172A] border-slate-700 text-slate-100 shadow-black/80"
          }`}
          role="listbox"
        >
          <div className="max-h-72 overflow-y-auto space-y-0.5 custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? isLight
                        ? "bg-sky-50 text-sky-950 font-black"
                        : "bg-sky-950/60 text-sky-200 font-black"
                      : isLight
                      ? "text-slate-800 hover:bg-slate-100/80 hover:text-slate-950"
                      : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <div className="truncate">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className={`text-[10px] font-normal truncate mt-0.5 ${
                          isLight ? "text-slate-600" : "text-slate-400"
                        }`}>
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {option.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? "bg-sky-600 text-white"
                          : isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                      }`}>
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
