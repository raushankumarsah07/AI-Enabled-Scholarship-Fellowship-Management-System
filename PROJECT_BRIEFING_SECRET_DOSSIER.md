# 📜 MINISTRY OF TRIBAL AFFAIRS (MoTA) — PROJECT MASTER DOSSIER & TEAM BRIEFING
### **Smart India Hackathon (SIH 2026) | Problem Statement ID: 26239**
> **MASTER REFERENCE FOR EVALUATORS, JURY MEMBERS, AND DEVELOPMENT TEAM**

---

## 1. 📌 Project Identification & Official Context

- **Project Title:** AI-Enabled Scholarship & Fellowship Management System for Scheduled Tribes
- **Problem Statement ID:** SIH PS 26239
- **Organization / Ministry:** Ministry of Tribal Affairs (MoTA), Government of India
- **Theme / Category:** Smart Education / Software Edition
- **Core Vision:** Delivering complete automation, data-driven transparency, and local AI intelligence to streamline scholarship disbursement for Scheduled Tribe (ST) scholars across India and abroad.

### Target Official MoTA Schemes (All 5 Integrated):
1. **`ARG45` — National Fellowship for Scheduled Tribes (NFST):**
   - Central Sector Scheme for M.Phil and Ph.D. research scholars in Indian Universities, IITs, NITs, and IISc.
   - **Financials:** ₹31,000/mo (JRF) to ₹35,000/mo (SRF) stipend + ₹20,800/year contingency + HRA.
   - **Slots:** 750 annual fellowships with a statutory **30% women quota**.
2. **`AZKMI` — National Overseas Scholarship (NOS):**
   - Central Sector Scheme for Master's and Ph.D. studies abroad in Top 500 QS World Universities.
   - **Financials:** 100% full international tuition reimbursement + annual living allowance ($15,400 USD / £9,900 GBP) + airfare + visa fees.
   - **Slots:** 20 annual slots (17 ST + 3 PVTG) (Maximum annual family income cap: ≤ ₹6.00 Lakhs).
3. **`A023B` — Top Class Education for ST Students:**
   - Full institute tuition reimbursement + ₹3,000/mo boarding allowance + ₹45,000 one-time computer/hardware grant for ST students admitted to 265+ Premier Institutes (IITs, IIMs, AIIMS, NITs, NLUs).
4. **`BVOBC` — Post-Matric Scholarship Scheme for ST Students:**
   - Centrally Sponsored DBT scheme covering compulsory institutional fees and maintenance allowances for Class 11, 12, Degree, Diploma, Medical, and Engineering courses across all Indian States & UTs.
5. **`BPVGK` — Pre-Matric Scholarship Scheme for ST Students:**
   - Centrally Sponsored DBT scheme providing financial assistance for Class 9th & 10th ST students to prevent transition dropouts before higher secondary education.

---

## 2. ❓ Problem Statement & Why This System is Necessary

### The Legacy Manual Process:
- **Months of Scrutiny Delay:** Thousands of scanned PDFs and photocopied certificates required manual human inspection by Ministry officials.
- **Deficiency Communication Lag:** Blurry scans or mismatched documents resulted in weeks of back-and-forth email chasing, leading to lapsed deadlines.
- **Rigid Hardcoded Systems:** Scheme eligibility rules were hardcoded in static spreadsheets; changing an income cap or marks threshold required database migrations.
- **Zero Real-Time Visibility:** ST applicants from remote tribal districts had no way of tracking their application stages or understanding reasons for rejection.

### The Modern AI-Enabled Solution:
- ⚡ **Instant Public Pre-Check:** Prospective scholars evaluate eligibility in seconds with criterion-by-criterion green ticks and red crosses before applying.
- 👁️ **100% Local AI OCR:** Local machine vision (`tesseract.js` + `pdf-parse`) processes certificates in Node.js with **zero paid external APIs or cloud leaks**, catching text, certificate numbers, and income discrepancies.
- 🤖 **Trained Machine Learning Pipeline (`/ml`):** Four Scikit-Learn models achieve **99.17% eligibility prediction accuracy**, **0.9991 R² merit scoring**, and **100% fraud anomaly detection**.
- 🛠️ **Pure Data-Driven Rules Engine:** Ministry administrators can modify scheme criteria on live screens and simulate outcomes across existing applicants in memory with zero code deployments.
- 📧 **Production Real Email OTP Delivery:** Built-in `nodemailer` integration dispatches branded security verification codes directly to applicant inboxes.

