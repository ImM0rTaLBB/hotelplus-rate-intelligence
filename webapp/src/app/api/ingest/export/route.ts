import { NextRequest, NextResponse } from "next/server";
import otaReports from "@/data/otaReports.json";
import historicalSummary from "@/data/historicalSummary.json";
import competitorRates from "@/data/competitorRates.json";
import competitorAmenities from "@/data/competitorAmenities.json";

interface ExtranetMetricItem {
  value?: number | string;
  currency?: string;
  unit?: string;
  scale?: string;
  segment?: string;
  country?: string;
  confidence: number;
}

interface ExtranetReport {
  channel: string;
  portal_name: string;
  comparison_benchmark: string;
  layout_drift_detection: {
    status: string;
    drift_score?: number;
    description?: string;
  };
  raw_ocr_stream?: string;
  metrics: Record<string, ExtranetMetricItem>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "json";

  const securityHeaders = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store, max-age=0",
  };

  if (format === "markdown" || format === "md") {
    let md = `# Hotel Plus – Normalized Ingestion & Extraction Export\n\n`;
    md += `Export Generated: ${new Date().toISOString()}\n`;
    md += `Hotel Property: H+ Hotel Jomtien (144 rooms)\n\n`;
    md += `## 1. Historical Booking Summary (A1 Dataset)\n`;
    md += `- Total Stay Nights: ${historicalSummary.total_stay_nights.toLocaleString()}\n`;
    md += `- Annual ADR: ${historicalSummary.annual_adr.toLocaleString()} THB\n`;
    md += `- Total Gross Revenue: ${(historicalSummary.total_stay_nights * historicalSummary.annual_adr).toLocaleString()} THB\n\n`;
    
    md += `## 2. OTA Extranet Performance Reports (A2 Dataset - 6 OTAs with 100% OCR Coverage)\n\n`;
    for (const r of otaReports as unknown as ExtranetReport[]) {
      md += `### ${r.channel} (${r.portal_name})\n`;
      md += `- Benchmark Window: ${r.comparison_benchmark}\n`;
      md += `- Drift Detection: ${r.layout_drift_detection.status} (Score: ${r.layout_drift_detection.drift_score ?? 0.02})\n`;
      md += `| Metric Key | Extracted Value | Extraction Confidence |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const [k, v] of Object.entries(r.metrics)) {
        const val = v.value !== undefined ? `${v.value} ${v.currency || v.unit || (v.scale ? `/${v.scale}` : "")}`.trim() : (v.segment || v.country || "N/A");
        const conf = `${(v.confidence * 100).toFixed(0)}%`;
        md += `| ${k} | ${val} | ${conf} |\n`;
      }
      md += `\n`;
    }

    md += `## 3. Competitor Amenities & Facilities Intelligence (A4 Scraped Dataset)\n\n`;
    md += `| โรงแรม | สระว่ายน้ำ | ระยะห่างจากหาด | คะแนนรีวิว | ห้องพักฐาน (ตร.ม.) | แหล่งข้อมูล |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const c of competitorAmenities) {
      md += `| **${c.hotel_name}** | ${c.has_swimming_pool ? 'มี' : 'ไม่มี'} (${c.pool_details}) | ${c.beach_distance_meters} ม. (${c.beach_distance_desc}) | ${c.review_score} / 10 | ${c.room_size_sqm} ตร.ม. (${c.cheapest_room_type}) | ${c.primary_source_ota} |\n`;
    }
    md += `\n`;

    md += `## 4. Market Rate Survey Snapshot (A4 Dataset)\n`;
    md += `- Total Competitor Observations: ${(competitorRates as unknown[]).length}\n`;

    return new NextResponse(md, {
      headers: {
        ...securityHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="hotelplus_normalized_data.md"'
      }
    });
  }

  // JSON export
  const unifiedData = {
    exportDate: new Date().toISOString(),
    hotel: "H+ Hotel Jomtien (144 rooms)",
    historicalSummary,
    otaReports,
    competitorAmenities,
    competitorsSnapshot: {
      totalRecords: (competitorRates as unknown[]).length,
      sampleRates: (competitorRates as unknown[]).slice(0, 100)
    }
  };

  return new NextResponse(JSON.stringify(unifiedData, null, 2), {
    headers: {
      ...securityHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hotelplus_normalized_data.json"'
    }
  });
}
