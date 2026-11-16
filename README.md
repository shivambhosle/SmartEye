# SmartEye — AI-Powered Civic Grievance & Smart City Redressal Platform

> An end-to-end full-stack civic reporting and governance ecosystem powered by **Dual-Engine AI** (PyTorch Edge CNN + Google Gemini Multimodal Vision), **Geospatial Duplicate Detection**, **Reverse-Geocoded Street Addresses**, **Anti-Spoof Verification**, and **Automated Departmental Dispatch**.

---

## 🌟 Key Highlights & Features

1. **Dual-Tier AI Vision Engine**:
   - **Local Edge Inference (PyTorch + FastAPI)**: Custom-trained MobileNetV2 achieving **91.7% validation accuracy** across **7 real-world civic categories** (`issue_classifier.pt`). Serves real-time predictions in under 50ms to auto-fill complaint categories.
   - **Cloud Multimodal Vision (Google Gemini Vision)**: Semantic scene reasoning, damage severity estimation (`low`, `medium`, `high`, `critical`), and automated anti-spoofing screen detection.
2. **7 Canonical Civic Issue Categories**:
   - **Road & Public Infrastructure**: Potholes, road cave-ins, and cracked pavement.
   - **Street Lighting**: Damaged electrical poles, exposed wiring, and dark streetlights.
   - **Waste & Sanitation**: Overflowing garbage bins, illegal dumping, and solid waste.
   - **Water & Drainage**: Urban waterlogging, blocked storm drains, and open manholes.
   - **Trees & Green Infrastructure**: Fallen trees, hazardous hanging branches, and storm blockages.
   - **Public Property & Anti-Vandalism**: Damaged road signs and defaced public walls/graffiti.
   - **Illegal Parking**: Road and pavement blockages.
   - *(Plus `other_civic_issue` as a manual fallback for general municipal triage).*
3. **Dual-Mode Photo Evidence & Anti-Spoofing**:
   - **Verified Live Camera Capture**: Direct hardware camera input (`capture="environment"`) for authentic on-site verification.
   - **Gallery Upload**: Fallback for offline or passenger reports.
   - Gemini Vision inspects image pixel boundaries and screen patterns to flag suspected screen photos or digital re-photographing.
4. **Human Street Addresses via Reverse-Geocoding**:
   - Integrated OpenStreetMap Nominatim reverse-geocoding automatically converts raw GPS coordinates into human-readable street names and neighborhoods across citizen and admin portals.
5. **Deterministic Municipal Department Routing**:
   - Backend automatically routes grievances directly into designated municipal directorate queues:
     - `ROAD`: Roads & Public Works Department
     - `ELECTRICAL`: Electrical & Public Lighting
     - `WASTE`: Solid Waste Management & Sanitation
     - `WATER_DRAINAGE`: Water Supply & Drainage Authority
     - `GARDEN`: Garden & Tree Authority
     - `PUBLIC_PROPERTY`: Public Property & Municipal Maintenance
     - `TRAFFIC`: Traffic Management & Enforcement
6. **Geospatial Duplicate Issue Detection & Community Upvoting**:
   - Computes proximity using the **Haversine Formula** to detect active issues within a **60-meter radius**.
   - Proactive UI alert allows citizens to 1-click support existing nearby reports, avoiding duplicate tickets and escalating repair urgency.
7. **Anti-Bot & Transactional Notification System**:
   - IP-based rate limiting on authentication and reporting endpoints.
   - Disposable email blacklist matching (blocking temporary inboxes).
   - 6-digit cryptographic email OTP verification on registration.
   - Multi-channel alerts: Transactional registration emails + in-app notification bell with live unread badge counters.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite 5, Tailwind CSS, React Router DOM v6, Leaflet & React-Leaflet, Lucide React
* **Backend**: Node.js, Express 5, Mongoose 8, JWT, Bcrypt, Multer, Nodemailer, Express-Rate-Limit, Crypto
* **Database**: MongoDB (Compound 2D Geospatial Indexes)
* **AI & Machine Learning**: Python 3.12, PyTorch 2.x, Torchvision (MobileNetV2 Transfer Learning), FastAPI, Uvicorn, Google Gemini Vision SDK

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local Community Server or free MongoDB Atlas cluster)
- [Python](https://www.python.org/) (v3.10+ with PyTorch and FastAPI)

---

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in `server/` (refer to `.env.example`):
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/smarteye
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_here

# Outgoing Email Notifications (Gmail / SMTP)
SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password
SMTP_FROM_NAME=SmartEye Civic Care
```

Start the backend server:
```bash
npm run dev
```
Server runs on: `http://localhost:3000`

---

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

---

### 4. Local AI Inference Service
The pre-trained 7-category classifier (`issue_classifier.pt`) is bundled in `ai-training/`:
```bash
cd ai-training
pip install -r requirements.txt
python -m uvicorn serve:app --reload --port 8001
```
FastAPI runs on: `http://127.0.0.1:8001` (Interactive docs: `http://127.0.0.1:8001/docs`)

To retrain or fine-tune the model with custom datasets:
```bash
python train.py
```

---

## 📂 Project Structure

```
smarteye/
├── frontend/               # React 18 + Vite Client
│   ├── src/
│   │   ├── components/     # Navbar, LocationPicker, Badges, ProtectedRoutes
│   │   ├── context/        # CitizenAuthContext & StaffAuthContext
│   │   ├── pages/          # Home, Report, Dashboard, AdminDashboard, AdminMap, Login, Signup
│   │   └── lib/            # API client wrapper
├── server/                 # Express 5 REST API Backend
│   ├── src/
│   │   ├── config/         # Database connection & Department routing matrix
│   │   ├── middleware/     # Auth (JWT), Rate limiting, Multer upload
│   │   ├── models/         # User, Issue, Notification Mongoose schemas
│   │   ├── routes/         # auth, issues, vision, notifications
│   │   ├── services/       # Gemini AI Vision & Nodemailer service
│   │   └── utils/          # Security (OTP, Turnstile, Disposable email check)
│   └── uploads/            # Civic issue photo storage
└── ai-training/            # PyTorch MobileNetV2 Local Classifier
    ├── train.py            # Transfer learning training pipeline (80/20 split, WeightedRandomSampler)
    ├── serve.py            # FastAPI inference HTTP microservice
    ├── predict.py          # Standalone CLI test script
    └── issue_classifier.pt # Trained 7-category model checkpoint (8.75 MB)
```

---

## 🔒 Security & Quality Assurance
- **Passswords**: 10 rounds salted bcrypt hashing.
- **Access Control**: Role-based routing (`citizen` vs `admin`) with signed JWT claims.
- **Upload Hygiene**: Randomized UUID filenames to prevent path traversal.
- **Secret Isolation**: All credentials isolated to `.env` and strictly git-ignored.
