# Consolidated Changelog — Vaani Sahayak (वाणी सहायक)

All notable agentic capabilities, database schema migrations, autonomous background jobs, and PWA resilience features added to Vaani Sahayak are documented in this file.

---

## [1.0.0] - 2026-07-28

### 🧠 Agentic Core & Memory System
- **Multilingual Intent Router**: Implemented hybrid classification system (`src/lib/agent/intentRouter.js`). Routes standard queries (mandi price lookups, basic weather) directly via fast lookup rules and delegates complex agricultural queries to Gemini 2.5 Flash.
- **Farmer State & Plot Memory**: Added database module (`src/lib/db/farmerState.js`) persisting farmer identity, land acreage, sowing/harvest dates, soil types, and notification preferences (`FARMER`, `FARMER_PLOT`, `FARMER_PREFERENCES`).

### ⏰ Proactive Background Jobs
- **Personalized Daily Briefing (`src/lib/jobs/dailyBriefing.js`)**: Runs on cron schedule (`0 7 * * *`). Aggregates local weather, mandi prices, and expiring government schemes tailored to each farmer's plot. Dispatches localized voice/text via Bhashini NMT translation.
- **Proactive Event-Triggered Alert Engine (`src/lib/jobs/alertEngine.js`)**:
  - Monitors high harvest risk (humidity ≥ 80% + rain), frost warnings, and severe wind/storms.
  - Detects crop disease outbreak clusters across districts (`checkOutbreakCluster`).
  - Enforces 24-hour deduplication log (`ALERT_DEDUP` table) to prevent alert fatigue.
- **Collective Bargaining Transport Pooling (`src/lib/jobs/collectiveBargaining.js`)**: Identifies multi-farmer clusters in the same district growing identical crops with harvest dates within ±7 days. Dispatches localized transport pooling recommendations to lower Mandi transport costs.

### 🛡️ Safety Net & Escalation Workflows
- **Crop Scan Diagnosis Safety Net (`src/lib/agent/cropScan.js`)**: Evaluates AI disease detection confidence (< 70% threshold) and checks pesticide recommendations against `APPROVED_TREATMENTS`. Automatically escalates unverified or low-confidence scans to `REVIEW_QUEUE` for human agricultural officer review.
- **Admin Review Queue Panel (`src/app/admin/review-queue`)**: Interface for agricultural officers to review, approve, reject, or override escalated crop scans and failed scheme submissions.

### 🤖 Autonomous Form-Fill Agent
- **Scheme Deadline Tracker (`src/lib/jobs/schemeDeadlineTracker.js`)**: Scans government schemes with deadlines within 7 days and pre-populates `SCHEME_APPLICATION` records with status `pending_confirmation`.
- **Playwright Form-Fill Agent (`src/lib/agent/schemeFormFiller.js`)**: Upon farmer confirmation ("YES" or DTMF "1"), automates Playwright browser submission to government staging portals. On site failure or CAPTCHA blockage, escalates to `REVIEW_QUEUE` for officer follow-up.

### 📶 Offline Resilience & PWA Support
- **Service Worker API Caching (`public/sw.js`)**: Stale-While-Revalidate caching strategy for `/api/weather`, `/api/market`, and `/api/schemes`. Displays `"Showing cached data from [time]"` indicators in UI when offline.
- **IndexedDB Action Queue (`src/lib/offlineQueue.js`)**: Stores pending crop disease scan photo uploads locally in IndexedDB when network connection is offline (`"Will upload when back online 📶"`). Automatically auto-syncs queued scans upon network reconnection (`"Uploaded & Synced ✅"`).

### 📊 Feedback Loop & Analytics Dashboard
- **Cross-Module Feedback Telemetry (`/api/feedback`)**: Captures 👍 / 👎 ratings for AI Chat, Exotel IVR calls (voice/DTMF prompt), Crop Scan diagnoses, and Scheme Match recommendations.
- **Admin Feedback Dashboard Panel (`src/app/admin`)**: Real-time feedback analytics panel showing overall satisfaction %, category satisfaction ratios, and historical timeline trends.
- **Outbreak Cluster Hotspot View (`/api/admin/outbreak-clusters`)**: Renders district-level disease cluster hotspots for agricultural officers on the Admin portal.

### 🔒 Privacy & Community Network Effect
- **Anonymized Nearby Farmer Activity Card (`src/components/NearbyActivityCard.jsx`)**: Displays aggregated district crop trends (`"🌾 12 farmers in Rajkot district are growing Cotton"`).
- **Strict Privacy Pass**: Enforces zero PII exposure across all peer notifications and farmer-facing API responses.
