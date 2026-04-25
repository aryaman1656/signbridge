# SignBridge — Project Context File
# Last Updated: After Arduino Uno firmware
# IMPORTANT: Includes actual code snippets for critical files.

---

## PROJECT OVERVIEW
SignBridge is a crowdsourced sign language gesture data collection system.
Hardware: Arduino Uno (now) / ESP32 (later) + 5 Flex Sensors + MPU6050
Goal: Collect labeled gesture data to train a sign language → text/speech ML model.

---

## TECH STACK
- Frontend:  React + Vite (port 3000)
- Backend:   FastAPI + Python (port 8000)
- Database:  MongoDB (local) → MongoDB Atlas (when deployed)
- Auth:      Google OAuth via @react-oauth/google + jwt-decode
- Charts:    Recharts
- Hosting:   NOT YET DEPLOYED

---

## REPOSITORY
GitHub: https://github.com/aryaman1656/signbridge
Owner: aryaman1656 (Aryaman Pandey)
Google OAuth Client ID: 912110345690-sjb2b0o6qu7j4pc63fi9abtcfca8ugqn.apps.googleusercontent.com
Super Admin email: aryamanpandey.cd25@rvce.edu.in

---

## HOW TO RUN LOCALLY
Backend (Terminal 1):
  cd signbridge/backend
  venv\Scripts\activate
  uvicorn main:app --reload --port 8000

Frontend (Terminal 2):
  cd signbridge/frontend/collect
  npm run dev

URLs: http://localhost:3000 (frontend) | http://localhost:8000/docs (backend)

---

## ENVIRONMENT VARIABLES (backend/.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=signbridge
CORS_ORIGINS=http://localhost:3000

---

## COMPLETE DIRECTORY STRUCTURE
signbridge/
├── arduino/
│   └── signbridge_uno/
│       └── signbridge_uno.ino         (Arduino Uno firmware — 4 flex + MPU6050)
├── frontend/collect/
│   ├── index.html                     (at root, NOT in public/)
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                   (GoogleOAuthProvider wraps App only)
│       ├── App.jsx                    (AuthProvider + LanguageProvider wrap AppInner)
│       ├── styles/index.css           (glassmorphism CSS variables)
│       ├── config/deviceConfig.js     (Arduino=9600baud, ESP32=115200baud profiles)
│       ├── context/
│       │   ├── AuthContext.jsx        (Google auth, isAdmin, isSuperAdmin, userStats)
│       │   └── LanguageContext.jsx    (published languages, sessionLanguage, localStorage)
│       ├── pages/
│       │   ├── LoginPage.jsx          (full marketing homepage + Google login)
│       │   ├── HistoryPage.jsx        (gesture history, delete, suggest equivalent)
│       │   └── AdminPage.jsx          (dashboard + Languages/Words/Equivalents tabs)
│       ├── components/
│       │   ├── SerialConnect.jsx
│       │   ├── FlexPanel.jsx
│       │   ├── MPUPanel.jsx
│       │   ├── RecordPanel.jsx        (language + word dropdowns)
│       │   ├── ContribStats.jsx
│       │   └── LanguageSelector.jsx
│       ├── hooks/
│       │   ├── useSerial.js           (parses both Arduino F:|A:|G: and ESP32 JSON)
│       │   └── useSensorBuffer.js     (rolling buffer + demo mode)
│       └── utils/parser.js
├── backend/
│   ├── main.py                        (registers all 6 routers)
│   ├── requirements.txt
│   ├── .env                           (never commit)
│   ├── db/database.py
│   ├── models/gesture.py              (has signLanguage + word fields)
│   ├── models/user.py
│   └── routes/
│       ├── auth.py                    (Google verify + admin management)
│       ├── gestures.py                (saves signLanguage + word)
│       ├── stats.py                   (admin check via MongoDB admins collection)
│       ├── languages.py               (sign language CRUD, publish/unpublish)
│       ├── words.py                   (word list, base + language-specific)
│       └── equivalents.py             (suggest + admin review cross-language links)
└── ml/                                (empty, Phase 3)

---

## DEVICE SWITCHING SYSTEM
The UI has an Arduino ↔ ESP32 toggle in the header.
Config in: frontend/collect/src/config/deviceConfig.js

Arduino profile:
  baudRate: 9600
  flexMin: 0, flexMax: 1023   (10-bit ADC)

ESP32 profile:
  baudRate: 115200
  flexMin: 0, flexMax: 4095   (12-bit ADC)

useSerial.js parses both formats:
  Arduino: F:512,489,601,477,512|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10
  ESP32:   {"flex":[512,489,601,477,523],"ax":-0.12,"ay":9.78,...}

Lines starting with '#' are debug messages — parser ignores them silently.
Device choice saved to localStorage key: sb_device
Cannot switch device while a port is open (toggle is disabled).

---

## ARDUINO UNO WIRING
Flex Sensors (voltage divider — 47kΩ pull-down each):
  5V ──── [Flex Sensor] ──── Pin ──── [47kΩ] ──── GND
  Thumb  → A0
  Index  → A1
  Middle → A2
  Ring   → A3
  Pinky  → NOT CONNECTED (A4=SDA, A5=SCL on Uno — outputs placeholder 512)

