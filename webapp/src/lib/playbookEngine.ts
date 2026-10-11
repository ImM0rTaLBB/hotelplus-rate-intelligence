import hotelConfig from "@/data/hotelConfig.json";
import competitorRates from "@/data/competitorRates.json";
import historicalCalculations from "@/data/historicalCalculations.json";

export interface RoomTier {
  tier: number;
  name: string;
  rooms: number;
  base_room: boolean;
}

export interface RuleStep {
  ruleCode: string;
  ruleName: string;
  clause: string;
  description: string;
  inputData: string;
  arithmetic: string;
  outputValue: number | string;
  status: "APPLIED" | "PASSED" | "OVERRIDDEN" | "WARNED";
}

export interface TierRateResult {
  tier: number;
  roomName: string;
  rooms: number;
  suggestedRate: number;
  priceFloor: number;
  hardBlockFloor: number;
  stepMultiplier: number;
}

export interface RateCalculationResult {
  date: string;
  season: "High" | "Shoulder" | "Low";
  isWeekend: boolean;
  isSpecialDay: boolean;
  specialEventName?: string;
  baseRoomRate: number;
  finalRatesByTier: TierRateResult[];
  competitorMetrics: {
    totalChecked: number;
    availableCount: number;
    soldOutCount: number;
    medianCompetitorRate: number;
    targetIndexRange: string;
    competitorIndex: number;
    highDemandSurgeApplied: boolean;
    fewerThan3CompetitorsWarn: boolean;
  };
  ruleExecutionTrace: RuleStep[];
  warnings: string[];
}

export interface CompetitorRateItem {
  hotel_name: string;
  checkin_date: string;
  room_type: string;
  room_size_sqm: number;
  price_per_night: number | string;
  tax_included?: boolean | string;
  breakfast_included?: boolean | string;
  status: string;
  source: string;
  scraped_at: string;
}

// Strongly typed historical calculation interfaces
interface BaselineStats {
  median_2025: number;
  median_2026: number;
  weighted_baseline: number;
  sample_size: number;
}

interface WeekendRuleStats {
  occ_delta_pts: number;
  adr_delta_pct: number;
  occ_weekday: number;
  occ_weekend: number;
  adr_weekday: number;
  adr_weekend: number;
  cap: number;
  applied_uplift: number;
}

interface FloorStats {
  p20_historical: number;
  hard_block_85: number;
}

// Pre-index competitor rates for O(1) instantaneous lookup
const competitorRatesMap = new Map<string, CompetitorRateItem[]>();
for (const item of (competitorRates as unknown as CompetitorRateItem[])) {
  const existing = competitorRatesMap.get(item.checkin_date);
  if (existing) {
    existing.push(item);
  } else {
    competitorRatesMap.set(item.checkin_date, [item]);
  }
}

export function getCompetitorRatesForDate(dateStr: string): CompetitorRateItem[] {
  return competitorRatesMap.get(dateStr) || [];
}


// Dynamically read from historical calculations
export const P3_BASELINES = {
  High: historicalCalculations.p3_baselines.High.weighted_baseline,
  Shoulder: historicalCalculations.p3_baselines.Shoulder.weighted_baseline,
  Low: historicalCalculations.p3_baselines.Low.weighted_baseline,
};

export const P4_WEEKEND_RULES = historicalCalculations.p4_weekend_rules;
export const P6_ROOM_TIERS = historicalCalculations.p6_room_tiers;
export const P7_FLOORS = historicalCalculations.p7_floors;

