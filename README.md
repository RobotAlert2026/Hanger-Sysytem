# ⚙️ Hanger PM System

ระบบบริหารจัดการ Preventive Maintenance (PM) สำหรับเครื่อง Hanger  
พัฒนาด้วย Vanilla HTML/CSS/JavaScript เชื่อมต่อ Google Sheets เป็น Database  
เปิดใช้งานผ่าน GitHub Pages โดยไม่ต้องมี Backend Server

---

## 🌐 Demo

> เปิดผ่าน GitHub Pages:  
> `https://<username>.github.io/<repo>/`

---

## ✨ ฟีเจอร์หลัก

| หมวด | ฟีเจอร์ |
|------|--------|
| 📊 **Dashboard** | ภาพรวม PM วันนี้ แยกกะเช้า/กะดึก · ความคืบหน้าเดือน · แบนเนอร์ปัญหาวิกฤต |
| 🔧 **บันทึก PM** | Checklist 18 รายการ · เลือกช่างจาก Shift A/B · Batch PM หลายเครื่องพร้อมกัน |
| ⚠️ **ปัญหา/ข้อบกพร่อง** | บันทึกปัญหา 4 ระดับ · ติดตามสถานะ · แจ้งเตือน Email และ LINE |
| 📈 **วิเคราะห์ข้อมูล** | กราฟ PM รายเครื่อง · Compliance % · แนวโน้มแยกกะ · ระดับความรุนแรง |
| 📋 **ประวัติ PM** | ค้นหา · กรองตามวันที่ / เครื่อง / ช่าง · ดูรายละเอียด Checklist |
| 📤 **Export/Import** | CSV · JSON · รายงาน HTML วันนี้ · รายงานประจำเดือน (PDF-ready) |
| ⚙️ **ตั้งค่า** | จัดการรายชื่อเครื่อง · รอบ PM รายเครื่อง · Admin PIN · Email/LINE Notification |

---

## 🏗️ โครงสร้างไฟล์

```
├── index.html                                 # HTML หลักสำหรับ GitHub Pages
├── style.css                                  # CSS ทั้งหมด (Dark/Light theme)
├── app.js                                     # แอปหลัก
├── Hanger PM System  Desktop.data.js         # Data layer / API calls / notifications
├── Hanger PM System  Desktop.ui.js           # UI helpers / state helpers
├── Hanger PM System  Desktop.html            # HTML สำรอง/backup
├── Hanger PM System  Desktop_files/          # Assets ที่จำเป็น
├── README.md
└── .gitignore
```

> **GitHub Pages:** ใช้ URL แบบ `https://<username>.github.io/<repo>/`

---

## 🔌 Architecture

```
Browser (GitHub Pages)
    │
    ├── index.html  ──  style.css
    │                   app.js
    │
    └── fetch() ──► Google Apps Script (Web App)
                        │
                        └── Google Sheets (Database)
                                ├── Machines
                                ├── PM Records
                                ├── Issues
                                └── Settings
```

ข้อมูลทั้งหมดเก็บใน **Google Sheets** ผ่าน **Google Apps Script** ที่ Deploy เป็น Web App  
ไม่มี Backend Server / ไม่มี Database แยก / ไม่มีค่าใช้จ่ายรายเดือน

---

## 🚀 การติดตั้ง

### 1. ตั้งค่า Google Apps Script

1. สร้าง Google Sheets ใหม่
2. เปิด **Extensions → Apps Script**
3. วางโค้ด Apps Script สำหรับจัดการ Sheet (CRUD: PM, Issues, Machines, Settings)
4. Deploy → **New Deployment** → Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. คัดลอก **Deployment URL**

### 2. อัปเดต Deployment URL

ตอนนี้แอปรับ URL จากตัวแปร `window.HANGER_GS_URL` หรือ query string `?gs_url=https://...` ได้ทันที โดยไม่ต้องแก้โค้ด

ตัวอย่าง:

```text
https://<username>.github.io/<repo>/?gs_url=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

หรือแก้ในไฟล์ [Hanger PM System  Desktop.data.js](Hanger%20PM%20System%20%20Desktop.data.js) หากต้องการตั้งค่าแบบถาวร

### 3. Deploy ผ่าน GitHub Pages

```bash
git init
git add index.html style.css app.js
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

จากนั้นไปที่ **Settings → Pages → Branch: main → Save**

---

## 📋 PM Checklist (18 รายการ)

รายการ PM มาตรฐานสำหรับเครื่อง Hanger:

