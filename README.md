# 🌾 Vaani Sahayak (वाणी सहायक) — AI-Powered Multilingual Farmer Assistant

> **Vaani Sahayak** is an autonomous, proactive Next.js PWA and voice assistant designed to empower Indian farmers with real-time weather advice, government scheme matching, mandi prices, crop disease diagnosis, and collective transport bargaining — available in 12+ Indian languages.

---

## 🌟 Proactive & Agentic Capabilities

### 1. 🧠 Multilingual Intent Router & Memory System
- **Intent Classifier (`src/lib/agent/intentRouter.js`)**: Routes routine lookups (Mandi prices, simple weather) directly via zero-latency heuristic rules while using Gemini 2.5 Flash for complex reasoning.
- **Farmer State Memory (`src/lib/db/farmerState.js`)**: Maintains persistent plot context (`FARMER_PLOT`), sowing/harvest schedules, soil health, and price alert thresholds (`FARMER_PREFERENCES`).

### 2. ⏰ Proactive Background Jobs
- **Daily Briefing (`src/lib/jobs/dailyBriefing.js`)**: Runs daily at 7:00 AM (`0 7 * * *`). Synthesizes local weather, mandi rates, and relevant scheme deadlines into localized voice/text updates translated via Bhashini NMT.
- **Event-Triggered Alert Engine (`src/lib/jobs/alertEngine.js`)**: Automatically detects high humidity harvest risks, cold frost warnings, severe windstorms, and district disease outbreak clusters (`checkOutbreakCluster`) with 24h deduplication.
- **Collective Bargaining Transport Pooling (`src/lib/jobs/collectiveBargaining.js`)**: Groups farmers in the same district harvesting identical crops within ±7 days and sends localized transport pooling recommendations to cut transport costs.

### 3. 🛡️ Human-in-the-Loop Safety Net & Autonomous Form-Fill
- **Crop Scan Diagnosis Safety Net (`src/lib/agent/cropScan.js`)**: Evaluates AI confidence scores (< 70% threshold) and validates pesticide recommendations against `APPROVED_TREATMENTS`. Automatically escalates low-confidence or unapproved treatments to `REVIEW_QUEUE` for human officer review.
- **Autonomous Scheme Deadline Form-Fill (`src/lib/agent/schemeFormFiller.js`)**: Identifies schemes expiring within 7 days, pre-populates application data, prompts farmer confirmation ("YES" / DTMF "1"), and executes Playwright browser submission to government staging portals. On site failure, escalates to `REVIEW_QUEUE` for 24h officer follow-up.

### 4. 📶 Offline Resilience & Action Queue
- **PWA Service Worker API Caching (`public/sw.js`)**: Caches `/api/weather`, `/api/market`, and `/api/schemes` using Stale-While-Revalidate caching. Displays `"Showing cached data from [time]"` badges when offline.
- **IndexedDB Action Queue (`src/lib/offlineQueue.js`)**: Stores pending crop disease scan photos locally when offline (`"Will upload when back online 📶"`). Automatically auto-syncs queued scans upon network reconnection (`"Uploaded & Synced ✅"`).

### 5. 📊 Feedback Telemetry & Admin Analytics
- **Cross-Module Feedback (`/api/feedback`)**: Captures 👍 / 👎 ratings across Chat, IVR calls (voice/DTMF prompts), Crop Scan diagnoses, and Scheme Match recommendations.
- **Admin Dashboard Portal (`src/app/admin`)**: Real-time admin portal featuring:
  - **Live Support**: Inter-operator chat session management.
  - **Feedback Analytics**: Modules showing overall satisfaction ratios and timeline trends.
  - **Disease Hotspots**: District outbreak cluster overview for agricultural officers.

### 6. 🔒 Strict Privacy Controls
- All peer-to-peer and community features (pooling notifications, PWA `<NearbyActivityCard />`) are 100% anonymized. No names, phone numbers, exact plot locations, or land ownership are ever exposed.

---

## 🗄️ Database Architecture & Migrations

Database tables managed via PostgreSQL migrations in `db/migrations/`:

| Migration File | Description | Key Tables Created/Updated |
| :--- | :--- | :--- |
| `001_create_farmer_plot_and_preferences.sql` | Base farmer plot & alert preferences | `FARMER`, `FARMER_PLOT`, `FARMER_PREFERENCES` |
| `002_add_briefing_and_alert_tables.sql` | Scheme listings, crop scans & alert dedup | `SCHEME`, `SCHEME_APPLICATION`, `CROP_SCAN`, `ALERT_DEDUP` |
| `003_human_in_loop_and_form_fill.sql` | Officer review queue & approved treatments | `REVIEW_QUEUE`, `APPROVED_TREATMENTS` |
| `004_add_conversation_and_feedback.sql` | Conversation logs & feedback telemetry | `CONVERSATION`, `SCHEME_FEEDBACK` |

Run database migrations:
```bash
node db/run-migration.js
```

Seed initial sample data:
```bash
node db/seed.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Gemini API Key (`GEMINI_API_KEY`)

### Environment Setup (`.env.local`)
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vaani_sahayak
GEMINI_API_KEY=your_gemini_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### Installation & Execution
```bash
# Install dependencies
npm install

# Run database migrations & seed data
node db/run-migration.js
node db/seed.js

# Run Next.js development server
npm run dev

# Run production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the PWA application or [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Portal.
