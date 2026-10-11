import { NextRequest, NextResponse } from "next/server";
import { calculateRatesForDate, validatePriceOverride } from "@/lib/playbookEngine";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { tier, newPrice, dateStr, currentTierRates } = body;

    // Validate tier (must be integer 1 to 8)
    const tierNum = Number(tier);
    if (!Number.isInteger(tierNum) || tierNum < 1 || tierNum > 8) {
      return NextResponse.json(
        { error: "Invalid tier. Must be an integer between 1 and 8." },
        { status: 400 }
      );
    }

    // Validate newPrice (must be positive finite number)
    const priceNum = Number(newPrice);
    if (typeof priceNum !== "number" || isNaN(priceNum) || !isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: "Invalid newPrice. Must be a positive finite numeric value." },
        { status: 400 }
      );
    }

    // Validate dateStr
    if (typeof dateStr !== "string" || !DATE_REGEX.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid dateStr format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Validate currentTierRates (must be array of 8 positive finite numbers)
    if (
      !Array.isArray(currentTierRates) ||
      currentTierRates.length !== 8 ||
      !currentTierRates.every((rate: unknown) => typeof rate === "number" && Number.isFinite(rate) && rate > 0)
    ) {
      return NextResponse.json(
        { error: "Invalid currentTierRates. Expected an array of 8 positive finite numeric tier rates." },
        { status: 400 }
      );
    }

    const calculationResult = calculateRatesForDate(dateStr);
    const validation = validatePriceOverride(tierNum, priceNum, calculationResult, currentTierRates.map(Number));

    return NextResponse.json(validation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Malformed request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
