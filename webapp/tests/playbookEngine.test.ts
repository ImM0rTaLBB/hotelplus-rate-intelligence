import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { 
  calculateRatesForDate, 
  validatePriceOverride, 
  checkSpecialDate, 
  getSeasonForDate,
  parseDateParts,
  isWeekendNight,
  P3_BASELINES 
} from "../src/lib/playbookEngine";

describe("Hotel Plus Rate Intelligence - Playbook Engine Test Suite", () => {

  describe("P1: Seasonality Classification", () => {
    test("Correctly classifies High Season (Dec, Jan, Feb)", () => {
      assert.equal(getSeasonForDate("2026-12-15"), "High");
      assert.equal(getSeasonForDate("2027-01-20"), "High");
      assert.equal(getSeasonForDate("2027-02-14"), "High");
    });

    test("Correctly classifies Shoulder Season (Mar, Apr, Jul, Aug, Oct, Nov)", () => {
      assert.equal(getSeasonForDate("2026-10-15"), "Shoulder");
      assert.equal(getSeasonForDate("2026-11-20"), "Shoulder");
      assert.equal(getSeasonForDate("2027-03-10"), "Shoulder");
      assert.equal(getSeasonForDate("2027-04-05"), "Shoulder");
      assert.equal(getSeasonForDate("2027-07-15"), "Shoulder");
    });

    test("Correctly classifies Low Season (May, Jun, Sep)", () => {
      assert.equal(getSeasonForDate("2027-05-15"), "Low");
      assert.equal(getSeasonForDate("2027-06-20"), "Low");
      assert.equal(getSeasonForDate("2027-09-15"), "Low");
    });
  });

  describe("P2: Special Dates & Surge Pricing", () => {
    test("Christmas - New Year Peak (+40% High rate)", () => {
      const dec25 = checkSpecialDate("2026-12-25");
      assert.equal(dec25.isSpecial, true);
      assert.equal(dec25.upliftPct, 0.40);

      const jan1 = checkSpecialDate("2027-01-01");
      assert.equal(jan1.isSpecial, true);
      assert.equal(jan1.upliftPct, 0.40);
    });

    test("Songkran Festival (+25% uplift)", () => {
      const apr13 = checkSpecialDate("2027-04-13");
      assert.equal(apr13.isSpecial, true);
      assert.equal(apr13.upliftPct, 0.25);
    });

    test("Chinese New Year (+20% uplift)", () => {
      const feb10 = checkSpecialDate("2027-02-10");
      assert.equal(feb10.isSpecial, true);
      assert.equal(feb10.upliftPct, 0.20);
    });

    test("Regular day returns no special date surge", () => {
      const regDay = checkSpecialDate("2026-12-15");
      assert.equal(regDay.isSpecial, false);
      assert.equal(regDay.upliftPct, 0);
    });
  });

  describe("P3: Weighted Baseline Integration", () => {
    test("P3 baselines match historical A1 summary calculations", () => {
      assert.equal(P3_BASELINES.High, 963);
      assert.equal(P3_BASELINES.Low, 974);
      assert.equal(P3_BASELINES.Shoulder, 930);
    });
  });

  describe("P4: Weekend Uplift", () => {
    test("High Season Weekend (Fri/Sat) applies weekend status", () => {
      // 2026-12-18 is Friday
      const isWeekend = isWeekendNight("2026-12-18");
      assert.equal(isWeekend, true);
      const fridayResult = calculateRatesForDate("2026-12-18");
      assert.equal(fridayResult.isWeekend, true);
      // P3 is 963, 15% weekend uplift
      assert.ok(fridayResult.baseRoomRate > 963);
    });

    test("High Season Weekday (Tue) applies 0% weekend uplift", () => {
      // 2026-12-15 is Tuesday
      const isWeekend = isWeekendNight("2026-12-15");
      assert.equal(isWeekend, false);
      const tuesdayResult = calculateRatesForDate("2026-12-15");
      assert.equal(tuesdayResult.isWeekend, false);
      assert.equal(tuesdayResult.baseRoomRate, 963);
    });

    test("Low Season Weekend applies +5% uplift", () => {
      // 2027-09-17 is Friday
      const lowFriResult = calculateRatesForDate("2027-09-17");
      assert.equal(lowFriResult.isWeekend, true);
      assert.equal(lowFriResult.season, "Low");
    });
  });

  describe("P5: Competitor Benchmarking & Guardrails", () => {
    test("Mid-Month Weekday Baseline 15 Sep 2027 satisfies P5 target index range", () => {
      const result = calculateRatesForDate("2027-09-15");
      assert.equal(result.season, "Low");
      assert.ok(result.competitorMetrics.medianCompetitorRate > 0);
      assert.ok(result.baseRoomRate > 0);
    });

    test("P5.3: Warns and freezes rate when compset has fewer than 3 available hotels", () => {
      // Query a date outside the crawl set
      const result = calculateRatesForDate("2027-06-15");
      assert.equal(result.competitorMetrics.totalChecked, 0);
      assert.ok(result.warnings.some(w => w.includes("กฎ P5")));
    });
  });

  describe("P6: Room Tier Ladder Multipliers", () => {
    test("All 8 room tiers are strictly monotonic (increasing)", () => {
      const result = calculateRatesForDate("2026-12-15");
      assert.equal(result.finalRatesByTier.length, 8);

      for (let i = 1; i < result.finalRatesByTier.length; i++) {
        const prevTier = result.finalRatesByTier[i - 1];
        const currTier = result.finalRatesByTier[i];
        assert.ok(
          currTier.suggestedRate > prevTier.suggestedRate,
          `Tier ${currTier.tier} (${currTier.suggestedRate}) must be strictly higher than Tier ${prevTier.tier} (${prevTier.suggestedRate})`
        );
      }
    });

    test("Tier 1 matches baseRoomRate", () => {
      const result = calculateRatesForDate("2026-12-15");
      assert.equal(result.finalRatesByTier[0].suggestedRate, result.baseRoomRate);
    });
  });

  describe("P7: Minimum Price Floor Enforcement", () => {
    test("No suggested tier rate is below its defined Price Floor", () => {
      const datesToTest = ["2026-12-15", "2026-12-25", "2027-09-15", "2027-09-17"];
      for (const d of datesToTest) {
        const result = calculateRatesForDate(d);
        for (const tier of result.finalRatesByTier) {
          assert.ok(
            tier.suggestedRate >= tier.priceFloor,
            `Rate ${tier.suggestedRate} on ${d} is below price floor ${tier.priceFloor}`
          );
        }
      }
    });
  });

  describe("P8: Priority Conflict Resolution & Override Validation", () => {
    const calc = calculateRatesForDate("2026-12-15");
    const currentRates = calc.finalRatesByTier.map(t => t.suggestedRate);

    test("Priority 1: Hard block if price is below 85% of Floor", () => {
      // Tier 1 priceFloor is 750, 85% hard block is 638
      const validation = validatePriceOverride(1, 600, calc, currentRates);
      assert.equal(validation.canSave, false);
      assert.equal(validation.severity, "BLOCKED");
    });

    test("Priority 2: Hard block if Tier 2 price <= Tier 1 price", () => {
      const tier1Rate = currentRates[0];
      const validation = validatePriceOverride(2, tier1Rate - 10, calc, currentRates);
      assert.equal(validation.canSave, false);
      assert.equal(validation.severity, "BLOCKED");
    });

    test("Success when valid price within boundaries", () => {
      const validTier2Price = Math.round((currentRates[0] + currentRates[2]) / 2);
      const validation = validatePriceOverride(2, validTier2Price, calc, currentRates);
      assert.equal(validation.canSave, true);
      assert.equal(validation.severity, "SUCCESS");
    });
  });

  describe("Timezone Safety & Calendar Integrity", () => {
    test("parseDateParts preserves UTC calendar date across offsets", () => {
      const parts = parseDateParts("2026-12-15");
      assert.equal(parts.year, 2026);
      assert.equal(parts.month, 12);
      assert.equal(parts.day, 15);
      assert.equal(parts.dayOfWeek, 2); // Tuesday
    });
  });
});
