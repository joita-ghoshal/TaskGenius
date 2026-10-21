# TaskGenius

> **Don't Just Remind. Rescue.**

TaskGenius is an AI-powered productivity and intelligent deadline-management platform. It combines a fast, modern task manager with a context-aware AI coach, deadline-risk analysis, and an escalating "rescue" concept for work that is about to slip — delivered through a polished, light-themed, fully responsive web interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Core Features](#core-features)
- [AI-Powered Capabilities](#ai-powered-capabilities)
- [Emergency Rescue Mode](#emergency-rescue-mode)
- [Technology Stack](#technology-stack)
- [System Architecture Overview](#system-architecture-overview)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Status](#project-status)
- [Roadmap](#roadmap)
- [Project Ownership & Credits](#project-ownership--credits)
- [License](#license)

---

## Project Overview

TaskGenius addresses a gap that traditional reminder and task apps leave open: they tell you something is due, but they don't help you **recover** when a deadline is already close. TaskGenius scores each task's deadline risk, provides an AI productivity coach that knows your actual workload, tracks focus and productivity analytics, and escalates critically late tasks through voice alerts and a full-screen Emergency Rescue Mode with a countdown, alarm, and one-click completion path.

Built as a full-stack web application — a React single-page app talking to an Express REST API backed by PostgreSQL — it is designed for students and professionals juggling many overlapping deadlines.

### Problem Statement

Passive reminders get dismissed, and the work still slips. Users need a tool that:

1. Assesses how risky a deadline actually is, not just when it fires a reminder.
2. Explains *why* a task is at risk based on the user's real workload.
3. Escalates with an actionable recovery plan when a deadline becomes critical.

TaskGenius is built around that rescue loop: **risk-scored tasks → contextual AI coaching → escalating alerts → one-click recovery**.

---

## Core Features

| Area | What's included |
| --- | --- |
| **Task Management** | Create, edit, delete, and complete tasks; priority levels (Low / Medium / High / Critical); categories; deadlines; estimated duration; subtasks; automatic risk level and completion-probability scoring at creation |
| **Search & Filtering** | Client-side search, status/priority/category filters, and four sort orders |
| **Calendar** | Monthly, Weekly, and Daily views of your tasks |
| **Dashboard** | Aggregated today/upcoming/completed stats, productivity score, critical-task banner, category breakdown |
| **Authentication** | JWT-based register, login, logout; profile management; password change; password reset flow |
| **Focus Mode** | Pomodoro timer (25 min focus / 5 min break) with session tracking and a completion chime |
| **Analytics** | Productivity charts, completion trends, category breakdown, stats panel, CSV report export |
| **Notifications** | In-app notification centre with unread badge, polling, and mark-all-read |
| **Voice** | Speech-to-text and text-to-speech in the AI chat (Web Speech API); spoken task alerts |
| **UI/UX** | Light-theme glassmorphism design, Framer Motion page transitions, skeleton loaders, empty states, toasts, fully responsive (mobile / tablet / desktop) |

---

## AI-Powered Capabilities

- **AI Chat Assistant** — a conversational productivity coach powered by Google Gemini (`gemini-2.0-flash`). The system prompt is built server-side from your real tasks and productivity data, so its advice reflects your actual workload. Full conversation history is persisted.
- **Smart Task Analysis** — every task receives a deterministic risk level (Critical / High / Medium / Low) and a completion-probability estimate based on deadline proximity and estimated duration.
- **AI Insights** — proactive productivity observations surfaced on the dashboard (overdue workload, daily load, completion trends).
- **Daily Briefing** — a structured daily summary generated from your task data.
- **Voice Conversations** — dictate messages with speech recognition and hear replies spoken back, with per-message replay controls.

---

## Emergency Rescue Mode

TaskGenius's signature concept: when a deadline becomes critically close, the system escalates beyond ordinary reminders.

- **Critical-task detection** — the dashboard flags tasks due within hours and surfaces them in a red emergency banner.
- **Full-screen Red Alert modal** — a dedicated rescue interface with an animated countdown timer, progress bar, and WebAudio alarm sound.
- **AI rescue plan** — a step-by-step action plan generated for the at-risk task.
- **"I'm Done" completion** — one click completes the task directly from the emergency screen.
- **Spoken alerts** — text-to-speech announcements for urgent pending tasks, respecting the user's mute and volume preferences.

> **Development note:** the Emergency Rescue modal and voice-alert components are fully implemented; wiring them into the live dashboard trigger and adding background deadline monitoring are the next development priorities. See [Project Status](#project-status).

---

## Technology Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React 19 | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS v4 | Utility-first styling and design tokens |
| React Router | Client-side routing with protected routes |
| Axios | HTTP client with automatic auth interceptors |
| Framer Motion | Animations and page transitions |
| Recharts | Analytics charts |
| Lucide React | Icons |
| date-fns | Date utilities |
| React Hot Toast | Toast notifications |
| Web Speech API | Speech-to-text and text-to-speech |

### Backend

| Technology | Purpose |
| --- | --- |
| Node.js | Runtime |
| Express.js | REST framework |
| PostgreSQL | Database |
| Prisma | ORM and schema management |
| JSON Web Tokens | Authentication |
| bcryptjs | Password hashing (cost factor 12) |
| Helmet | Security headers |
| CORS | Cross-origin configuration |
| express-rate-limit | API rate limiting |
| express-validator | Request validation |
| Morgan | Request logging |

### AI

| Technology | Purpose |
| --- | --- |
| Google Gemini API (`gemini-2.0-flash`) | AI chat, task context, and analysis |

---

## System Architecture Overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────┐
│  React SPA (Vercel)         │  REST  │  Express API (Render)        │  Prisma│  PostgreSQL  │
│  Pages · Hooks · AuthContext│ ─────► │  Routes → Controllers        │ ─────► │  (Supabase)  │
│  Axios Bearer interceptors  │  JSON  │  JWT auth · Gemini · Rate    │        │              │
└─────────────────────────────┘        └──────────────────────────────┘        └──────────────┘
```

- **Frontend → Backend:** the SPA communicates with the REST API over JSON; an Axios interceptor attaches the JWT from local storage and handles 401 responses.
- **Backend → Database:** all controllers use a shared Prisma client; every query is scoped to the authenticated user's ID.
- **Authentication:** stateless JWT (Bearer header) with bcrypt-hashed passwords.
- **AI flow:** `/api/ai/chat` loads the user's tasks and analytics, builds a contextual system prompt, calls Gemini, and persists the exchange to the database.
- **Health check:** `GET /api/health` performs a live database query and reports connectivity.

---

## Installation

### Prerequisites

- **Node.js ≥ 18**
- **PostgreSQL** database (a free [Supabase](https://supabase.com) project works well)
- **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey))

### Clone & install

```bash
git clone https://github.com/joita-ghoshal/TaskGenius.git
cd TaskGenius

# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install
```

---

## Environment Setup

### Backend — `server/.env`

Copy the template and fill in your values:

```bash
cp server/.env.example server/.env
```

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRE` | Token lifetime (e.g. `7d`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |

> Never commit `.env` files. They are git-ignored.

### Frontend — `client/.env`

```bash
VITE_API_URL=http://localhost:5000/api
```

If unset, the client falls back to `/api` and relies on the Vite dev proxy.

### Database schema

```bash
cd server
npx prisma generate
npx prisma db push
```

---

## Local Development

Run the API and the SPA in two terminals:

```bash
# Terminal 1 — API on http://localhost:5000
cd server
npm run dev        # nodemon auto-reload

# Terminal 2 — SPA on http://localhost:5173 (proxies /api → :5000)
cd client
npm run dev
```

Open **http://localhost:5173**, register an account, and start creating tasks.

Useful backend scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## Testing

```bash
cd client
npm run lint       # oxlint static analysis
npm run build      # production build verification
```

An automated test suite is on the roadmap; current verification is done through linting, production builds, and manual smoke testing of the full auth → task → AI → analytics flow.

---

## Deployment

| Piece | Platform | Configuration |
| --- | --- | --- |
| Backend | **Render** | `render.yaml` — build: install + `prisma generate` + `prisma db push`; start: `node server.js` |
| Frontend | **Vercel** | `client/vercel.json` — Vite build with SPA rewrite |
| Database | **Supabase** (PostgreSQL) | Connection string via `DATABASE_URL` |

**Deployed URLs:** a public live deployment is not yet published. Deployment configuration for both platforms is complete and ready to connect.

To deploy:

1. Create the Render web service from `render.yaml` and set `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, and `CLIENT_URL` (your final frontend origin) in the dashboard.
2. Deploy `client/` to Vercel and set `VITE_API_URL` to your API origin + `/api`.
3. Verify `GET <api-origin>/api/health` returns `"database": "connected"`.

---

## Project Status

TaskGenius is in **active development**. The backend API (auth, tasks, AI chat, notifications, analytics) and the full frontend UI are implemented and functional, with a complete PostgreSQL schema and deployment configuration for Render and Vercel.

**Currently being worked on:**

- Fixing internal navigation paths so every sidebar and dashboard link resolves correctly
- Reconciling dashboard and analytics data shapes between client and server
- Wiring the Emergency Rescue modal into the live dashboard trigger
- Activating the notification-generation and analytics-logging pipelines
- Email delivery for the password-reset flow

An updated roadmap lives below; detailed technical tracking is maintained internally as development continues.

---

## Roadmap

**Short term**

- Repair all internal navigation routes
- Mount the Emergency Red Alert modal on the live dashboard with background deadline monitoring
- Server-side notification generation and analytics logging
- Email-based password reset

**Medium term**

- LLM-powered daily briefing, insights, and task analysis (replacing deterministic templates)
- Browser push notifications via service worker
- Task detail pages and in-calendar task creation
- Automated test suite and CI

**Long term**

- Learned personal completion-time models
- Smart scheduling into free calendar slots
- Team/shared deadlines and mobile PWA install
- Email/SMS escalation tiers

---

## Project Ownership & Credits

| | |
| --- | --- |
| **Created & Developed By** | **Joita Ghoshal** |
| **Project Owner** | **Joita Ghoshal** |
| **Authorized By** | **Joita Ghoshal** |
| **University** | Brainware University, West Bengal, India |
| **Department** | Computer Science and Engineering (CSE Core) |
| **Degree** | Bachelor of Technology (B.Tech) |
| **Academic Year** | Second Year |
| **Batch** | 2025–2029 |

**Repository:** [github.com/joita-ghoshal/TaskGenius](https://github.com/joita-ghoshal/TaskGenius)

---

## License

This project is licensed under the MIT License.

---

<p align="center">
  <b>TaskGenius</b> — Don't Just Remind. Rescue.<br/>
  Built by Joita Ghoshal · Brainware University · B.Tech CSE (2025–2029)
</p>
