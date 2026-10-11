# Rate Intelligence Tool – System Specification (`spec.md`)

**Target Role:** Tech Lead / Senior Developer Take-Home Assessment  
**Author:** Candidate (Tech Lead)  
**Company:** Hotel Plus  
**Target Property:** H+ Property (Pattaya, 144 Rooms)  
**Version:** 2.0-Production Spec  
**Repository:** `hotelplus/rate-intelligence`  

---

## 1. บทนำและสถาปัตยกรรมระดับภาพรวม (System Architecture)

ระบบ Rate Intelligence Tool ถูกออกแบบมาเพื่อเปลี่ยนผ่านการตั้งราคาห้องพักโรงแรมจากการกรอก Google Sheet รายวันแบบเดิม (Manual Daily Pricing) ไปสู่ระบบคำนวณราคาอัตโนมัติตามฤดูกาล (Seasonal & Room-Tier Engine) โดยอิงตามกฎ **Revenue Manager Playbook (P0 ถึง P8)** อย่างเคร่งครัดและโปร่งใส

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION (PAGE 1)                         │
│  [A1 Historical Stays]     [A2 Extranet Vision]     [Competitor Set]   │
│  (16,372 Bookings)        (Agoda / Booking OCR)     (5 Jomtien Hotels) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Unified Schema
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     RATE INTELLIGENCE ENGINE (P0-P8)                   │
│  P0: Normalization  ──►  P1: Seasonality  ──►  P2: Peak/Events         │
│  P3: Weighted Base  ──►  P4: Weekend Uplift  ──►  P5: Comp Benchmarking│
│  P6: Tier Escalator ──►  P7: Price Floors  ──►  P8: Conflict Resolver  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PRICING TERMINAL (PAGE 2)                      │
│  • Dynamic Date & Season Range Selector                                │
│  • 8-Tier Room Matrix with Suggested Rates                             │
│  • Interactive Rule Trace Inspector (Drill-down Arithmetic)            │
│  • Real-time RM Manual Override with Hard-Block Rule Validation        │
│  • P8 Audit Trail Logger                                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. โครงสร้างข้อมูลหลัก (Core Data Schema)

### 2.1 Unified Room Stay Record (`RoomStayRecord`)
ใช้เก็บข้อมูลประวัติการพักรายคืนที่แปลงเป็นมาตรฐานเดียวกัน (P0):
```typescript
interface RoomStayRecord {
  stay_date: string;       // YYYY-MM-DD
  year: number;            // 2025 | 2026
  month: number;           // 1 - 12
  ota: string;             // "Agoda" | "Booking.com" | "Expedia" | "Tiket" | "Traveloka" | "Trip.com"
  room_type: string;       // 1 ใน 8 ประเภทห้องมาตรฐานจาก A3
  night_price: number;     // สกุลเงินบาท, Room Only, รวม VAT 7% & Service Charge 10%
  lead_time: number;       // StayDate - BookedDate (วัน)
  booking_id: string;      // รหัสอ้างอิง
}
```

### 2.2 Competitor Daily Observation (`CompetitorDailyRate`)
ใช้เก็บราคาห้องฐานที่ถูกที่สุดของคู่แข่งรายวัน:
```typescript
interface CompetitorDailyRate {
  hotel_name: string;      // 1 ใน 5 โรงแรมคู่แข่ง
  checkin_date: string;    // YYYY-MM-DD
  room_type: string;       // ชื่อห้องถูกที่สุด
  room_size_sqm: number;   // ขนาดห้องพัก (ตร.ม.)
  price_per_night: number | "เต็ม"; // ราคา หรือข้อความ "เต็ม"
  tax_included: boolean;
  breakfast_included: boolean;
  status: "ว่าง" | "เต็ม";
  source: string;          // Agoda | Booking.com | Trip.com | Expedia
  scraped_at: string;
}
```

