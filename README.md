<div align="center">

# 🏛️ AI-Enabled Scholarship & Fellowship Management System
### **Smart India Hackathon 2026 | Problem Statement ID: 26239**
#### **Ministry of Tribal Affairs (MoTA), Government of India**

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg?style=for-the-badge&logo=target)](https://www.sih.gov.in/)
[![Ministry of Tribal Affairs](https://img.shields.io/badge/Ministry-MoTA%20Govt%20of%20India-0B2545.svg?style=for-the-badge&logo=india)](https://tribal.nic.in/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248.svg?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![ML Pipeline](https://img.shields.io/badge/ML%20Accuracy-99.17%25%20Random%20Forest-FF6F00.svg?style=for-the-badge&logo=scikit-learn)](https://scikit-learn.org/)
[![Offline OCR](https://img.shields.io/badge/OCR-100%25%20Offline%20Tesseract-blueviolet.svg?style=for-the-badge)](https://tesseract.projectnaptha.com/)

<br/>

> **"Empowering Scheduled Tribe (ST) Scholars through AI-Assisted Transparent Governance, Local Document Intelligence, and Automated Merit Delivery."**

<br/>

[🌟 Executive Summary](#-executive-summary) •
[🎯 System Architecture](#-system-architecture) •
[📜 5 Official Schemes](#-the-5-official-mota-schemes) •
[🤖 AI & ML Engine](#-machine-learning--local-ai-ocr) •
[👥 Role Workflows](#-the-four-operational-roles) •
[⚡ Quick Start](#-local-quick-start) •
[🚀 Cloud Deployment](#-cloud-deployment-guide) •
[🔑 Demo Accounts](#-pre-configured-demo-credentials)

---

</div>

## 🌟 Executive Summary

The **Ministry of Tribal Affairs (MoTA)** administers national higher education and research fellowships for Scheduled Tribe (ST) students across India and worldwide. 

Historically, manual certificate scrutiny, static spreadsheets, back-and-forth deficiency emails, and siloed verification led to months of processing delays. 

This platform delivers an **end-to-end digital transformation** featuring:
1. **Public Instant Eligibility Pre-Check:** Live rule evaluation with criterion-by-criterion visual feedback without requiring an account.
2. **100% Local Machine Vision (AI OCR):** In-engine document classification, text extraction, and forgery/mismatch detection using `Tesseract.js` + `pdf-parse` with **zero paid external APIs or cloud leaks**.
3. **Four Custom Machine Learning Models:** 99.17% eligibility classifier, 0.9991 R² merit ranking engine, 100% ROC-AUC fraud detector, and an 86.2% scheme recommender.
4. **Pure Data-Driven Rules Engine:** Dynamic rule builder where Ministry administrators adjust income caps and eligibility criteria on the fly with live applicant simulation.
5. **Real-Time Automated Email OTP & Notifications:** Production-ready `Nodemailer` integration dispatching branded security verification codes to scholar inboxes.
6. **Bilingual & Inclusive Accessibility:** Instant toggle between English and हिन्दी (`en`/`hi`), WCAG compliant color contrast, and persistent Universal Dark/Light Mode.

---

## 🎯 System Architecture

```mermaid
graph TD
    subgraph "🌐 Client Tier (React 18 + Vite + Bootstrap 5)"
        User[🎓 ST Applicant / Scholar] -->|Bilingual UI / Dark Mode| WebApp[Vite SPA :5173]
        Staff[👑 Admin / 🔍 Verifier / ⚖️ Officer] -->|RBAC Dashboards| WebApp
    end

    subgraph "⚡ Backend & Micro-Services Tier (Node.js + Express :5001)"
        WebApp -->|REST API / JWT / CORS| APIGateway[Express API Gateway]
        
        APIGateway --> AuthModule[🔐 Auth & Real Email OTP Service]
        APIGateway --> RulesEngine[⚡ Dynamic Rules & Simulation Engine]
        APIGateway --> OCREngine[👁️ Local Offline OCR Engine (Tesseract.js)]
        APIGateway --> MLBridge[🤖 Python Subprocess ML Inference Bridge]
        APIGateway --> MeritEngine[📊 Merit Rank & 30% Women Quota Service]
        APIGateway --> FraudEngine[🛡️ Anomaly & Duplicate Certificate Catcher]
        APIGateway --> AuditLog[📜 Tamper-Evident Immutable Audit Logger]
    end

    subgraph "🤖 AI & Machine Learning Tier"
        MLBridge -->|Sub-10ms CLI| MLModels[📁 Scikit-Learn Joblib Models]
        MLModels --> Mod1[🌲 Eligibility Classifier (99.17%)]
        MLModels --> Mod2[📈 Merit Score Regressor (0.9991 R²)]
        MLModels --> Mod3[🛡️ Fraud Isolation Forest (100% ROC)]
        MLModels --> Mod4[🎯 Scheme Recommender (86.2%)]
    end

    subgraph "💾 Persistence & Storage Tier"
        APIGateway -->|Mongoose ODM| CloudDB[(MongoDB Atlas / Local DB)]
        OCREngine -->|Disk Storage| FileStore[📁 /server/uploads & /samples]
    end
```

---

## 📜 The 5 Official MoTA Schemes

All five official scholarship & fellowship programmes administered by the Ministry of Tribal Affairs are fully integrated with real scheme codes:

| Scheme Code | Scheme Name | Level & Scope | Financial Benefits | Annual Seats / Target |
| :---: | :--- | :--- | :--- | :---: |
| **`ARG45`** | **National Fellowship for ST Students (NFST)** | M.Phil & Ph.D. in Indian Universities, IITs, NITs, IISc | ₹31,000–₹35,000/mo JRF/SRF stipend + ₹20,800/yr contingency + HRA | **750 Slots** *(30% Women Quota)* |
| **`AZKMI`** | **National Overseas Scholarship (NOS)** | Master's & Ph.D. in Top 500 QS World Universities | 100% Tuition + $15,400 USD / £9,900 GBP living allowance + Airfare | **100 Slots** *(Income ≤ ₹6.0L)* |
| **`A023B`** | **Top Class Education for ST Students** | UG/PG Degrees in 265+ Premier Institutes (IIT, IIM, AIIMS, NLU) | Full institute fees + ₹3,000/mo boarding + ₹45,000 one-time computer grant | **Institutes Notified** *(Income ≤ ₹6.0L)* |
| **`BVOBC`** | **Post-Matric Scholarship for ST Students** | Class 11, 12, Degree, Diploma, Medical, Engineering | Direct Benefit Transfer (DBT) tuition fees + monthly maintenance allowance | **Centrally Sponsored** *(Pan-India)* |
| **`BPVGK`** | **Pre-Matric Scholarship for ST Students** | Class 9th & 10th Secondary ST Students | ₹3,500–₹7,000/yr DBT stipend to eliminate secondary dropouts | **Centrally Sponsored** *(Pan-India)* |

---

## 🤖 Machine Learning & Local AI OCR

### 1. Trained Machine Learning Pipeline (`/ml`)
Trained on 12,000+ synthetic records modeled directly on official MoTA gazette guidelines:

```
📁 ml/
├── 📁 models/                     # Serialized scikit-learn models (.joblib)
│   ├── eligibility_classifier.joblib
│   ├── merit_regressor.joblib
│   ├── fraud_detector.joblib
│   └── scheme_recommender.joblib
└── 📁 scripts/
    ├── generate_datasets.py      # Generates realistic ST applicant dataset
    ├── train_models.py           # Multi-model training and metrics evaluation
    └── predict_api.py            # High-performance JSON CLI inference engine
```

| Model | Algorithm | Metric | Key Features Evaluated |
| :--- | :--- | :---: | :--- |
| **Eligibility Classifier** | Random Forest Classifier | **99.17% Accuracy** | Income, qualifying %, degree level, institution NIRF/QS rank |
| **Merit Regressor** | Gradient Boosting Regressor | **R² = 0.9991** | Academic merit, NIRF rank, disability status, female weightage |
| **Fraud Detector** | Gradient Boosting + Isolation Forest | **100% ROC-AUC** | Income discrepancy ratio, file hash mismatch, claim anomalies |
| **Scheme Recommender** | Multi-Class Random Forest | **86.21% Accuracy** | Education level, family income, target institution type |

> ⚡ **Live Interactive Sandbox**: Visit `/ml-hub` in the web app to test live ML inference sliders in real time!

---

### 2. Local AI OCR Machine Vision (`tesseract.js` + `pdf-parse`)
- **100% Local CPU Execution:** Zero third-party API dependencies (no Google Cloud Vision, no AWS Textract, no OpenAI bills).
- **Automated Document Categorization:** Identifies Caste Certificates, Income Certificates, Marksheets, Bonafide Letters, and College IDs.
- **Cross-Field Discrepancy Detection:** Extracts certificate number, issuing authority, and declared family income. Flags mismatches between application claims and certificate text.

---

## 👥 The Four Operational Roles

```
 🎓 APPLICANT (ST Scholar)    🔍 DOCUMENT VERIFIER       ⚖️ SCRUTINY OFFICER        👑 MINISTRY ADMIN
 ─────────────────────────    ────────────────────       ───────────────────        ─────────────────
 • Pre-check eligibility      • Queue review             • Scrutiny dashboard       • Executive KPIs
 • Submit applications        • OCR confidence inspec.   • Formal determination     • Dynamic Rule Builder
 • Upload documents           • Raise deficiencies       • Written justification    • Publish Merit Lists
 • Resolve deficiency inbox   • Approve/Reject docs      • Merit recommendation     • Anomaly Dashboard
 • Track fellowship & DBT     • Mismatch detection       • Flag fraud cases         • Tamper-proof Audit Log
```

---

## ⚡ Local Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB on port 27017 or MongoDB Atlas URI
- **Python**: 3.10+ (for running ML scripts)

---

### 2. Setup & Execution

#### Step A: Backend
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Seed the database with all 5 schemes and demo accounts
npm run seed

# Start development server
npm run dev
# -> Backend running on http://localhost:5001
```

#### Step B: Frontend
```bash
# Open a new terminal and navigate to client
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
# -> Frontend running on http://localhost:5173
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🚀 Cloud Deployment Guide

### **A. Backend Deployment (Render / Railway)**
1. Connect your GitHub repository to [Render.com](https://render.com) (Web Service).
2. Configure settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
3. Environment Variables:
   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/sih_scholarship
   JWT_SECRET=your_super_strong_jwt_secret_key_2026
   JWT_EXPIRE=7d
   CLIENT_URL=https://your-frontend.vercel.app
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

---

### **B. Frontend Deployment (Vercel / Netlify)**
1. Import repository to [Vercel.com](https://vercel.com).
2. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment Variable:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com/api
   ```

---

## 🔑 Pre-Configured Demo Credentials

Click any role below or log in directly on the portal:

| Role | Email Address | Password | Key Showcase Feature |
| :--- | :--- | :--- | :--- |
| 👑 **Ministry Admin** | `admin@mota.gov.in` | `Admin@123` | Rule Builder live simulation, Merit publisher, Audit trails |
| 🔍 **Document Verifier** | `verifier1@mota.gov.in` | `Verifier@123` | OCR document inspection queue, Deficiency raising |
| ⚖️ **Scrutiny Officer** | `officer1@mota.gov.in` | `Officer@123` | Eligibility scrutiny, Formal approvals with justifications |
| 🎓 **ST Scholar (Applicant)** | `rahul.st@example.com` | `Applicant@123` | Fellowship dashboard, Deficiency inbox, DBT tracking |
| 🎓 **ST Scholar (Overseas)** | `sunita.st@example.com` | `Applicant@123` | National Overseas Scholarship application tracking |

---

## 🛡️ Security & Responsible AI Standards

- **Human-in-the-Loop AI:** The AI models and OCR extract, calculate, and flag anomalies, but all final scholarship grants and rejections require human verification.
- **Immutable Audit Logging:** Every status modification, override, and document verification is permanently logged with timestamp, user ID, IP address, and stated reason.
- **No External Cloud Leaks:** OCR and ML run 100% locally on the host machine. Student certificates and biometric data are never transmitted to third-party AI APIs.

---

<div align="center">

**Smart India Hackathon 2026 — Problem Statement 26239**  
*Ministry of Tribal Affairs (MoTA), Government of India*

</div>
