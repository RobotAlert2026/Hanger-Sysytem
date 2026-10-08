# ⚙️ Hanger PM System

ระบบบริหารจัดการ Preventive Maintenance (PM) สำหรับเครื่อง Hanger  
พัฒนาด้วย Vanilla HTML/CSS/JavaScript เชื่อมต่อ Firebase Firestore เป็น Database  
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
    ├── Firebase Firestore
    │   ├── machines
    │   ├── pmRecords
    │   ├── issues
    │   └── settings
    │
    └── Google Apps Script (เฉพาะการส่ง Email/LINE)
```

ข้อมูลหลักเก็บใน **Firebase Firestore** ส่วน Google Apps Script ยังคงใช้เป็น backend สำหรับส่ง Email/LINE

---

## 🚀 การติดตั้ง

### 1. ตั้งค่า Firebase Firestore

1. เปิด Firebase Console ของโปรเจกต์ `hanger-system-b67f8`
2. ไปที่ **Build → Firestore Database** แล้วสร้างฐานข้อมูล
3. ไปที่ **Build → Authentication → Sign-in method** แล้วเปิด **Google**
4. ใน **Authentication → Settings → Authorized domains** เพิ่มโดเมนที่ใช้โฮสต์เว็บ สำหรับ VS Code Go Live ให้เปิดเว็บด้วย `localhost` (หน้าเว็บจะเปลี่ยนจาก `127.0.0.1` ให้อัตโนมัติ)
5. ตั้งค่า Firestore Rules โดยคัดลอก [firestore.rules](./firestore.rules) ไปที่แท็บ **Rules** แล้ว Publish

หน้า Settings และการแก้ไขข้อมูล `machines`/`settings` อนุญาตเฉพาะ Google account ที่ยืนยันอีเมลแล้วและตรงกับ Gmail ผู้ดูแล `robotalert.notification2026@gmail.com` หากเปลี่ยนผู้ดูแล ต้องแก้ทั้ง `FIREBASE_SETTINGS_ADMINS` ใน `desktop.data.js` และอีเมลใน [firestore.rules](./firestore.rules) ให้ตรงกันก่อน Publish Rules ใหม่ ส่วนข้อมูล `pmRecords` และ `issues` ยังคงอ่าน/เขียนสาธารณะตามที่เลือกไว้

### 2. การเชื่อมต่อ Google Apps Script

Google Apps Script เดิมยังต้อง Deploy และเข้าถึงได้สำหรับส่ง Email/LINE แจ้งเตือนเท่านั้น ข้อมูลเครื่องจักร, PM, ปัญหา และการตั้งค่าใช้งาน Firebase Firestore แล้ว

สามารถกำหนด URL ของ Google Apps Script สำหรับการแจ้งเตือนผ่าน `window.HANGER_GS_URL` หรือ query string `?gs_url=<URL>` ได้

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
- **Database**: Firebase Firestore
- **Charts**: Chart.js 4.4.1
- **Fonts**: Sarabun, IBM Plex Mono (Google Fonts)
- **Hosting**: GitHub Pages (Static)
- **Notifications**: Google Apps Script → Email / LINE Messaging API

---

## 📱 Mobile Version

`Hanger PM Mobile.html` — เวอร์ชัน Mobile-optimized สำหรับบันทึก PM บนสมาร์ทโฟน

---

## 🗒️ Version

`v2026-10-09` — ดูที่ตัวแปร `window.__HANGER_APP_VERSION__` ใน `index.html`

---

## 📄 License

Internal use — Hanger PM Team