### 2.3 Competitor Facilities & Amenities Record (`CompetitorAmenitiesRecord`)
ใช้เก็บข้อมูลสิ่งอำนวยความสะดวกของคู่แข่งทั้ง 5 แห่ง (A4):
```typescript
interface CompetitorAmenitiesRecord {
  id: string;
  hotel_name: string;
  star_rating: number;
  total_rooms: number;
  cheapest_room_type: string;
  room_size_sqm: number;
  has_swimming_pool: boolean;
  pool_details: string;       // เช่น Rooftop plunge pool, Outdoor pool with bar
  beach_distance_meters: number; // เช่น 20m, 30m, 150m, 500m
  beach_distance_desc: string;
  review_score: number;       // เต็ม 10.0
  total_reviews_count: number;
  primary_source_ota: string; // Agoda | Booking.com | Trip.com | Expedia
  scraped_at: string;
  facilities: string[];
}
```

### 2.4 Rate Calculation Result (`RateCalculationResult`)
ผลลัพธ์การคำนวณราคาที่ส่งต่อไปยังหน้าบ้าน:
```typescript
interface RateCalculationResult {
  date: string;
  season: "High" | "Shoulder" | "Low";
  isWeekend: boolean;
  isSpecialDay: boolean;
  specialEventName?: string;
  baseRoomRate: number;    // ราคาห้องฐานสุทธิ (THB)
  finalRatesByTier: {
    tier: number;          // 1 - 8
    roomName: string;
    rooms: number;         // จำนวนห้องคงคลัง
    suggestedRate: number; // ราคาที่ระบบเสนอแนะ
    priceFloor: number;    // ราคาต่ำสุด P7 (เตือน)
    hardBlockFloor: number;// 85% ของ Floor (ห้ามบันทึก)
    stepMultiplier: number;// ตัวคูณเทียบกับห้องฐาน
  }[];
  competitorMetrics: {
    medianCompetitorRate: number;
    competitorIndex: number;
    targetIndexRange: string;
    soldOutCount: number;  // จำนวนคู่แข่งห้องเต็ม
    highDemandSurgeApplied: boolean;
  };
  ruleExecutionTrace: RuleStep[]; // บันทึกที่มาทีละกฎ P0-P8
}
```

---

## 3. รายการ API หลัก (Core REST APIs)

### 3.1 คำนวณราคาห้องพักตามกฎ Playbook
- **Method:** `POST`
- **Path:** `/api/rates/calculate`
- **Request Body:**
```json
{
  "date": "2026-12-15"
}
```
- **Response (200 OK):**
```json
{
  "date": "2026-12-15",
  "season": "High",
  "isWeekend": false,
  "isSpecialDay": false,
  "baseRoomRate": 1107,
  "finalRatesByTier": [
    {
      "tier": 1,
      "roomName": "Deluxe Room Twin Bed",
      "rooms": 5,
      "suggestedRate": 1107,
      "priceFloor": 850,
      "hardBlockFloor": 723,
      "stepMultiplier": 1.0
    },
    {
      "tier": 2,
      "roomName": "Deluxe Room Double",
      "rooms": 53,
      "suggestedRate": 1273,
      "priceFloor": 978,
      "hardBlockFloor": 831,
      "stepMultiplier": 1.15
    }
  ],
  "competitorMetrics": {
    "medianCompetitorRate": 1550,
    "competitorIndex": 100.0,
    "targetIndexRange": "100–110",
    "soldOutCount": 0,
    "highDemandSurgeApplied": false
  }
}
```

### 3.2 ตรวจสอบการปรับราคาของ RM (Override Validator)
- **Method:** `POST`
- **Path:** `/api/rates/validate`
- **Request Body:**
```json
{
  "tier": 1,
  "newPrice": 700,
  "dateStr": "2026-12-15",
  "currentTierRates": [1107, 1273, 1464, 1684, 1937, 2324, 2905, 3777]
}
```
- **Response (200 OK):**
```json
{
  "valid": false,
  "canSave": false,
  "severity": "BLOCKED",
  "message": "ไม่อนุญาตให้บันทึก: ราคา 700 THB ต่ำกว่า 85% ของราคาต่ำสุด (723 THB) ตามกฎ P7 และ P8 ข้อ 1",
  "violations": ["ราคาต่ำกว่า 85% Floor (723 THB)"]
}
```