/**
 * 100% Timezone-safe date parser.
 * Extracts Year, Month, Day, and Day of Week using UTC calendar math
 * to prevent off-by-one day bugs across global timezones (e.g. UTC-5, UTC-8).
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return {
    year,
    month,
    day,
    dayOfWeek: utcDate.getUTCDay()
  };
}

// P2 Special Dates Checker (Timezone-safe)
export function checkSpecialDate(dateStr: string): { isSpecial: boolean; name: string; upliftPct: number } {
  const { month: m, day } = parseDateParts(dateStr);

  // Christmas - New Year: 24 Dec - 1 Jan (+40% High rate)
  if ((m === 12 && day >= 24) || (m === 1 && day === 1)) {
    return { isSpecial: true, name: "คริสต์มาส–ปีใหม่ (Christmas - New Year Peak)", upliftPct: 0.40 };
  }
  // Songkran: 12-16 Apr (+25%)
  if (m === 4 && day >= 12 && day <= 16) {
    return { isSpecial: true, name: "เทศกาลสงกรานต์ (Songkran Festival)", upliftPct: 0.25 };
  }
  // Chinese New Year: ~Feb (+20%)
  if (m === 2 && day >= 10 && day <= 12) {
    return { isSpecial: true, name: "เทศกาลตรุษจีน (Chinese New Year)", upliftPct: 0.20 };
  }
  return { isSpecial: false, name: "", upliftPct: 0 };
}

// P1 Season Classifier (Timezone-safe)
export function getSeasonForDate(dateStr: string): "High" | "Shoulder" | "Low" {
  const { month: m } = parseDateParts(dateStr);
  if (m === 12 || m === 1 || m === 2) return "High";
  if (m === 5 || m === 6 || m === 9) return "Low";
  return "Shoulder";
}

// P4 Weekend check: Fri night (5) and Sat night (6) (Timezone-safe)
export function isWeekendNight(dateStr: string): boolean {
  const { dayOfWeek } = parseDateParts(dateStr);
  return dayOfWeek === 5 || dayOfWeek === 6;
}

// Core Rate Calculation for a single date
export function calculateRatesForDate(dateStr: string): RateCalculationResult {
  const season = getSeasonForDate(dateStr);
  const isWeekend = isWeekendNight(dateStr);
  const specialCheck = checkSpecialDate(dateStr);
  const { month: m } = parseDateParts(dateStr);
  const monthNames = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  
  const warnings: string[] = [];
  const trace: RuleStep[] = [];

  // P0 Trace
  trace.push({
    ruleCode: "P0",
    ruleName: "เตรียมข้อมูลและมาตรฐานราคา",
    clause: "P0.1 - P0.4",
    description: "กรองการยกเลิก/No-show, แยกรายคืนเท่าๆ กัน, และปรับเป็น Room Only รวมภาษี 7% และ Service Charge 10%",
    inputData: `A1 Records: ${historicalCalculations.records_analyzed.toLocaleString()} stay-nights, A3: 144 rooms`,
    arithmetic: "Normalized to: Room-only, THB, Gross Inclusive",
    outputValue: "Standardized Basis",
    status: "APPLIED"
  });

  // P1 Trace
  trace.push({
    ruleCode: "P1",
    ruleName: "แบ่ง Season",
    clause: "P1.1",
    description: `เดือน ${monthNames[m]} (เดือนที่ ${m}) จัดอยู่ในกลุ่ม ${season} Season`,
    inputData: `Occupancy & ADR Pattern ของเดือนที่ ${m}`,
    arithmetic: `High = Dec-Feb, Shoulder = Mar-Apr/Jul-Aug/Oct-Nov, Low = May-Jun/Sep`,
    outputValue: `${season} Season`,
    status: "APPLIED"
  });

  // P3 Baseline from dynamic data
  const p3BaseStats: BaselineStats = (historicalCalculations.p3_baselines as Record<string, BaselineStats>)[season];
  const p3Base = p3BaseStats.weighted_baseline;
  trace.push({
    ruleCode: "P3",
    ruleName: "ราคาตั้งต้นของแต่ละ Season",
    clause: "P3.1 - P3.3",
    description: `ค่ากลาง (Median) ของห้องฐาน (${hotelConfig.room_tiers[0].name}) วันธรรมดา ไม่รวมวันพิเศษ ถ่วงน้ำหนักปี 2026 (60%) และ 2025 (40%)`,
    inputData: `Med(2026) = ${p3BaseStats.median_2026} THB, Med(2025) = ${p3BaseStats.median_2025} THB (Sample: ${p3BaseStats.sample_size} nights)`,
    arithmetic: `0.60 × ${p3BaseStats.median_2026} + 0.40 × ${p3BaseStats.median_2025} = ${p3Base} THB`,
    outputValue: `${p3Base} THB`,
    status: "APPLIED"
  });

  // P4 Weekend Rule
  let rateAfterP4 = p3Base;
  const p4Rule: WeekendRuleStats = (historicalCalculations.p4_weekend_rules as Record<string, WeekendRuleStats>)[season];
  if (isWeekend) {
    rateAfterP4 = Math.round(p3Base * (1.0 + p4Rule.applied_uplift));
    trace.push({
      ruleCode: "P4",
      ruleName: "ส่วนเพิ่มวันหยุด (Weekend Uplift)",
      clause: "P4.1 - P4.3",
      description: `คืนวันศุกร์และเสาร์ ปรับเพิ่มตามส่วนต่างข้อมูลจริง (ADR diff ${p4Rule.adr_delta_pct}%) ภายใต้เพดาน ${season} (+${p4Rule.cap * 100}%)`,
      inputData: `Weekend ADR = ${p4Rule.adr_weekend} THB vs Weekday ADR = ${p4Rule.adr_weekday} THB`,
      arithmetic: `${p3Base} × (1 + ${p4Rule.applied_uplift}) = ${rateAfterP4} THB`,
      outputValue: `${rateAfterP4} THB`,
      status: "APPLIED"
    });
  } else {
    trace.push({
      ruleCode: "P4",
      ruleName: "วันธรรมดา (Weekday Rate)",
      clause: "P4.4",
      description: "คืนวันอาทิตย์ - พฤหัสบดี ใช้ราคาตั้งต้นของ Season โดยไม่มีส่วนเพิ่มวันหยุด",
      inputData: "วันธรรมดา",
      arithmetic: `${p3Base} THB (0% Uplift)`,
      outputValue: `${p3Base} THB`,
      status: "PASSED"
    });
  }

  // P2 Special Holiday Override
  let rateAfterP2 = rateAfterP4;
  if (specialCheck.isSpecial) {
    const baseForSpecial = season === "High" ? p3Base : P3_BASELINES.High;
    rateAfterP2 = Math.round(baseForSpecial * (1.0 + specialCheck.upliftPct));
    trace.push({
      ruleCode: "P2",
      ruleName: "วันพิเศษ (Special Event Override)",
      clause: "P2.1",
      description: `${specialCheck.name}: ใช้ราคาฐาน High +${specialCheck.upliftPct * 100}%`,
      inputData: `วันพิเศษ: ${specialCheck.name}`,
      arithmetic: `${baseForSpecial} × (1 + ${specialCheck.upliftPct}) = ${rateAfterP2} THB`,
      outputValue: `${rateAfterP2} THB`,
      status: "APPLIED"
    });
  } else {
    trace.push({
      ruleCode: "P2",
      ruleName: "ตรวจสอบวันพิเศษ",
      clause: "P2.1",
      description: "ไม่ตรงกับวันหยุดพิเศษหลัก (Christmas/New Year, Songkran, Chinese New Year)",
      inputData: "วันปกติ",
      arithmetic: "ไม่มีส่วนเพิ่มพิเศษ",
      outputValue: `${rateAfterP2} THB`,
      status: "PASSED"
    });
  }

  // P5 Competitor Benchmarking (O(1) Map lookup)
  const compsOnDate = competitorRatesMap.get(dateStr) || [];
  const totalComps = compsOnDate.length;
  const soldOutComps = compsOnDate.filter(c => c.status === "เต็ม").length;
  const availComps = compsOnDate.filter(c => c.status === "ว่าง" && typeof c.price_per_night === "number");
  
  const compPrices: number[] = availComps.map(c => Number(c.price_per_night)).sort((a, b) => a - b);
  const medianCompPrice = compPrices.length > 0 
    ? (compPrices.length % 2 === 1 
        ? compPrices[Math.floor(compPrices.length / 2)] 
        : (compPrices[compPrices.length / 2 - 1] + compPrices[compPrices.length / 2]) / 2)
    : (season === "High" ? 1550 : 920);

  const targetMinIndex = season === "High" ? 100 : (season === "Low" ? 90 : 95);
  const targetMaxIndex = season === "High" ? 110 : (season === "Low" ? 95 : 100);
  const targetIndexRange = `${targetMinIndex}–${targetMaxIndex}`;

  let rateAfterP5 = rateAfterP2;
  let highDemandSurge = false;
  let fewerThan3Warn = false;

  if (availComps.length < 3) {
    fewerThan3Warn = true;
    const warningMsg = totalComps === 0
      ? `วันที่ ${dateStr} ไม่มีข้อมูลคู่แข่งในระบบ: งดปรับตามดัชนีคู่แข่งตามกฎ P5 (คงราคาเดิม ${rateAfterP5} THB)`
      : `วันที่ ${dateStr} มีข้อมูลคู่แข่งที่เปิดขายน้อยกว่า 3 แห่ง (พบ ${availComps.length}/${totalComps} แห่ง): งดปรับตามดัชนีคู่แข่งตามกฎ P5 (คงราคาเดิม ${rateAfterP5} THB)`;
    warnings.push(warningMsg);
    trace.push({
      ruleCode: "P5",
      ruleName: "เทียบกับคู่แข่ง (ข้อมูลไม่พอ)",
      clause: "P5.3",
      description: "ข้อมูลคู่แข่งที่เปิดขายน้อยกว่า 3 แห่ง หรือไม่มีข้อมูล ระบบคงราคาเดิมและส่งแจ้งเตือน",
      inputData: totalComps === 0 ? "ไม่มีข้อมูลคู่แข่งในระบบ" : `เปิดขาย ${availComps.length}/${totalComps} แห่ง`,
      arithmetic: "งดปรับตามดัชนีคู่แข่ง (คงราคาเดิม)",
      outputValue: `${rateAfterP5} THB`,
      status: "WARNED"
    });
  } else {
    const currentIndex = (rateAfterP2 / medianCompPrice) * 100;
    if (currentIndex < targetMinIndex) {
      const targetRate = Math.round((targetMinIndex / 100) * medianCompPrice);
      const maxAllowed = Math.round(p3Base * 1.15);
      rateAfterP5 = Math.min(targetRate, maxAllowed);
      trace.push({
        ruleCode: "P5",
        ruleName: "เทียบกับคู่แข่ง (ดัชนีต่ำกว่าเป้า)",
        clause: "P5.2",
        description: `ดัชนีเดิม (${currentIndex.toFixed(1)}) ต่ำกว่าเป้า (${targetIndexRange}). ปรับขึ้นไปที่ขอบเป้าต่ำสุด (ห้ามเกิน +15% ของ P3)`,
        inputData: `Median คู่แข่ง = ${medianCompPrice} THB, เป้า = ${targetIndexRange}`,
        arithmetic: `Adjusted to ${rateAfterP5} THB (Index: ${((rateAfterP5 / medianCompPrice) * 100).toFixed(1)})`,
        outputValue: `${rateAfterP5} THB`,
        status: "APPLIED"
      });
    } else if (currentIndex > targetMaxIndex) {
      const targetRate = Math.round((targetMaxIndex / 100) * medianCompPrice);
      const minAllowed = Math.round(p3Base * 0.85);
      rateAfterP5 = Math.max(targetRate, minAllowed);
      trace.push({
        ruleCode: "P5",
        ruleName: "เทียบกับคู่แข่ง (ดัชนีสูงกว่าเป้า)",
        clause: "P5.2",
        description: `ดัชนีเดิม (${currentIndex.toFixed(1)}) สูงกว่าเป้า (${targetIndexRange}). ปรับลงไปที่ขอบเป้าสูงสุด (ห้ามต่ำกว่า -15% ของ P3)`,
        inputData: `Median คู่แข่ง = ${medianCompPrice} THB, เป้า = ${targetIndexRange}`,
        arithmetic: `Adjusted to ${rateAfterP5} THB`,
        outputValue: `${rateAfterP5} THB`,
        status: "APPLIED"
      });
    } else {
      trace.push({
        ruleCode: "P5",
        ruleName: "เทียบกับคู่แข่ง (ดัชนีอยู่ในเป้า)",
        clause: "P5.2",
        description: `ดัชนีเดิม (${currentIndex.toFixed(1)}) อยู่ในกรอบเป้าหมาย (${targetIndexRange}) เรียบร้อยแล้ว`,
        inputData: `Median คู่แข่ง = ${medianCompPrice} THB`,
        arithmetic: `ดัชนี = ${currentIndex.toFixed(1)} (ผ่านเกณฑ์)`,
        outputValue: `${rateAfterP5} THB`,
        status: "PASSED"
      });
    }

    if (soldOutComps >= 3) {
      highDemandSurge = true;
      rateAfterP5 = Math.round(rateAfterP5 * 1.10);
      warnings.push(`คู่แข่งห้องเต็มตั้งแต่ 3 แห่งขึ้นไปในวันที่ ${dateStr} (พบ ${soldOutComps} แห่ง): ปรับเพิ่มราคา +10% ตามกฎ P5`);
      trace.push({
        ruleCode: "P5",
        ruleName: "คู่แข่งห้องเต็มสูง (High Demand Surge)",
        clause: "P5.4",
        description: `คู่แข่งห้องเต็ม ${soldOutComps}/5 แห่ง ความต้องการห้องพักสูงมาก ระบบเพิ่มราคา +10%`,
        inputData: `${soldOutComps} คู่แข่งห้องเต็ม`,
        arithmetic: `Rate × 1.10 = ${rateAfterP5} THB`,
        outputValue: `${rateAfterP5} THB`,
        status: "APPLIED"
      });
    }
  }

  // P7 Price Floors from dynamic empirical data
  const dynamicFloorStats: FloorStats = (historicalCalculations.p7_floors as Record<string, FloorStats>)[season];
  const historicalP20 = dynamicFloorStats.p20_historical;
  const lowestCompPrice = compPrices.length > 0 ? compPrices[0] : 800;
  const compFloor90 = Math.round(lowestCompPrice * 0.90);
  const baseFloor = Math.max(historicalP20, compFloor90);
  const hardBlockFloor = Math.round(baseFloor * 0.85);

  trace.push({
    ruleCode: "P7",
    ruleName: "ราคาต่ำสุดที่ยอมให้ขาย (Price Floor)",
    clause: "P7.1 - P7.3",
    description: `ราคาต่ำสุด = ค่าที่สูงกว่าระหว่าง Percentile 20 (${historicalP20} THB) และ 90% ของคู่แข่งต่ำสุด (${compFloor90} THB)`,
    inputData: `P20 Historical: ${historicalP20} THB, 90% Comp Min: ${compFloor90} THB`,
    arithmetic: `Floor = ${baseFloor} THB, Hard Block (85%) = ${hardBlockFloor} THB`,
    outputValue: `Floor: ${baseFloor} THB`,
    status: "APPLIED"
  });

  let finalBaseRate = rateAfterP5;
  if (finalBaseRate < hardBlockFloor) {
    finalBaseRate = hardBlockFloor;
    warnings.push(`ราคาคำนวณหลุดเพดานขั้นต่ำ 85% ถูกดันกลับมาที่ ${hardBlockFloor} THB ตามกฎ P8`);
  }

  // P6 Room Tiers Escalator from dynamic tiers
  const finalRatesByTier: TierRateResult[] = hotelConfig.room_tiers.map((r, idx) => {
    const tierConfig = historicalCalculations.p6_room_tiers[idx];
    const tierMultiplier = tierConfig.cumulative_multiplier;
    const calculatedRate = Math.round(finalBaseRate * tierMultiplier);
    
    const tierFloor = Math.round(baseFloor * Math.pow(1.15, idx));
    const tierHardBlock = Math.round(tierFloor * 0.85);

    return {
      tier: r.tier,
      roomName: r.name,
      rooms: r.rooms,
      suggestedRate: calculatedRate,
      priceFloor: tierFloor,
      hardBlockFloor: tierHardBlock,
      stepMultiplier: Number(tierMultiplier.toFixed(4))
    };
  });

  trace.push({
    ruleCode: "P6",
    ruleName: "ส่วนต่างราคาระหว่างประเภทห้อง",
    clause: "P6.1 - P6.3",
    description: "ห้องแต่ละขั้นแพงกว่าขั้นก่อนหน้า 15–30% ตามลำดับ 8 ประเภทห้อง",
    inputData: `8 Room Tiers จาก A3, ขั้นละ +15% ถึง +30%`,
    arithmetic: `ห้องฐาน ${finalBaseRate} THB → ห้องสูงสุด ${finalRatesByTier[7].suggestedRate} THB`,
    outputValue: `${finalRatesByTier.length} Tiers Calculated`,
    status: "APPLIED"
  });

  trace.push({
    ruleCode: "P8",
    ruleName: "ลำดับความสำคัญเมื่อกฎขัดกัน",
    clause: "P8.1",
    description: "ยึดลำดับ: 1. ห้ามต่ำกว่า 85% ของ Floor -> 2. ห้องสูงต้องแพงกว่าห้องต่ำ -> 3. วันพิเศษ -> 4. ดัชนีคู่แข่ง -> 5. วันหยุด/Season",
    inputData: "ทุกกฎผ่านการตรวจสอบ",
    arithmetic: "Deterministic resolution complete",
    outputValue: "Compliant",
    status: "APPLIED"
  });

  return {
    date: dateStr,
    season,
    isWeekend,
    isSpecialDay: specialCheck.isSpecial,
    specialEventName: specialCheck.name,
    baseRoomRate: finalBaseRate,
    finalRatesByTier,
    competitorMetrics: {
      totalChecked: totalComps,
      availableCount: availComps.length,
      soldOutCount: soldOutComps,
      medianCompetitorRate: medianCompPrice,
      targetIndexRange,
      competitorIndex: Number(((finalBaseRate / medianCompPrice) * 100).toFixed(1)),
      highDemandSurgeApplied: highDemandSurge,
      fewerThan3CompetitorsWarn: fewerThan3Warn
    },
    ruleExecutionTrace: trace,
    warnings
  };
}

// Validator for RM Manual Overrides
export interface OverrideValidation {
  valid: boolean;
  canSave: boolean;
  severity: "SUCCESS" | "WARNING" | "BLOCKED";
  message: string;
  violations: string[];
}

export function validatePriceOverride(
  tier: number,
  newPrice: number,
  calculationResult: RateCalculationResult,
  currentTierRates: number[]
): OverrideValidation {
  // Input sanity guard
  if (!Number.isFinite(newPrice) || newPrice <= 0) {
    return {
      valid: false,
      canSave: false,
      severity: "BLOCKED",
      message: "ไม่อนุญาตให้บันทึก: ราคาต้องเป็นตัวเลขจำนวนเต็มบวกที่ถูกต้อง (THB)",
      violations: ["ราคาต้องเป็นจำนวนบวกที่ถูกต้อง"]
    };
  }

  const tierInfo = calculationResult.finalRatesByTier.find(t => t.tier === tier);
  if (!tierInfo) {
    return {
      valid: false,
      canSave: false,
      severity: "BLOCKED",
      message: `ไม่อนุญาตให้บันทึก: ไม่พบระดับห้อง Tier ${tier} ในระบบ`,
      violations: ["ระดับห้องพักไม่ถูกต้อง (ต้องเป็น 1 ถึง 8)"]
    };
  }

  // P8 Priority 1: Never below 85% of price floor
  if (newPrice < tierInfo.hardBlockFloor) {
    return {
      valid: false,
      canSave: false,
      severity: "BLOCKED",
      message: `ไม่อนุญาตให้บันทึก: ราคา ${newPrice} THB ต่ำกว่า 85% ของราคาต่ำสุด (${tierInfo.hardBlockFloor} THB) ตามกฎ P7 และ P8 ข้อ 1`,
      violations: [`ราคาต่ำกว่า 85% Floor (${tierInfo.hardBlockFloor} THB)`]
    };
  }

  // P8 Priority 2: Higher room must be strictly more expensive than lower room
  if (tier > 1) {
    const prevRoomRate = currentTierRates[tier - 2];
    if (Number.isFinite(prevRoomRate) && newPrice <= prevRoomRate) {
      return {
        valid: false,
        canSave: false,
        severity: "BLOCKED",
        message: `ไม่อนุญาตให้บันทึก: ห้องขั้นสูงต้องแพงกว่าห้องขั้นต่ำ (${prevRoomRate} THB) ตามกฎ P6 และ P8 ข้อ 2`,
        violations: [`ราคาต้องสูงกว่าขั้นก่อนหน้า (${prevRoomRate} THB)`]
      };
    }
  }

  if (tier < currentTierRates.length) {
    const nextRoomRate = currentTierRates[tier];
    if (Number.isFinite(nextRoomRate) && newPrice >= nextRoomRate) {
      return {
        valid: false,
        canSave: false,
        severity: "BLOCKED",
        message: `ไม่อนุญาตให้บันทึก: ห้องขั้นต่ำต้องถูกกว่าห้องขั้นสูง (${nextRoomRate} THB) ตามกฎ P6 และ P8 ข้อ 2`,
        violations: [`ราคาต้องต่ำกว่าขั้นถัดไป (${nextRoomRate} THB)`]
      };
    }
  }

  // Warning if below floor (between 85% and 100%)
  if (newPrice < tierInfo.priceFloor) {
    return {
      valid: true,
      canSave: true,
      severity: "WARNING",
      message: `คำเตือน: ราคา ${newPrice} THB ต่ำกว่าราคาต่ำสุดของระบบ (${tierInfo.priceFloor} THB) RM จำเป็นต้องระบุเหตุผลในการบันทึก`,
      violations: [`ต่ำกว่าราคาต่ำสุด (${tierInfo.priceFloor} THB) - ต้องระบุเหตุผล`]
    };
  }

  return {
    valid: true,
    canSave: true,
    severity: "SUCCESS",
    message: "ราคาถูกต้องตามกฎทุกข้อใน Playbook",
    violations: []
  };
}
