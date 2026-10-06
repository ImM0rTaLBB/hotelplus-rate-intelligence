# ข้อมูลที่แปลงเป็นรูปแบบเดียวกันจากรายงาน OTA (Normalized OTA Extranet Metrics)

**วันที่สร้างข้อมูล:** 2026-10-06 10:23:34

สรุปข้อมูลสำคัญที่สกัดได้จากรายงานภาพหน้าจอของ OTA (A2) แปลงเป็นโครงสร้างมาตรฐานเดียวเพื่อใช้งานร่วมกับระบบตั้งราคา:

## 📌 ช่องทาง: Booking.com (Booking Partner Central - Ranking Dashboard)
- **ไฟล์ต้นฉบับ:** `Booking.pdf`
- **ช่วงเวลาข้อมูล:** Last 30 days (as of 21 Sept 2026)
- **กลุ่มเปรียบเทียบ:** Competitive Set (Jomtien Beach)
- **สถานะการตรวจจับหน้าตาเปลี่ยน (Drift Check):** `NORMAL` (Drift score: 0.02)
- **ต้องให้ผู้ใช้ตรวจสอบหรือไม่ (Human-in-the-Loop):** `⚠️ ใช่ (Requires RM Review)`
  - *เหตุผล:* Low review score (5.5) and bottom comp rank (10/11) flagged for RM verification.

### ตารางตัวชี้วัด (Key Metrics Extracted)

| ตัวชี้วัด (Metric) | ค่าที่สกัดได้ (Value) | ความมั่นใจ (Confidence) | สถานะตรวจทาน (Validation) | หมายเหตุ (Notes) |
|---|---|---|---|---|
| `average_daily_rate` | **1868.56 THB** | 98% | ✅ PASS | Matches historical high season range |
| `property_page_score` | **100.0 %** | 99% | ✅ PASS | Optimal property content listing |
| `guest_review_score` | **5.5** | 95% | ⚠️ WARN | Low score flag (< 7.0). Requires RM attention on service complaints. |
| `conversion_rate` | **1.22 %** | 98% | ✅ PASS | Standard OTA benchmark (typically 1.0 - 2.5%) |
| `search_result_views` | **31494** | 97% | ✅ PASS | 62.9% below competitive set views |
| `property_page_visits` | **530** | 97% | ✅ PASS | Click-through rate from search: 1.68% (vs comp 8.55%) |
| `bookings_made` | **7** | 98% | ✅ PASS | Severe underperformance vs competitive set |
| `availability_for_search` | **99.09 %** | 99% | ✅ PASS | Good availability; issue is conversion & review score |

---

## 📌 ช่องทาง: Agoda (Agoda Partner Portal - Analytics)
- **ไฟล์ต้นฉบับ:** `Agoda.pdf`
- **ช่วงเวลาข้อมูล:** Booked in last 30 days (vs Competitor set)
- **กลุ่มเปรียบเทียบ:** Competitor Set
- **สถานะการตรวจจับหน้าตาเปลี่ยน (Drift Check):** `NORMAL` (Drift score: 0.04)
- **ต้องให้ผู้ใช้ตรวจสอบหรือไม่ (Human-in-the-Loop):** `✅ ผ่านอัตโนมัติ`

### ตารางตัวชี้วัด (Key Metrics Extracted)

| ตัวชี้วัด (Metric) | ค่าที่สกัดได้ (Value) | ความมั่นใจ (Confidence) | สถานะตรวจทาน (Validation) | หมายเหตุ (Notes) |
|---|---|---|---|---|
| `content_score` | **87** | 98% | ✅ PASS | Properties with 100 receive 150% more bookings on average |
| `primary_lead_time` | **0-1 day (Last minute) (47.0%)** | 96% | ✅ PASS | Extremely high dependency on last-minute same-day bookings |
| `primary_length_of_stay` | **1 night (71.0%)** | 97% | ✅ PASS | Predominantly single-night transit or weekend stays |
| `primary_guest_origin` | **Thailand (Domestic) (89.0%)** | 98% | ✅ PASS | Strongly domestic guest base (89%); low international penetration |

---

## 📌 ช่องทาง: Expedia (Expedia Partner Central)
- **ไฟล์ต้นฉบับ:** `Expedia.pdf`
- **ช่วงเวลาข้อมูล:** Trailing 30 days
- **กลุ่มเปรียบเทียบ:** Pattaya / Jomtien Competitive Set
- **สถานะการตรวจจับหน้าตาเปลี่ยน (Drift Check):** `NORMAL` (Drift score: 0.05)
- **ต้องให้ผู้ใช้ตรวจสอบหรือไม่ (Human-in-the-Loop):** `✅ ผ่านอัตโนมัติ`

### ตารางตัวชี้วัด (Key Metrics Extracted)

| ตัวชี้วัด (Metric) | ค่าที่สกัดได้ (Value) | ความมั่นใจ (Confidence) | สถานะตรวจทาน (Validation) | หมายเหตุ (Notes) |
|---|---|---|---|---|
| `average_daily_rate` | **1520.0 THB** | 92% | ✅ PASS | Consistent with Expedia historical booking data |
| `guest_rating` | **7.2** | 88% | ✅ PASS | Moderate rating |
| `conversion_rate` | **1.45 %** | 89% | ✅ PASS | Normal Expedia conversion band |

---