### 3.3 ดาวน์โหลดข้อมูลรูปแบบเดียวกัน
- **Method:** `GET`
- **Path:** `/api/ingest/export?format=json` (หรือ `?format=markdown`)
- **Response:** File Download Attachment

---

## 4. การแบ่งหน้าที่: อะไรที่ระบบคำนวณเอง vs อะไรที่ RM ตัดสินใจเอง

| หน้าที่การทำงาน | ระบบคำนวณอัตโนมัติ (Automated System) | Revenue Manager ตัดสินใจ/กรอกเอง (RM Control) |
|---|---|---|
| **P0: ข้อมูลการจอง** | ตัด No-show/Cancel, หารเฉลี่ยรายคืน, หักค่าอาหารเช้า, แปลงเป็นเงินบาทรวมภาษี | ตรวจทานและแก้ไขค่ากรณี OTA Mapping ไม่ตรง |
| **P1: Seasonality** | คำนวณ Occupancy เฉลี่ย 2 ปี และเสนอ Season ให้ทั้ง 12 เดือน | สิทธิ์ในการ **ย้ายเดือนข้าม Season** ตามนโยบายการตลาด |
| **P2: วันพิเศษ** | ตรวจจับวันตามปฏิทิน (คริสต์มาส, สงกรานต์, ตรุษจีน) และบวก Uplift | **เพิ่ม/ลบ/แก้วันพิเศษ** และกำหนดเปอร์เซ็นต์ราคาพิเศษเอง |
| **P3: Base Rate** | คำนวณ Median วันธรรมดาของห้องฐาน ถ่วงน้ำหนัก 60/40 | ปรับราคาตั้งต้นได้ภายใต้กรอบ Floor P7 |
| **P4: Weekend Uplift** | เปรียบเทียบ Occ Delta (>10 pts) / ADR Delta (>8%) และคุมเพดาน | เลือกว่าจะใช้ราคาเดียวทั้งสัปดาห์หรือคงส่วนเพิ่ม |
| **P5: คู่แข่ง** | คำนวณดัชนีราคา ปรับเข้าเป้า และตรวจจับภาวะคู่แข่งเต็ม $\ge$ 3 แห่ง (+10%) | เลือกกลุ่มคู่แข่ง (Competitive Set) หรือเพิกถอนคู่แข่งบางราย |
| **P6: ส่วนต่างห้อง** | คำนวณบันไดราคา 8 ขั้นให้แพงขึ้นขั้นละ 15–30% อัตโนมัติ | **ปลดล็อก (Unlock) ห้องใดห้องหนึ่ง** เพื่อตั้งราคาเฉพาะห้อง |
| **P7: ราคาต่ำสุด** | คำนวณ Percentile 20 และ 90% ของคู่แข่งต่ำสุดเป็น Floor | กรอกราคาต่ำกว่า Floor ได้ **โดยต้องระบุเหตุผลในการบันทึก** |
| **P8: การห้ามบันทึก** | **บล็อกทันที** หากราคาต่ำกว่า 85% ของ Floor หรือห้องสูงถูกกว่าห้องต่ำ | ไม่มีสิทธิ์บันทึกหากละเมิดข้อ 1 และ 2 ของ P8 |

---

## 5. ยุทธศาสตร์การอ่านภาพหน้าจอ OTA Extranet (A2 Vision Strategy)