1. ตรวจสอบและทำความสะอาดทั่วไป
2. ตรวจสอบระบบหล่อลื่น (จาระบีรางสไลด์ ลูกปืน)
3. ตรวจสอบระบบโซ่
4. ตรวจสอบระบบไฟฟ้าและสายไฟ
5. ตรวจสอบ Encoder motor ด้านหน้า (Front)
6. ตรวจสอบ Encoder motor ด้านหลัง (Rear)
7. ตรวจสอบ Limit Sensor ด้านหน้า
8. ตรวจสอบ Limit Sensor ด้านหลัง
9. ตรวจสอบ Motor ลอกยก ด้านหน้า (Front)
10. ตรวจสอบ Motor ลอกยก ด้านหลัง (Rear)
11. ตรวจสอบ X-Bar การชำรุด/รอยฉีกขาด
12. ตรวจสอบ X-Bar น็อตยึดแน่น
13. ตรวจสอบ X-Bar อัดจารบีข้อต่อ/บูท
14. ตรวจสอบล้อ Roller ลูกปืน/น็อต
15. ตรวจสอบล้อ Roller เพลาขับ
16. ตรวจสอบน็อตสกรูทุกจุด (มาร์คทุกครั้ง)
17. ตรวจวัด/ปรับระยะรู Pin Hanger หน้า-หลัง
18. ทดสอบการทำงาน เลื่อนขึ้น-ลง (ไม่มี Alarm)

---

## 👨‍🔧 ช่างประจำกะ

| Shift A | Shift B |
|---------|---------|
| Phet, Preem, Kran, Beer, Sleep | Goft, Tee, Keng, Tor, Guitar |
| Game, Dilok, Aek, Book, Aem, Mic | Kaet, Mon, S, Coil, Non |

แก้ไขรายชื่อช่างได้ที่ตัวแปร `PM_TECH_OPTIONS` ใน `app.js`

---

## 🔔 การแจ้งเตือน

### Email
- แจ้งเตือนปัญหาระดับ 3–4 (รุนแรง / วิกฤต)
- แจ้งเตือน PM เกินกำหนด
- สรุปรายวัน
- รองรับผู้รับหลายคน

### LINE
- รองรับหลาย Group
- ใช้ Channel Access Token จาก LINE Developers
- Fallback อัตโนมัติหากส่งด้วยวิธีหลักไม่ได้

---

## 🔐 Security

- **Admin PIN** (4–6 หลัก) ป้องกันหน้าตั้งค่า
- Session หมดอายุใน 10 นาที
- XSS protection ด้วย `escapeHtml()` ทุกจุดที่ render ข้อมูลจาก Sheets
- ใช้ `crypto.randomUUID()` สำหรับ ID generation

---

## ⚙️ ปรับแต่งระบบ

### เพิ่ม/แก้ไขเครื่อง
ไปที่หน้า **ตั้งค่า** → เพิ่มเครื่อง / แก้ไขชื่อ / ตั้งรอบ PM รายเครื่อง

### เปลี่ยนรอบ PM
- รายเครื่อง: หน้าตั้งค่า → ตาราง PM Cycle
- ทุกเครื่องพร้อมกัน: ใส่จำนวนวัน → "ใช้กับทุกเครื่อง"

### เปลี่ยน Theme
กดปุ่ม ☀️ / 🌙 มุมบนขวาของ Dashboard

---

## 🕐 กะการทำงาน

| กะ | เวลา |
|----|------|
| 🌅 กะเช้า | 08:30 – 20:30 |
| 🌙 กะดึก | 20:30 – 08:30 |

ระบบตรวจจับกะอัตโนมัติตามเวลาจริง และแจ้งเตือนเมื่อใกล้สิ้นกะแต่ยังมีเครื่องที่ยังไม่ PM

---

## 📊 ระดับความรุนแรงของปัญหา

| ระดับ | ความหมาย | สี |
|-------|----------|----|
| 1 | เล็กน้อย | 🟢 |
| 2 | ปานกลาง | 🟡 |
| 3 | รุนแรง | 🟠 |
| 4 | วิกฤต | 🔴 |

ปัญหาระดับ 4 จะแสดง **Critical Banner** สีแดงบน Dashboard และส่งแจ้งเตือนทันที

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (ES2020+)
- **Database**: Google Sheets via Google Apps Script
- **Charts**: Chart.js 4.4.1
- **Fonts**: Sarabun, IBM Plex Mono (Google Fonts)
- **Hosting**: GitHub Pages (Static)
- **Notifications**: Google Apps Script → Email / LINE Messaging API

---

## 📱 Mobile Version

`Hanger PM Mobile.html` — เวอร์ชัน Mobile-optimized สำหรับบันทึก PM บนสมาร์ทโฟน

---

## 🗒️ Version

`v2026-08-04` — ดูที่ตัวแปร `window.__HANGER_APP_VERSION__` ใน `app.js`

---

## 📄 License

Internal use — Hanger PM Team
