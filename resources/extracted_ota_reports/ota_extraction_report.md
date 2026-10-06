# สถาปัตยกรรมและรายงานการสกัดข้อมูลภาพหน้าจอ OTA (OTA Extranet Vision Extraction Architecture Report)

**โครงการ:** Rate Intelligence Tool – Hotel Plus  
**ตำแหน่ง:** Tech Lead / Senior Developer Assessment  
**วันที่จัดทำ:** 6 ตุลาคม 2026  
**เอกสารประกอบ:** [`normalized_ota_metrics.json`](file:///e:/hotelplus/resources/extracted_ota_reports/normalized_ota_metrics.json), [`normalized_ota_metrics.md`](file:///e:/hotelplus/resources/extracted_ota_reports/normalized_ota_metrics.md)

---

## 1. บทนำและปัญหาของระบบ OCR ดั้งเดิม (Why Legacy OCR Fails)

ในอดีต การดึงข้อมูลจากภาพรายงานหลังบ้านมักพึ่งพา **Tesseract OCR** ร่วมกับ Regular Expressions หรือตำแหน่ง Bounding Box แบบตายตัว อย่างไรก็ตาม เมื่อวิเคราะห์ไฟล์ตัวอย่างจริง (A2) เช่น [`Agoda.pdf`](file:///e:/hotelplus/resources/A2_ota_screenshots/Agoda.pdf) และ [`Booking.pdf`](file:///e:/hotelplus/resources/A2_ota_screenshots/Booking.pdf) พบข้อจำกัดร้ายแรงดังนี้:

1. **การสูญเสียโครงสร้าง 2 มิติ (Spatial Context Loss):** หน้าจอของ Booking.com ประกอบด้วยการ์ด KPI 4 ใบเรียงแนวนอน (*Average Daily Rate, Property Page Score, Guest Review Score, Conversion Rate*) Tesseract จะดึงตัวอักษรออกมาเป็นข้อความ 1 มิติ ทำให้ตัวเลขและชื่อหัวข้อสลับคอลัมน์กัน
2. **กราฟและ Funnel ไม่สามารถอ่านได้ (Unreadable Visual Charts):** แผนภูมิแท่ง Conversion Funnel และเส้นแนวโน้มไม่มีข้อความให้ OCR อ่าน
3. **ความเปราะบางต่อการเปลี่ยนหน้าตา (Brittle to Redesigns):** OTA แต่ละเจ้าปรับปรุงหน้าตา Extranet บ่อยครั้ง การใช้พิกัด Bounding Box จะพังทันทีเมื่อมีการขยับ Layout เพียงเล็กน้อย

ด้วยเหตุนี้ ระบบจึงออกแบบเป็น **Hybrid Multi-Tier Pipeline** ที่ผสานระหว่าง **กฎตายตัว (Deterministic Rules)** และ **Agentic Multimodal Vision AI** เพื่อให้ได้ทั้งความแม่นยำสูงสุดและความคุ้มค่าทางเศรษฐศาสตร์

---

## 2. การแบ่งหน้าที่: ส่วนไหนใช้กฎตายตัว ส่วนไหนใช้ AI และเพราะอะไร?

| ขั้นตอนการทำงาน | เครื่องมือที่ใช้ | เหตุผลทางวิศวกรรม |
|---|---|---|
| **1. File Ingestion & Rendering** | **กฎตายตัว (Deterministic)**<br>`PyMuPDF` / `pdf2image` | แปลงไฟล์ PDF หลายหน้าให้เป็นภาพ PNG (150 DPI) เพื่อประสิทธิภาพความเร็วและใช้ทรัพยากรคงที่ |
| **2. Layout Fingerprinting & Cache Check** | **กฎตายตัว (Deterministic)**<br>`Perceptual Hash (pHash)` | หากโรงแรมอัปโหลดไฟล์รายงานเดิมซ้ำ หรือหน้าตาเหมือนเดิม ระบบจะดึงข้อมูลจาก Cache ทันทีโดยไม่ต้องเสียค่าใช้จ่าย AI |
| **3. Section Segmentation (Cropping)** | **กฎตายตัว (Deterministic)**<br>`OpenCV Bounding Contours` | ตัดเฉพาะส่วนสำคัญ เช่น โซนตารางสรุป หรือกล่อง KPI ออกมาเป็นภาพย่อย ลดขนาด Token รูปภาพที่ส่งให้โมเดล AI |
| **4. Visual & Semantic Extraction** | **Agentic Multimodal AI**<br>`Gemini 1.5 Flash` / `GPT-4o-mini` | สกัดค่าตัวเลขพร้อมทำความเข้าใจความสัมพันธ์ของหัวข้อ (Contextual Key-Value Mapping) รองรับทั้งภาษาไทยและอังกฤษ |
| **5. Graphic & Trend Interpretation** | **Agentic Multimodal AI** | วิเคราะห์กราฟแท่ง, ความชันของกราฟเส้น, และ Funnel พร้อมประเมินค่าออกมาเป็นตัวเลขและทิศทาง |
| **6. Validation & Anomaly Checks** | **กฎตายตัว (Deterministic)**<br>`Pydantic Validator` | ตรวจสอบช่วงค่าตัวเลขที่สมเหตุสมผล เช่น ค่าคะแนนรีวิวต้องอยู่ระหว่าง 0–10, อัตรา Conversion ต้องอยู่ระหว่าง 0–100% |

---

## 3. วิธีการจัดการกับกราฟที่อ่านตัวเลขตรงๆ ไม่ได้ (Interpreting Non-digitized Charts)

เมื่อรายงานแสดงผลเป็นกราฟเส้นหรือแผนภูมิแท่งโดยไม่มีตัวเลขกำกับ:
1. **Visual Calibration Prompting:** กำหนด Prompt ให้โมเดล AI ตรวจสอบแกน Y (Y-Axis Calibration) เช่น เส้นฐาน 0% และเส้นบนสุด 100%
2. **Relative Height Mapping:** โมเดลจะประมาณการอัตราส่วนความสูงของแท่งกราฟเทียบกับสเกลแกน Y
3. **Cross-Referencing with Tabular Footers:** ในระบบ Extranet ยุคใหม่ (เช่น Agoda Analytics) ด้านล่างของกราฟมักมีปุ่ม `Show table` ซ่อนอยู่ หากมีตาราง ระบบจะให้น้ำหนักกับตัวเลขในตารางก่อน
4. **Confidence Degradation:** ทุกค่าที่สกัดมาจากการคาดเดาความสูงของกราฟ (Visual Estimation) ระบบจะลดคะแนนความเชื่อมั่น (Confidence Score) ลงเหลือไม่เกิน `0.75` โดยอัตโนมัติ เพื่อกระตุ้นให้เข้าสู่กระบวนการตรวจทาน

---

## 4. ระบบรู้ได้อย่างไรว่าอ่านถูก และรู้ได้อย่างไรว่า OTA เปลี่ยนหน้าตารายงาน? (Validation & Drift Detection)

### 4.1 การตรวจทานความถูกต้อง (Data Integrity Verification)
- **Domain Constraint Rules:**
  - `Average Daily Rate (ADR)` ต้องมากกว่า 0 บาท และไม่ควรต่างจากราคาห้องฐานในระบบเดิมเกิน ±50%
  - `Conversion Rate` ต้องมีค่าระหว่าง `0.1%` ถึง `15.0%` (ค่าปกติของ OTA)
  - `Funnel Hierarchy Constraint:` $\text{Bookings} \le \text{Page Visits} \le \text{Search Views}$ เสมอ
- **Confidence Scoring:** ทุกฟิลด์ที่ส่งออกจาก Vision AI ต้องส่งค่า `confidence: 0.0 - 1.0` หากค่าใดต่ำกว่า `0.85` ระบบจะตั้งสถานะเป็น `WARN`

### 4.2 การตรวจจับการเปลี่ยนรูปแบบหน้าตา (Template Drift Detection)
- **Anchor Landmark Verification:** ระบบกำหนดรายการ Anchor Keywords ประจำแต่ละ OTA เช่น:
  - Booking.com: `"Ranking Dashboard"`, `"Factors influencing your search ranking"`, `"Conversion rate"`
  - Agoda: `"Partner Portal"`, `"Analytics"`, `"Traveler insights"`, `"Content score"`
- **Drift Scoring Formula:**
  $$\text{Drift Score} = 1.0 - \frac{\text{Number of Matched Anchors}}{\text{Total Expected Anchors}}$$
- หาก `Drift Score > 0.30` หรือ AI ส่งสัญญาณว่าหา Layout ไม่พบ ระบบจะบันทึกสถานะว่า **`DRIFT_DETECTED`** และยิงแจ้งเตือน (Slack/Webhook/Log) ไปยังทีมวิศวกรเพื่ออัปเดต Prompt Template ทันที

---

## 5. การควบคุมค่าใช้จ่าย AI สำหรับ 100 โรงแรม × 6 OTA (600 ไฟล์ต่อเดือน)

การออกแบบระบบสำหรับสเกลระดับ Enterprise (600 ไฟล์/เดือน หรือเฉลี่ยประมาณ 2,400 หน้า/เดือน):

| กลยุทธ์การประหยัดต้นทุน | วิธีการทำงาน | ผลลัพธ์การลดต้นทุน |
|---|---|---|
| **1. Model Tier Selection** | ใช้โมเดล **Lightweight Vision Model** (เช่น Gemini 1.5 Flash) แทน Frontier Models ขนาดใหญ่ | ประหยัดลง **85–90%** (ต้นทุนต่อภาพเพียง ~$0.0001–$0.0002) |
| **2. Selective Page Targeting** | ใช้กฎตายตัวคัดกรองเฉพาะหน้าที่มีรายงานสรุป (ส่วนใหญ่คือหน้า 1 และ 2) ข้ามหน้าที่เป็นเงื่อนไขทางกฎหมาย | ลดจำนวนรูปภาพที่ต้องส่งเข้า AI ลง **50%** |
| **3. Resolution Downsampling** | ย่อขนาดภาพให้มีความกว้างไม่เกิน 1,280 พิกเซลก่อนส่ง (เพียงพอต่อการอ่านตัวอักษร) | ลด Token Input ต่อภาพลง **40%** |
| **4. Perceptual Content Caching** | บันทึก Hash ของรายงาน หากพบรายงานที่อัปโหลดซ้ำ ไม่เรียก AI | ป้องกันการจ่ายเงินซ้ำซ้อน |

### สรุปคำนวณค่าใช้จ่ายรายเดือน (Cost Estimation):
- ปริมาณ: 600 ไฟล์ × 2 หน้าสำคัญ = 1,200 หน้า/เดือน
- ค่าบริการประมวลผลภาพผ่าน Gemini 1.5 Flash: ~\$0.00015 ต่อภาพ
- ค่าบริการ Token JSON ขาออก (~300 tokens): ~\$0.0001 ต่อครั้ง
- **ค่าใช้จ่าย AI รวมทั้งระบบ: ไม่เกิน 0.30 – 1.50 USD ต่อเดือน (ประมาณ 10–55 บาท/เดือน)** ถือว่าต่ำมากและคุ้มค่าอย่างยิ่งในเชิงธุรกิจ

---

## 6. กระบวนการ Human-in-the-Loop สำหรับหน้าเว็บ (Page 1)

เพื่อให้เป็นไปตามข้อกำหนด: *"ถ้าอ่านค่าใดไม่แน่ใจ ต้องแสดงให้ผู้ใช้เห็นและแก้ได้"*
1. ระบบจะส่งข้อมูลในรูปแบบ JSON ที่มีสถานะ `confidence` และ `validation`
2. บนหน้าเว็บ **Page 1 (Data Ingestion)**:
   - ค่าที่ผ่านการตรวจสอบ (`confidence >= 0.85` และ `validation == 'PASS'`) จะแสดงผลด้วยกล่องสีเขียว/ปกติ
   - ค่าที่น่าสงสัย (`confidence < 0.85` หรือ `validation == 'WARN'`) จะแสดงเป็นกล่องสีเหลืองอำพัน (Amber Alert) พร้อมระบุเหตุผล เช่น *"Guest Review Score ค่อนข้างต่ำ (5.5) กรุณาตรวจสอบซ้ำ"*
   - Revenue Manager สามารถกดคลิกแก้ไขตัวเลขในช่อง Input Field นั้นได้ทันทีก่อนกดยืนยันบันทึกข้อมูล