MPU6050:
  VCC → 3.3V
  GND → GND
  SDA → A4
  SCL → A5
  AD0 → GND  (I2C address 0x68)

---

## ESP32 WIRING (for later when hardware arrives)
Flex Sensors (voltage divider — 47kΩ each):
  3.3V ──── [Flex Sensor] ──── Pin ──── [47kΩ] ──── GND
  Thumb  → GPIO 34
  Index  → GPIO 35
  Middle → GPIO 32
  Ring   → GPIO 33
  Pinky  → GPIO 25   (all 5 work on ESP32!)

MPU6050:
  VCC → 3.3V | GND → GND | SDA → GPIO 21 | SCL → GPIO 22

---

## MONGODB COLLECTIONS
- users             — email, name, photo, lastLogin, createdAt
- admins            — email, addedBy, addedAt, isSuperAdmin
- gestures          — gesture, samples, sampleCount, contributor, signLanguage, word, capturedAt
- sign_languages    — code, name, description, status, addedBy, addedAt, publishedAt
- gesture_words     — word, is_base, languages[], addedBy, addedAt
- gesture_equivalents — gesture_id_a, lang_a, gesture_id_b, lang_b, suggested_by, note, status

---

## API ENDPOINTS

### Auth
POST   /auth/google                    Verify Google token, return isAdmin+isSuperAdmin
GET    /auth/me?email=                 Get user profile
GET    /auth/admins?requester_email=   List admins
POST   /auth/admin/add                 {requester_email, target_email}
POST   /auth/admin/remove              {requester_email, target_email}

### Gestures
POST   /gestures/        {gesture, samples, contributor, signLanguage, word}
GET    /gestures/mine?email=
DELETE /gestures/{id}?email=

### Stats
GET    /stats/           Global stats
GET    /stats/me?email=  Personal stats
GET    /stats/admin?email=  Full admin stats

### Languages
GET    /languages/              Published only (trainers)
GET    /languages/all?email=    All incl drafts (admin)
POST   /languages/add           {email, code, name, description}
POST   /languages/publish       {email, code}
POST   /languages/unpublish     {email, code}
DELETE /languages/{code}?email=

### Words
GET    /words/?language=ASL
POST   /words/add        {email, word, is_base, languages[]}
DELETE /words/{word}?email=

### Equivalents
POST   /equivalents/suggest    {suggested_by, gesture_id_a, lang_a, gesture_id_b, lang_b, note}
GET    /equivalents/?email=&status=
POST   /equivalents/review     {email, equivalent_id, action: approve|reject}

---

## ADMIN SYSTEM
- Super admin hardcoded: aryamanpandey.cd25@rvce.edu.in (in auth.py + stats.py)
- All other admins in MongoDB "admins" collection
- isAdmin + isSuperAdmin returned by POST /auth/google
- Admin tab visible only when user.isAdmin === true
- Super admin sees Admin Management panel in Admin page

---

## PROVIDER WRAP ORDER
main.jsx:  GoogleOAuthProvider > App
App.jsx:   AuthProvider > LanguageProvider > AppInner

---

## FEATURES COMPLETED
✅ Full marketing homepage
✅ Glassmorphism UI dark/light theme
✅ Google OAuth login
✅ Arduino ↔ ESP32 device toggle in header
✅ Web Serial API (9600 baud Arduino, 115200 baud ESP32)
✅ Both serial formats parsed (F:|A:|G: and JSON)
✅ Live flex sensor bar meters + MPU6050 line graphs
✅ Demo mode
✅ Multi-language support (ASL, ISL, BSL etc.)
✅ Admin controls which languages are published
✅ Word list management
✅ Cross-language gesture equivalents
✅ Gesture recording with language + word
✅ Personal contribution stats
✅ History page (view, delete, suggest equivalent)
✅ Admin dashboard (charts, leaderboard, feed, timeline)
✅ Admin management (add/remove admins from UI)
✅ Arduino Uno firmware (4 flex sensors + MPU6050, 9600 baud)

---

## FEATURES NOT YET BUILT
⬜ ESP32 firmware (when hardware arrives)
⬜ ML model (Phase 3)
⬜ Live prediction page (Phase 4)
⬜ Deployment (Vercel + Render + MongoDB Atlas)
⬜ Download dataset as CSV/JSON
⬜ Real team names in homepage

---

## NPM PACKAGES
react, react-dom, recharts, lucide-react, @react-oauth/google, jwt-decode, vite

## PYTHON PACKAGES
fastapi, uvicorn, motor, pymongo, pydantic, python-dotenv, google-auth, requests

---

## KNOWN ISSUES / NOTES
- Google login fails with "origin not allowed" if localhost:3000 not in Google Cloud Console
  Fix: console.cloud.google.com → Credentials → OAuth Client → add http://localhost:3000
- Backend must run BEFORE opening frontend
- node_modules and venv should NEVER be uploaded — only src files needed
- index.html at frontend/collect/index.html (NOT in public/)
- First time setup: go to /docs, publish at least ASL via POST /languages/publish
  Otherwise RecordPanel language dropdown will be empty
- Arduino Uno: only 4 flex sensors work (A4=SDA, A5=SCL taken by I2C)
  Pinky outputs placeholder value 512
- Old gestures without signLanguage field display as ASL in UI
