# Hotel Plus – Rate Intelligence Tool 🏨📈

> **Tech Lead / Senior Developer Take-Home Assessment**  
> **Property:** H+ Hotel Jomtien, Pattaya (144 rooms)  
> **Playbook Engine:** Fully compliant with Revenue Manager Playbook Rules **P0 through P8**

---

## 🌟 โครงการและวัตถุประสงค์ (Project Overview)

ระบบบริหารและคำนวณราคาห้องพักอัจฉริยะ (Rate Intelligence Tool) ถูกพัฒนาขึ้นเพื่อยกระดับการทำงานของทีม Revenue Manager (RM) จากการกรอก Google Sheet รายวัน ไปสู่ระบบคำนวณราคาอัตโนมัติตามฤดูกาลและโครงสร้างบันไดราคาห้องพัก 8 ระดับ โดยอิงตามข้อมูลจริงย้อนหลัง 2 ปี (A1 Dataset: 16,372 รายการจอง), ภาพหน้าจอ OTA Extranet (A2 Dataset), และข้อมูลสำรวจราคาคู่แข่ง 5 แห่งในย่านจอมเทียน (A4 Dataset)

---

## 🚀 ฟังก์ชันหลักของระบบ (Core Features)

### 1. หน้า [1] การนำเข้าและตรวจทานข้อมูล (Data Ingestion & OCR Audit)
- **Extranet Report Parsing:** สกัด ADR, Conversion Rate, และ Review Score จากรายงาน OTA ชั้นนำ (Booking.com, Agoda, Expedia)
- **Layout Drift Detection:** ตรวจจับการเปลี่ยนแปลง Layout หรือ DOM ของ OTA Extranet โดยอัตโนมัติ
- **Human-in-the-loop Editing:** อนุญาตให้ RM แก้ไขตัวเลขที่ค่าความมั่นใจต่ำ (Low Confidence) พร้อมอัปเดตเป็น `MANUAL_VERIFIED`
- **Data Export:** ส่งออกข้อมูลโครงสร้างมาตรฐานเดียวกันทั้งในรูปแบบ **JSON** และ **Markdown**

### 2. หน้า [2] ระบบคำนวณราคาห้องพัก (Dynamic Pricing Terminal)
- **P0–P8 Playbook Engine:** ทำงานตามกฎคำนวณราคา 9 ขั้นตอนอย่างโปร่งใสและตรวจสอบสูตรได้ทุกจุด (Rule Trace Inspector)
- **8-Tier Room Ladder Matrix:** คำนวณบันไดราคาห้องพักทั้ง 8 ระดับ (ตั้งแต่ Deluxe Twin จนถึง Presidential / Honeymoon Suite)
- **Interactive Override & Hard-Block Validation:** RM สามารถปรับราคาเองได้ โดยระบบจะบังคับใช้กฎ P7 (Floor 750 THB / 85% Hard-block) และกฎ P6/P8 (ห้ามตั้งราคาผิดลำดับขั้นบันได) ทันทีแบบ Real-time
- **Rate Trend Visualizer:** กราฟวิเคราะห์แนวโน้มราคา เปรียบเทียบกรอบราคาตลาด, คู่แข่ง 5 แห่ง, และอัตราเข้าพัก

### 3. หน้า [3] รายงานผลการประเมินและเฉลยคำตอบ (Assessment Log & Official Proof)
- **เฉลยข้อ 5:** ตารางราคาเสนอแนะอย่างเป็นทางการสำหรับเดือน **ธันวาคม 2026** (High Season) และ **กันยายน 2027** (Low Season) พร้อมสมการคณิตศาสตร์
- **ข้อ 6 พิเศษ:** การวิเคราะห์ข้อขัดแย้งในข้อมูลจริงเชิงประจักษ์ (Empirical Discrepancies) เช่น ปรากฏการณ์ Low Season ADR สูงกว่า High Season และแนวทางแก้ไข
- **Dual-View Switcher:** รองรับทั้งมุมมอง `[1] สรุปสั้น เข้าใจทันที (Fast Read)` และ `[2] เจาะลึกสมการ & ข้อมูลตรวจสอบ (Detailed)`

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend & Server:** Next.js 16.3.8 (App Router, Turbopack, React 19)
- **Styling & Design System:** TailwindCSS, Lucide Icons, Modern Light/Dark Mode Support
- **Data & Calculations:** Python (Data Analysis, Feature Extraction, Precomputations), TypeScript (Dynamic Rule Engine & Validation)
- **Data Formats:** JSON, Markdown, CSV, Normalized Extranet Datasets

---

## 💻 วิธีการรันบนเครื่อง Local (Getting Started)

### 1. Clone repository
```bash
git clone https://github.com/<YOUR_USERNAME>/hotelplus-rate-intelligence.git
cd hotelplus-rate-intelligence/webapp
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. เริ่มต้น Local Dev Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

### 4. ตรวจสอบคุณภาพโค้ด (Linting & Production Build)
```bash
npm run lint    # 0 errors, 0 warnings
npm run build   # Production compile passed
```

---

## 📂 โครงสร้างไดเรกทอรี (Directory Structure)

```
hotelplus/
├── README.md                          # เอกสารภาพรวมโครงการ
├── spec.md                            # ข้อกำหนดระบบฉบับสมบูรณ์ (System Specification)
├── Rate_Intelligence_Analysis.ipynb   # สมุดจดโค้ดวิเคราะห์ข้อมูล A1-A4 & คู่แข่ง
├── assessment_questions.txt           # โจทย์ Take-home ฉบับเต็ม
├── resources/                         # ไฟล์ข้อมูลตั้งต้น A1-A5 จากโจทย์
└── webapp/                            # Next.js Web Application
    ├── src/
    │   ├── app/                       # App Router & API Endpoints
    │   │   ├── api/rates/calculate/   # Rate calculation API
    │   │   ├── api/rates/validate/    # Rule validation & Hard-block API
    │   │   └── api/ingest/export/     # JSON & Markdown export API
    │   ├── components/                # UI Components (Ingestion, Pricing, Answers, Chart)
    │   ├── data/                      # Normalized datasets & precomputed baselines
    │   └── lib/                       # P0-P8 Playbook Engine & Rule Validators
    ├── public/                        # Static assets & OTA report sample images
    └── package.json
```

---

## 📑 เอกสารที่เกี่ยวข้อง (Documentation)

- [System Specification (`spec.md`)](spec.md) – สถาปัตยกรรมระบบ, Data Schemas, API Endpoints, และแนวทางจัดการต้นทุน AI สำหรับ 600 ไฟล์/เดือน
