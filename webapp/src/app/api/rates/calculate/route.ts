import { NextRequest, NextResponse } from "next/server";
import { calculateRatesForDate } from "@/lib/playbookEngine";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year < 2020 || year > 2035) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get("date") || "2026-12-15";

  if (!isValidDate(dateStr)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD between 2020 and 2035." },
      { status: 400 }
    );
  }

  try {
    const result = calculateRatesForDate(dateStr);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal rate calculation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dateStr = (body && typeof body.date === "string" ? body.date : "") || "2026-12-15";

    if (!isValidDate(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format in request body. Expected YYYY-MM-DD between 2020 and 2035." },
        { status: 400 }
      );
    }

    const result = calculateRatesForDate(dateStr);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Malformed JSON request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