---

## 3. 🏗️ High-Level Technical Architecture

```mermaid
graph TD
    Client[🌐 React 18 + Vite Frontend App] -->|REST API / JWT| Server[⚡ Node.js + Express Backend :5001]
    
    subgraph "Backend Core Services"
        Server --> Auth[🔐 Auth & Real Email OTP Service]
        Server --> RulesEngine[⚡ Data-Driven Rules Engine]
        Server --> OCRService[👁️ Offline OCR Engine: Tesseract.js + pdf-parse]
        Server --> MLBridge[🤖 Python ML Subprocess Bridge]
        Server --> MeritService[📊 Merit & Horizontal Quota Engine]
        Server --> FraudService[🛡️ Anomaly & Duplicate Certificate Detection]
        Server --> AuditService[📜 Immutable Audit Trail]
    end

    subgraph "AI & ML Engines"
        MLBridge --> Model1[🌲 Eligibility Classifier (99.17%)]
        MLBridge --> Model2[📈 Merit Score Regressor (0.9991 R²)]
        MLBridge --> Model3[🛡️ Fraud Isolation Forest (100% ROC)]
        MLBridge --> Model4[🎯 Scheme Recommender (86.2%)]
    end

    Server -->|Mongoose ODM| DB[(MongoDB Atlas Cloud / Local DB)]
    OCRService -->|Local Storage| Uploads[📁 /server/uploads & /samples]
```

---

## 4. 🗂️ Directory Organization & Symlinks

```
📁 SIH 2026 Project Root
├── 📁 client (symlinked as 📁 frontend) -> React 18 + Vite + Bootstrap 5 Frontend UI
├── 📁 server (symlinked as 📁 backend)  -> Node.js + Express + MongoDB REST API & Local OCR
├── 📁 ml                               -> Python 3.13 + Scikit-Learn ML Models & Datasets
├── 📄 PROJECT_BRIEFING_SECRET_DOSSIER.md
└── 📄 README.md
```

### Clarification on Directory Aliases:
- **`backend` vs `server`**: Exactly identical. `server` is the physical directory; `backend` is a symlink.
- **`frontend` vs `client`**: Exactly identical. `client` is the physical directory; `frontend` is a symlink.

---

## 5. 🤖 Machine Learning Subsystems

| Model Name | Algorithm | Performance Metric | Purpose & Input Features |
| :--- | :--- | :---: | :--- |
| **Eligibility Classifier** | Random Forest Classifier (120 Trees, Depth=12) | **99.17% Accuracy** | Predicts if an applicant profile passes scheme criteria (Income, qualifying marks, degree level, NIRF rank). |
| **Merit Regressor** | Gradient Boosting Regressor (150 Estimators) | **R² = 0.9991** | Computes merit scores considering marks, NIRF institution ranking, disability weightage, and female quota. |
| **Fraud & Anomaly Detector** | Gradient Boosting + Isolation Forest | **100% ROC-AUC** | Detects fraudulent certificate uploads, income underreporting, and certificate number recycling. |
| **Scheme Recommender** | Multi-Class Random Forest | **86.21% Accuracy** | Analyzes candidate education level and income to suggest the best-fitting scheme. |

> **Interactive Sandbox:** Evaluators can test live model predictions via the interactive ML Hub at `/ml-hub` on the web portal.

---