### 5.1 ส่วนไหนใช้กฎตายตัว vs ส่วนไหนใช้ AI และเพราะอะไร?
1. **กฎตายตัว (Deterministic Code):**
   - *PDF Rendering:* ใช้ `PyMuPDF` แปลงหน้า PDF ให้เป็นภาพ PNG 150 DPI มีความเร็วสูงและกินหน่วยความจำคงที่
   - *Perceptual Caching:* คำนวณ Image Hash หากเป็นรายงานเดิมที่เคยประมวลผลแล้ว ให้ดึงจาก Cache ทันที (0 AI Cost)
   - *Validation Rules:* ใช้โค้ดตรวจสอบเงื่อนไขความถูกต้อง เช่น ค่า Conversion Rate ต้องอยู่ระหว่าง 0–100%, Bookings $\le$ Visits $\le$ Views
2. **Agentic Multimodal AI:**
   - *Visual & Semantic Understanding:* อ่านการ์ด KPI หลายคอลัมน์ (เช่น Average Daily Rate, Guest Review Score, Content Score) เข้าใจบริบทตำแหน่งภาพว่าตัวเลขใดคู่กับหัวข้อใด
   - *Language Flexibility:* รองรับภาษาไทยและอังกฤษ ป้ายกำกับคำว่า "ยอดเข้าชม" หรือ "Search views" ได้อย่างเป็นธรรมชาติ

### 5.2 ทำอย่างไรกับกราฟที่อ่านตัวเลขตรงๆ ไม่ได้?
- **Y-Axis Calibration:** ให้ Vision AI วิเคราะห์สเกลแกน Y เพื่อเทียบความสูงของแท่งกราฟหรือจุดบนเส้นแนวโน้ม
- **Tabular Cross-referencing:** ตรวจสอบตารางข้อมูลสรุปใต้กราฟก่อนเสมอ
- **Confidence Degradation:** หากค่าใดมาจากการประมาณความสูงของกราฟ ระบบจะปรับค่า `confidence` ให้ไม่เกิน `0.75` เพื่อส่งต่อไปยัง Human-in-the-Loop

### 5.3 ระบบรู้ได้อย่างไรว่าอ่านถูก และรู้ได้อย่างไรว่า OTA เปลี่ยนหน้าตารายงาน (Drift Detection)?
- **Anchor Landmark Verification:** ตรวจสอบคำสำคัญหลักประจำหน้าจอ (เช่น Booking.com ต้องมีคำว่า `"Ranking Dashboard"`, `"Conversion rate"`)
- **Drift Scoring:**
  $$\text{Drift Score} = 1.0 - \frac{\text{Matched Anchors}}{\text{Total Expected Anchors}}$$
  หาก Drift Score $> 0.30$ ระบบจะบันทึกสถานะเป็น **`DRIFT_DETECTED`** และแจ้งเตือนทีมวิศวกรเพื่ออัปเดต Parser ทันที

### 5.4 การควบคุมค่าใช้จ่าย AI สำหรับ 100 โรงแรม × 6 OTA (600 ไฟล์ต่อเดือน)
- ปริมาณรวม: 600 ไฟล์/เดือน (เฉลี่ย 2 หน้าสำคัญ = 1,200 หน้า/เดือน)
- เลือกใช้โมเดล **Lightweight Multimodal Model (Gemini 1.5 Flash)** ต้นทุนภาพละ ~\$0.00015
- **ค่าใช้จ่าย AI รวมทั้งระบบ: ไม่เกิน 0.30 – 1.50 USD ต่อเดือน (ประมาณ 10–55 บาท/เดือน)** ถือว่าต่ำมากและรองรับการขยายตัวได้มหาศาล

### 5.5 การสกัดข้อมูลสมบูรณ์ 100% (100% Raw OCR Text Stream across 6 OTAs)
- ระบบรองรับภาพหน้าจอรายงาน OTA ครบทั้ง 6 ช่องทาง: **Booking.com, Agoda, Expedia, Tiket.com, Traveloka, และ Trip.com**
- ทุกไฟล์ที่นำเข้าจะถูกจัดเก็บทั้งในรูปแบบ **Structured KPI Data** (สำหรับส่งเข้าสู่ Pricing Engine) และ **100% Raw OCR Text Stream** (จัดเก็บข้อความดิบทุกประโยคและตารางที่สกัดได้แบบ Verbatim)
- ผู้ตรวจและ RM สามารถสลับไปดูแท็บ *"สตรีมข้อความดิบ 100%"* เพื่อตรวจสอบความครบถ้วนของข้อมูลก่อนนำไปคำนวณราคา

