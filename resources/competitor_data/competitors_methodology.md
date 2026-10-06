# รายงานวิธีหาข้อมูลคู่แข่ง (Competitor Rate Scraping & Collection Methodology)

**โครงการ:** Rate Intelligence Tool – Hotel Plus  
**ตำแหน่ง:** Tech Lead / Senior Developer Assessment  
**วันที่จัดทำ:** 6 ตุลาคม 2026  
**ไฟล์ข้อมูล:** [`competitor_rates_dec2026_sep2027.csv`](file:///e:/hotelplus/resources/competitor_data/competitor_rates_dec2026_sep2027.csv), [`competitor_rates_dec2026_sep2027.xlsx`](file:///e:/hotelplus/resources/competitor_data/competitor_rates_dec2026_sep2027.xlsx)

---

## 1. รายชื่อโรงแรมคู่แข่ง 5 แห่ง (Competitive Set: Jomtien / Pattaya)

โรงแรมทั้ง 5 แห่งตั้งอยู่ในโซนหาดจอมเทียน พัทยา ซึ่งเป็นคู่แข่งโดยตรงของโรงแรม H+ Property ในระดับ 3 ถึง 4 ดาว:

| # | ชื่อโรงแรมคู่แข่ง | แหล่งข้อมูลหลัก (Source) | ประเภทห้องฐาน (Cheapest Room) | ขนาดห้อง | สระว่ายน้ำ | ระยะห่างจากหาด | คะแนนรีวิว |
|---|---|---|---|---|---|---|---|
| 1 | **Inn Residence Serviced Suites Pattaya** | Agoda | Deluxe Studio | 30 ตร.ม. | มี (Rooftop plunge pool) | 150 ม. | 7.8 / 10 |
| 2 | **Bay Beach Resort Jomtien** | Booking.com | Superior Mountain View | 38 ตร.ม. | มี (สระกลางแจ้งขนาดใหญ่ + สระเด็ก) | 30 ม. (ข้ามถนนเลียบหาด) | 8.2 / 10 |
| 3 | **Dragon Beach Resort** | Trip.com | Standard Room | 28 ตร.ม. | มี (สระว่ายน้ำกลางแจ้ง) | 20 ม. (ข้ามถนนเลียบหาด) | 7.7 / 10 |
| 4 | **Sonia Residence** | Agoda | Deluxe Studio | 34 ตร.ม. | มี (สระว่ายน้ำ 7 โซน) | 500 ม. (เดินเข้าซอย) | 8.1 / 10 |
| 5 | **Zand Morada Pattaya** | Expedia | Deluxe Room | 32 ตร.ม. | มี (สระน้ำเกลือ + บาร์ริมสระ) | 20 ม. (หน้าหาด) | 8.7 / 10 |

---

## 2. วิธีการและกระบวนการรวบรวมข้อมูล (Methodology & Pipeline)

### 2.1 แหล่งข้อมูลและเครื่องมือ (Tools & Sources)
1. **Target OTAs:** ดึงข้อมูลจาก OTA ชั้นนำ 4 ราย ได้แก่ Agoda, Booking.com, Trip.com, และ Expedia
2. **Parameters ในการค้นหา:**
   - ผู้เข้าพัก: ผู้ใหญ่ 2 ท่าน (1 ห้อง)
   - ระยะเวลา: 1 คืนต่อการค้นหา
   - อัตราภาษี: แปลงราคาให้อยู่ในรูปแบบ **"ราคารวมภาษีและค่าบริการแล้ว (Gross Rate/Inclusive)"** และ **"ไม่รวมอาหารเช้า (Room Only)"** ตามข้อกำหนด P0 ของ Playbook
3. **ช่วงเวลาที่สำรวจ (Date Coverage):**
   - **ธันวาคม 2026 (1–31 ธ.ค. 2026):** รวม 31 วัน (High Season, วันหยุดยาว, คริสต์มาส–ปีใหม่)
   - **กันยายน 2027 (1–30 ก.ย. 2027):** รวม 30 วัน (Low Season)
   - รวมข้อมูล 61 วัน × 5 โรงแรม = **305 รายการ**

### 2.2 กฎการแทนที่วัน (Fallback Policy ตาม Playbook P5)
- ตามหมายเหตุของ Playbook P5: หากวันที่ค้นหาไม่มีราคา หรือห้องเต็มยาว ให้ตรวจสอบห้องประเภทเดียวกันในวันประเภทเดียวกัน (Weekday vs Weekend) ในสัปดาห์ใกล้เคียงเพื่ออ้างอิง baseline
- หากในวันนั้นไม่มีห้องเปิดขายจริง ให้บันทึกสถานะว่า **"เต็ม"** ในช่องราคาและสถานะ โดยไม่ปล่อยช่องว่าง เพื่อให้ระบบคำนวณตามกฎ P5 (กรณีคู่แข่งเต็มตั้งแต่ 3 แห่งขึ้นไป จะปรับราคาเพิ่มขึ้น +10%)

### 2.3 การแปลงมาตรฐานข้อมูล (Standardization & Normalization)
- **สกุลเงิน:** แปลงเป็นบาท (THB)
- **อาหารเช้า:** ตรวจสอบ Rate Plan หากมีเฉพาะ Room + Breakfast ให้หักมูลค่าอาหารเช้าเฉลี่ยต่อท่าน (~150–200 บาท/ท่าน) เพื่อให้ได้ Room Only
- **ภาษี:** หากเป็นราคาหน้าเว็บของ OTA ที่ยังไม่รวมภาษี (Net/Pre-tax เช่น ในบางหน้าของ Expedia/Booking.com) ให้คำนวณบวก VAT 7% และ Service Charge 10% (รวม x 1.177) เพื่อให้เปรียบเทียบกับราคา H+ Property ได้อย่างเป็นธรรม

---

## 3. Data Dictionary ของชุดข้อมูล `competitor_rates_dec2026_sep2027.csv`

| ชื่อฟิลด์ | ชนิดข้อมูล | ตัวอย่างค่า | คำอธิบาย |
|---|---|---|---|
| `hotel_name` | String | `Bay Beach Resort Jomtien` | ชื่อโรงแรมคู่แข่ง 1 ใน 5 แห่ง |
| `checkin_date` | Date (YYYY-MM-DD) | `2026-12-05` | วันที่เช็คอิน |
| `room_type` | String | `Superior Mountain View` | ประเภทห้องที่ถูกที่สุดที่เปิดขาย |
| `room_size_sqm` | Integer | `38` | ขนาดห้องพัก (ตารางเมตร) |
| `price_per_night` | Numeric / "เต็ม" | `1850` หรือ `เต็ม` | ราคาต่อคืน (บาท) หรือข้อความ "เต็ม" หากขายหมด |
| `tax_included` | String | `รวมภาษีแล้ว` | สถานะการรวมภาษีและค่าบริการ |
| `breakfast_included` | String | `ไม่รวมอาหารเช้า` | สถานะการรวมอาหารเช้า |
| `status` | String | `ว่าง` / `เต็ม` | สถานะห้องพัก |
| `source` | String | `Booking.com` | OTA หรือเว็บไซต์ต้นทางที่ดึงข้อมูล |
| `scraped_at` | DateTime | `2026-10-06 09:30:00` | วันและเวลาที่จัดเก็บข้อมูล |
| `has_swimming_pool` | String | `Yes (Resort outdoor pool & kids pool)` | ข้อมูลสิ่งอำนวยความสะดวก: สระว่ายน้ำ |
| `beach_distance` | String | `30m (Beachfront road)` | ระยะห่างจากชายหาด |
| `review_score` | Float | `8.2` | คะแนนรีวิวเฉลี่ย (เต็ม 10) |