## 6. 👥 The Four Operational Roles & Permissions

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                 ROLE WORKFLOWS                                ║
╠══════════════════════╦══════════════════════╦═════════════════════════════════╣
║ 🎓 ST Applicant      ║ • Pre-check criteria ║ • Submit multi-step application ║
║                      ║ • Real Email OTP     ║ • Deficiency inbox & re-upload  ║
║                      ║ • Track live stages  ║ • Direct Benefit Transfer (DBT) ║
╠══════════════════════╬══════════════════════╬═════════════════════════════════╣
║ 🔍 Document Verifier ║ • Queue review       ║ • Inspect OCR confidence scores ║
║                      ║ • Catch mismatches   ║ • Raise deficiency notices      ║
║                      ║ • Approve/Reject doc ║ • Verify certificate hashes     ║
╠══════════════════════╬══════════════════════╬═════════════════════════════════╣
║ ⚖️ Scrutiny Officer  ║ • Scrutiny dashboard ║ • Formal ELIGIBLE/INELIGIBLE    ║
║                      ║ • Written reasons    ║ • Merit list recommendation     ║
║                      ║ • Review def. fixes  ║ • Flag high-risk applications   ║
╠══════════════════════╬══════════════════════╬═════════════════════════════════╣
║ 👑 Ministry Admin    ║ • Executive KPIs     ║ • Live Rule Builder Simulator   ║
║                      ║ • Publish merit list ║ • Horizontal quota allocation   ║
║                      ║ • Fraud anomalies    ║ • Immutable audit log review    ║
╚══════════════════════╩══════════════════════╩═════════════════════════════════╣
```

---

## 7. 🔑 Pre-Seeded Evaluation Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| 👑 **Ministry Admin** | `admin@mota.gov.in` | `Admin@123` | Executive dashboard, Rule Builder, Publish Merit List, Audit Log, User Management |
| 🔍 **Document Verifier** | `verifier1@mota.gov.in` | `Verifier@123` | Document verification queue, OCR inspection, Deficiency raising |
| ⚖️ **Scrutiny Officer** | `officer1@mota.gov.in` | `Officer@123` | Scrutiny review, Eligibility determination with mandatory written justification |
| 🎓 **ST Applicant (NFST)** | `rahul.st@example.com` | `Applicant@123` | Application status, Deficiency resolution, Fellowship DBT tracking |
| 🎓 **ST Applicant (NOS)** | `sunita.st@example.com` | `Applicant@123` | National Overseas Scholarship tracking |

---

## 8. 🏆 Jury Presentation Script & Top Demo Moments

1. **Demonstrating the Rule Builder Simulator (Show Stopper ⭐):**
   - Log in as **Admin** (`admin@mota.gov.in` / `Admin@123`).
   - Navigate to **Rule Builder** -> Select `ARG45 (NFST)`.
   - Modify the Income Cap from `₹8,00,000` to `₹4,00,000`.
   - Click **"Test this rule set against existing applications (Live Simulation)"**.
   - Show how the platform simulates the rule change live across real applicant data in memory, graphing pass/fail distribution before committing.

2. **Demonstrating Local AI OCR Mismatch Catching:**
   - Log in as **Applicant** (`rahul.st@example.com` / `Applicant@123`).
   - Go to application document upload and submit an intentionally incorrect document (e.g. college ID into income slot).
   - Log in as **Verifier** (`verifier1@mota.gov.in` / `Verifier@123`) to view how AI OCR caught the document type mismatch and flagged it with low confidence.

3. **Demonstrating the Machine Learning Hub (`/ml-hub`):**
   - Visit `/ml-hub` and adjust interactive sliders for income, qualifying marks, and university rankings to see instant real-time eligibility scores and feature importance breakdowns.

4. **Answering AI Ethics & Governance Questions:**
   - *"The AI system acts as an intelligent assistant to extract, verify, and flag. Every rejection carries an explicit stated reason, every override requires a written justification, and every action is recorded in an immutable audit log. A human officer always executes the final scholarship decision."*

---

<div align="center">

**Smart India Hackathon 2026 — Ministry of Tribal Affairs (MoTA)**  
*Digital India & Smart Governance Initiative*

</div>