---

## 6. คำตอบโจทย์ข้อ 5: ราคาเสนอขายสำหรับ H+ Property

### สรุปตัวเลขราคาเสนอขาย (ห้องฐาน Deluxe Room Twin Bed):
| ช่วงเวลา | ฤดูกาล | ราคาเสนอแนะ (วันธรรมดา) | ราคาเสนอแนะ (วันหยุด ศ.-ส.) | วันพิเศษ (Peak) |
|---|---|---|---|---|
| **เดือนธันวาคม 2026** | **High Season** | **1,107 THB** | **1,273 THB** | **1,483 THB** (24 ธ.ค. - 1 ม.ค.) |
| **เดือนกันยายน 2027** | **Low Season** | **828 THB** | **869 THB** | - |

### ที่มาตามกฎ P0–P8:
1. **ธันวาคม 2026:**
   - $P3_{Base} = (979 \times 0.6) + (940 \times 0.4) = 963$ บาท
   - วันธรรมดา $P5$ เทียบกับ Median คู่แข่ง (~1,550 บาท) ปรับขึ้นชนขอบเพดาน +15% ของ $P3 = 1,107$ บาท
   - วันหยุด $P4$ บันทึกส่วนเพิ่ม +15% ของ High Season และปรับตามคู่แข่งได้ 1,273 บาท
   - ช่วงคริสต์มาส–ปีใหม่ (P2) ปรับฐาน High +40% และบวก Surge +10% (คู่แข่งเต็ม $\ge 3$) ได้ 1,483 บาท
2. **กันยายน 2027:**
   - $P3_{Base} = (936 \times 0.6) + (1,031 \times 0.4) = 974$ บาท
   - เพื่อให้ดัชนีราคาเราอยู่ในเป้า Low (90–95) เทียบกับ Median คู่แข่ง (~920 บาท) ราคาถูกปรับลดลง -15% (เพดานลดสูงสุดของ P5) เหลือ **828 บาท** (วันธรรมดา) และ **869 บาท** (วันหยุด)

### 6.3 คำชี้แจง: วันที่ตรวจสอบ ทำไมจึงเลือกวันที่ 15 กันยายน 2027?
- **เหตุผลการเลือก:** วันที่ 15 กันยายน 2027 (ตรงกับวันพุธ) ถูกเลือกเป็น **"ตัวแทนวันธรรมดากลางเดือน (Mid-Month Weekday Baseline)"** เพื่อวัดราคาฐาน Low Season ตามโจทย์ โดยเป็นจุดกึ่งกลางเดือนที่ไม่มีความผันผวนจากเงินเดือนออก (Payday effect) หรือวันหยุดยาว
- **ความยืดหยุ่นในระบบ:** ระบบมิได้จำกัดอยู่แค่วันที่ 15 แต่มีปุ่มลัดเลือก **1 ก.ย.**, **15 ก.ย.**, **18 ก.ย. (วันเสาร์)** และ Date Picker ให้ RM เลือกดูราคาของวันใดก็ได้ 1–30 กันยายน อย่างอิสระ

---

## 7. สถาปัตยกรรม UI: การแยกมุมมองโหมดผู้ใช้ทั่วไป vs Admin Console

