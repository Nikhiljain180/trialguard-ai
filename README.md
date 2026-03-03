# TrialGuard AI

**AI-Powered Clinical Trial Patient Retention via Voice AI**

TrialGuard AI uses Bolna Voice AI to automate patient follow-up calls in clinical trials — collecting structured health data, detecting adverse events through conversation, and flagging dropout risk before it happens.

## The Problem

### The stakes

Clinical trials are essential for drug discovery, but they come with significant challenges. Globally, the pharmaceutical industry invests approximately $80 billion each year in conducting clinical trials. These trials are not only expensive, but also time-consuming.

Delays in clinical trials can be extremely costly. For every day a trial is delayed, sponsors can incur additional costs ranging from $600,000 to $8 million, depending on the phase of the trial. Therefore, finding ways to conduct clinical trials faster and more efficiently is crucial for both reducing costs and accelerating the delivery of new therapies to patients.

### The core problem: patient dropout

The biggest operational challenge is **patient retention**. Roughly **40% of patients drop out** before a trial completes. When patients leave, you lose data, skew results, and often have to recruit and enroll replacements—adding months of delay and millions in cost.

### How trials manage this today

To keep patients engaged and collect needed data, research coordinators **manually call hundreds of patients** throughout the trial. On each call they:

- Collect symptom data (nausea, headache, energy, etc.)
- Verify medication adherence (morning and evening doses)
- Screen for adverse events
- Check motivation and flag dropout risk

### Why this approach fails

The manual model has three major flaws:

1. **Expensive** — Each follow-up call costs **$50–80** in staff time.
2. **Inconsistent** — Calls vary by coordinator; questions are asked differently; data quality is uneven.
3. **Unscalable** — A coordinator can realistically handle **15–20 patients per day**. Large trials with hundreds of patients cannot be supported this way.

## Solution

TrialGuard AI automates daily patient follow-up calls using Bolna Voice AI:

1. **Structured symptom collection** — Nausea, headache, energy levels collected via natural conversation
2. **Medication adherence tracking** — Morning and evening dose verification every call
3. **Adverse event detection** — Severity-rated screening with automatic CRITICAL alerts
4. **Dropout risk scoring** — Motivation tracking with early warning flags
5. **Real-time dashboard** — Trial coordinators see all data instantly

## Outcome Metrics

| Metric | AI (TrialGuard) | Manual (Human) |
|--------|-----------------|----------------|
| Cost per follow-up | $0.15 | $50–80 |
| Adverse event detection | Same day | Next visit (weeks) |
| Data completeness | 95%+ | ~60% |
| Scalability | 1000+ patients/day | 15–20 patients/day |

## Architecture

```
User (Trial Coordinator)
  → Web Dashboard (Next.js)
    → API Routes (Next.js)
      → Bolna Voice AI (outbound call)
        → Patient Phone (conversation)
      ← Webhook (structured data)
    → SQLite DB (Prisma)
  ← Real-time Dashboard Update
```

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via Prisma ORM
- **Voice AI:** Bolna API (agent creation + outbound calls + webhooks)
- **Charts:** Recharts
- **Deployment:** Vercel

## Pages

- **Dashboard** (`/`) — Summary cards, risk distribution donut chart, recent call activity
- **Patients** (`/patients`) — Cohort table with risk badges, Call Now button, search/filter
- **Patient Detail** (`/patients/[id]`) — Symptom trends, adherence calendar, call history timeline
- **Alerts** (`/alerts`) — Severity-grouped alert cards with resolve action
- **Analytics** (`/analytics`) — Retention curve, adherence trends, cost comparison

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Bolna account and API key (https://bolna.dev)

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd bolna-fullstack

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Bolna API key and Agent ID

# Set up database
npx prisma generate
npx prisma migrate dev --name init

# Seed demo data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```
BOLNA_API_KEY=your-bolna-api-key
BOLNA_AGENT_ID=your-bolna-agent-id
BOLNA_API_URL=https://api.bolna.dev
DATABASE_URL="file:./dev.db"
```

### Webhook Setup (for live calls)

During development, use ngrok to expose your local webhook:

```bash
ngrok http 3000
# Configure webhook URL in Bolna: https://<ngrok-id>.ngrok.io/api/calls/webhook
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Enroll new patient |
| GET | `/api/patients/[id]` | Patient detail with call history |
| POST | `/api/calls` | Trigger Bolna voice call |
| POST | `/api/calls/webhook` | Receive Bolna call results |
| GET | `/api/alerts` | List alerts |
| PATCH | `/api/alerts/[id]` | Resolve an alert |

## Bolna Agent Configuration

The voice agent is configured with a structured prompt that:
- Greets patients by name and trial day
- Collects structured symptom data (nausea, headache, energy)
- Verifies medication adherence (morning/evening doses)
- Screens for adverse events with severity rating
- Checks motivation and flags dropout risk
- Never provides medical advice

## Business Case

**For a 500-patient Phase III trial running 90 days:**

| | Manual | TrialGuard AI |
|---|--------|---------------|
| Total follow-up calls | 45,000 | 45,000 |
| Cost | $2,925,000 | $6,750 |
| Savings | — | **$2,918,250** |
| Adverse event detection | Days–weeks | **Same day** |
| Data completeness | ~60% | **95%+** |
| Trial delay days saved | — | **Est. 15–30 days** |
| Delay cost avoided | — | **$9M–$240M** |

## License

MIT
