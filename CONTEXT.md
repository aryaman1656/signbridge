# SignBridge — Project Context File
# Last Updated: After admin management system implementation
# Use this file to resume work with a new AI session

---

## PROJECT OVERVIEW
SignBridge is a crowdsourced sign language gesture data collection system.
Hardware: ESP32 + 5 Flex Sensors + MPU6050
Goal: Collect labeled gesture data from users worldwide to train an ML model
that converts sign language to text and speech.

---

## TECH STACK
- Frontend:  React + Vite (port 3000)
- Backend:   FastAPI + Python (port 8000)
- Database:  MongoDB (local) → MongoDB Atlas (when deployed)
- Auth:      Google OAuth via @react-oauth/google + jwt-decode
- Charts:    Recharts
- Hosting:   Vercel (frontend) + Render (backend) — NOT YET DEPLOYED

---

## REPOSITORY
GitHub: https://github.com/aryaman1656/signbridge
Owner: aryaman1656 (Aryaman Pandey)
Main branches: main, dev
Current working branch: feature/frontend-collect

---

## DIRECTORY STRUCTURE
signbridge/
├── frontend/
│   └── collect/
│       ├── index.html                  (at root of collect/, NOT in public/)
│       ├── vite.config.js
│       ├── package.json
│       └── src/
│           ├── main.jsx                (wraps app with GoogleOAuthProvider)
│           ├── App.jsx                 (tab routing: Dashboard/History/Admin, uses user.isAdmin)
│           ├── styles/
│           │   └── index.css           (glassmorphism theme, dark/light CSS variables)
│           ├── context/
│           │   └── AuthContext.jsx     (Google auth, stores isAdmin+isSuperAdmin from backend)
│           ├── pages/
│           │   ├── LoginPage.jsx       (FULL MARKETING HOMEPAGE + Google login)
│           │   ├── HistoryPage.jsx     (user's gesture history + delete)
│           │   └── AdminPage.jsx       (admin dashboard + admin management panel)
│           ├── components/
│           │   ├── SerialConnect.jsx
│           │   ├── FlexPanel.jsx
│           │   ├── MPUPanel.jsx
│           │   ├── RecordPanel.jsx
│           │   └── ContribStats.jsx
│           ├── hooks/
│           │   ├── useSerial.js
│           │   └── useSensorBuffer.js  (rolling buffer + demo mode)
│           └── utils/
│               └── parser.js
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env                            (never commit)
│   ├── .env.example
│   ├── db/
│   │   ├── __init__.py
│   │   └── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── gesture.py
│   │   └── user.py
│   └── routes/
│       ├── __init__.py
│       ├── auth.py                     (login + admin management endpoints)
│       ├── gestures.py
│       └── stats.py                    (admin check uses MongoDB admins collection)
│
└── ml/                                 (empty, Phase 3)

---

## HOW TO RUN LOCALLY

### Backend (Terminal 1)
cd signbridge/backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000

### Frontend (Terminal 2)
cd signbridge/frontend/collect
npm run dev

### URLs
- Frontend:      http://localhost:3000
- Backend docs:  http://localhost:8000/docs

---

## ENVIRONMENT VARIABLES

### backend/.env
MONGO_URL=mongodb://localhost:27017
DB_NAME=signbridge
CORS_ORIGINS=http://localhost:3000

---

## GOOGLE OAUTH
Client ID: 912110345690-sjb2b0o6qu7j4pc63fi9abtcfca8ugqn.apps.googleusercontent.com
Set in: frontend/collect/src/main.jsx (GoogleOAuthProvider)
Backend verifies token in: backend/routes/auth.py
Packages: @react-oauth/google, jwt-decode (frontend), google-auth, requests (backend)

---

## ADMIN SYSTEM
Admins are stored in MongoDB "admins" collection — NOT hardcoded anymore.

Super Admin (hardcoded, can never be removed):
- aryamanpandey.cd25@rvce.edu.in
- Defined as SUPER_ADMIN in backend/routes/auth.py and backend/routes/stats.py

On first login, super admin is auto-inserted into admins collection.

isAdmin and isSuperAdmin flags are returned by POST /auth/google and stored in AuthContext.
App.jsx uses user.isAdmin to show/hide Admin tab.

Admin management UI is in AdminPage.jsx — only visible to super admin.
Super admin can add/remove other admins without redeploying.

---

## API ENDPOINTS

### Auth
POST   /auth/google              Register/login, returns isAdmin + isSuperAdmin
GET    /auth/me                  Get user profile
GET    /auth/is-admin?email=     Check if email is admin
GET    /auth/admins?requester_email=    List all admins (admin only)
POST   /auth/admin/add           Add admin {requester_email, target_email} (super admin only)
POST   /auth/admin/remove        Remove admin {requester_email, target_email} (super admin only)

### Gestures
POST   /gestures/                Save a recorded gesture
GET    /gestures/                List all gestures
GET    /gestures/mine?email=     List gestures for specific user
GET    /gestures/{id}            Get single gesture with samples
DELETE /gestures/{id}?email=     Delete gesture (owner only)

### Stats
GET    /stats/                   Global stats
GET    /stats/me?email=          Personal stats
GET    /stats/breakdown          Per-gesture counts
GET    /stats/admin?email=       Full admin stats (admin only)

---

## MONGODB COLLECTIONS
- users      — user profiles (email, name, photo, lastLogin, createdAt)
- gestures   — gesture recordings (gesture, samples, sampleCount, contributor, capturedAt)
- admins     — admin list (email, addedBy, addedAt, isSuperAdmin)

---

## ESP32 SERIAL DATA FORMAT
CSV: F1,F2,F3,F4,F5,AX,AY,AZ,GX,GY,GZ\n
Example: 512,489,601,390,450,0.12,-0.05,9.81,0.01,-0.02,0.00
FLEX_MIN=200, FLEX_MAX=700 in parser.js

---

## PLANNED ESP32 WIRING (hardware not yet arrived)
Flex: Thumb→GPIO34, Index→GPIO35, Middle→GPIO32, Ring→GPIO33, Pinky→GPIO25
MPU6050: VCC→3.3V, GND→GND, SDA→GPIO21, SCL→GPIO22

---

## HOMEPAGE SECTIONS (LoginPage.jsx)
Navbar → Hero → Live Stats → How It Works → Features → Team → FAQ → Login CTA → Footer
TO UPDATE TEAM: Edit TeamCard entries in LoginPage.jsx

---

## FEATURES COMPLETED
✅ Full marketing homepage
✅ Smooth scroll navbar
✅ Live global stats counters (animated)
✅ Glassmorphism UI dark/light theme
✅ Google OAuth login (real)
✅ Web Serial API ESP32 connection
✅ Live flex sensor bar meters
✅ Live MPU6050 line graphs
✅ Demo mode (simulated sensor data)
✅ Gesture recording with countdown
✅ POST gestures to MongoDB
✅ Personal contribution stats
✅ My History page (view + delete)
✅ Admin dashboard (charts, leaderboard, feed, timeline)
✅ Admin management (add/remove admins from UI)
✅ Super admin protection (cannot be removed)
✅ isAdmin/isSuperAdmin stored in AuthContext
✅ DB ONLINE/OFFLINE indicator
✅ Fallback JSON download if backend unreachable

---

## FEATURES NOT YET BUILT
⬜ ESP32 firmware (.ino) — waiting for hardware
⬜ ML model (Phase 3)
⬜ Live prediction page (Phase 4)
⬜ Deployment (Vercel + Render + MongoDB Atlas)
⬜ Download dataset as CSV/JSON for ML training
⬜ Real team names in homepage

---

## PYTHON PACKAGES (backend venv)
fastapi, uvicorn, motor, pymongo, pydantic, python-dotenv, google-auth, requests

## NPM PACKAGES (frontend)
react, react-dom, recharts, lucide-react, @react-oauth/google, jwt-decode, vite

---

## NOTES FOR NEXT SESSION
- Always run backend first, then frontend
- Check venv is activated before running backend
- .env NOT on GitHub — create manually
- node_modules gitignored — npm install after cloning
- index.html at frontend/collect/index.html (NOT in public/)
- LoginPage.jsx IS the homepage (not just login)
- Admin check uses MongoDB admins collection, not hardcoded list
- Super admin email hardcoded in TWO backend files: auth.py + stats.py
- isAdmin/isSuperAdmin come from backend on login, stored in AuthContext user object