เพื่อแก้ปัญหาความสับสนและความซับซ้อนทางคณิตศาสตร์ ระบบได้แบ่งหน้าจอ [2] ตั๋วคำนวณราคาออกเป็น 2 มุมมอง (Dual Perspectives):
1. **โหมดผู้ใช้ทั่วไป / ผู้บริหาร (Standard RM Commercial View - Default):**
   - ออกแบบด้วยสุนทรียภาพที่เรียบง่าย สบายตา ไม่แสดงสมการคณิตศาสตร์หรือโค้ดที่รบกวนสายตา
   - นำเสนอในรูปของการ์ดสรุปราคา, สถานะฤดูกาล, การเปรียบเทียบกับคู่แข่ง, และราคาขั้นต่ำที่ปลอดภัย
   - สรุปเหตุผลในรูปแบบภาษาไทยที่เข้าใจง่าย (Commercial Price Rationale) เช่น *"ราคาฐาน 963 บาท + ส่วนเพิ่มวันหยุด +15% = 1,107 บาท"*
2. **โหมดผู้ดูแลระบบและตรวจสอบสูตร (Admin Console & Engine Auditor):**
   - แยกพื้นที่สำหรับการตรวจสอบเชิงลึก (Deep Technical Audit) สำหรับ Tech Lead และผู้ตรวจ
   - แสดง P0–P8 Rule Execution Trace ครบทุกสมการ, ตัวแปรนำเข้า, และการพิสูจน์ผลลัพธ์
   - แผงจำลองการตั้งค่า Engine Parameters (Weight 60/40, Weekend Cap, Comp Target Bands, Floor % Multiplier)
   - ตารางบันทึกประวัติการปรับราคา (Audit Trail Table - P8 Compliance)

## 7. ข้อเลือกทำเพิ่มข้อ 6: จุดที่กฎใน Playbook ไม่สอดคล้องกับข้อมูลจริง

### 7.1 จุดขัดแย้งที่ 1: ตัวหาร Occupancy ใน P1 ขัดกับธรรมชาติข้อมูล OTA
- **หลักฐาน:** ใน Playbook กำหนดว่า High ต้องได้ Occupancy $\ge 75\%$ โดยเอาห้องขายได้หารด้วยห้องทั้งหมด 144 ห้อง แต่ในข้อมูลจริง A1 เป็นยอดจองจาก 5 OTA เท่านั้น ไม่มีเดือนใดเลยที่ Occupancy เกิน 41.5%
- **ผลเสีย:** หากรันตรงไปตรงมา ทุกเดือนจะกลายเป็น Low Season ทั้งหมด
- **ข้อเสนอ:** กำหนดตัวคูณสัดส่วน OTA ($k_{OTA} \approx 2.2$) หรือใช้ Relative Quantile แทนเกณฑ์คงที่ 75%

### 7.2 จุดขัดแย้งที่ 2: ปัญหาราคา Low Season สูงกว่า Shoulder Season (Price Inversion)
- **หลักฐาน:** ค่า Median ในอดีตของ Low Season (974 บาท) สูงกว่า Shoulder Season (930 บาท) เพราะช่วง ต.ค.-พ.ย. มีการลดราคาอย่างรุนแรง
- **ผลเสีย:** ราคาตั้งต้น Low แพงกว่า Shoulder ซึ่งผิดหลักการจัดการรายได้
- **ข้อเสนอ:** บังคับใช้เงื่อนไข **Monotonic Seasonal Constraint**: $P3_{Low} \le P3_{Shoulder} \le P3_{High}$ โดยปรับ Clamping อัตโนมัติ

---

## 8. ขั้นตอนการ Deploy และ Running Locally

```bash
# 1. ติดตั้ง Dependencies
cd webapp
npm install

# 2. รันในโหมด Development
npm run dev
# เข้าใช้งานที่: http://localhost:3000

# 3. รันการทดสอบและ Build Production
npm run build
npm start
```
- **Live Deployment:** โปรเจกต์พร้อมเชื่อมต่อและ Deploy ผ่าน **Vercel** หรือ **Node.js Server** ได้ทันทีโดยไม่ต้องตั้งค่าฐานข้อมูลเพิ่มเติม
