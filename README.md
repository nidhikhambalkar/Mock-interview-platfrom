# WeIntern AI Mock Interview Platform

WeIntern is a production-ready AI-driven Mock Interview Platform built with React, Vite, Tailwind CSS, Node.js, Express, Supabase (PostgreSQL), and the Anthropic Claude API. It empowers candidates to practice professional interviews across core business sectors, capture speech response dictate parameters (via Voice Mode Speech-to-Text), and receive comprehensive performance evaluation metrics.

---

## Technical Architecture Overview

*   **Frontend**: React + Vite + Tailwind CSS v3 + Recharts + jsPDF
*   **Backend**: Node.js + Express API + Anthropic Claude SDK
*   **Database & Auth**: Supabase PostgreSQL + Google Auth Providers

---

## File Structure

```
/
├── backend/
│   ├── index.js              # Express core routes, middleware & Claude integrations
│   ├── package.json          # Server dependencies
│   └── .env.template         # Backend environmental variable specifications
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Global glassmorphism navigation
│   │   │   ├── ProtectedRoute.tsx   # Auth guard redirects
│   │   │   └── AudioVisualizer.tsx  # CSS Voice pulsing simulator
│   │   ├── pages/
│   │   │   ├── Login.tsx            # Authenticating landing screen
│   │   │   ├── Dashboard.tsx        # Charts & interview analytics metrics
│   │   │   ├── SetupInterview.tsx   # Domain & Difficulty config
│   │   │   ├── InterviewRoom.tsx    # Single-question practice room
│   │   │   └── SessionSummary.tsx   # Evaluation scores & coach critique tabs
│   │   ├── utils/
│   │   │   └── pdfGenerator.ts      # jsPDF report output configuration
│   │   ├── App.tsx                  # Main router definitions
│   │   ├── supabase.ts              # Supabase Client initializations
│   │   ├── types.ts                 # Type declarations
│   │   ├── index.css                # Global stylesheet & animations
│   │   └── main.tsx                 # Root DOM rendering anchor
│   ├── package.json                 # Frontend dependencies
│   ├── tailwind.config.js           # Tailwind configuration
│   ├── postcss.config.js            # PostCSS configuration
│   └── .env.template                # Frontend environmental variable specifications
├── schema.sql                       # Database declarations, triggers & RLS
└── README.md                        # Documentation overview
```

---

## Setup & Installations

### Step 1: Database Setup (Supabase)

1.  Create a new project on [Supabase Console](https://supabase.com/).
2.  Open the **SQL Editor** in the Supabase Dashboard.
3.  Copy the contents of `schema.sql` (located in the root of this project) and paste it into the editor.
4.  Click **Run** to execute the script. This will create:
    *   `public.users`, `public.sessions`, and `public.session_answers` tables.
    *   Triggers to automatically synchronize user records on Google Login.
    *   Row-Level Security (RLS) policies shielding data records.

### Step 2: Supabase Google Login Integration

1.  Navigate to your Google Cloud Console and obtain **Google OAuth Client Credentials**.
2.  Go to your Supabase Project -> **Authentication** -> **Providers** -> **Google**.
3.  Input your Client ID, Secret, and make sure to copy the **Redirect URL** from Supabase.
4.  Add this Redirect URL to your Authorized Redirect URIs inside your Google Cloud Console.

### Step 3: Backend Configuration

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create a `.env` file copying `.env.template`:
    ```bash
    cp .env.template .env
    ```
3.  Fill in the values in your `.env`:
    *   `PORT`: Port to run Express server (default `5000`).
    *   `SUPABASE_URL`: Your Supabase project URL (Settings -> API).
    *   `SUPABASE_SERVICE_ROLE_KEY`: Service role secret (Settings -> API -> `service_role`).
    *   `SUPABASE_ANON_KEY`: Anon key (Settings -> API -> `anon public`).
    *   `ANTHROPIC_API_KEY`: Your Anthropic developer console API key.
    *   `CLAUDE_MODEL`: Set to `claude-3-5-sonnet-20241022`.

### Step 4: Frontend Configuration

1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Create a `.env` file copying `.env.template`:
    ```bash
    cp .env.template .env
    ```
3.  Fill in the values in your `.env`:
    *   `VITE_SUPABASE_URL`: Your Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public key.
    *   `VITE_API_URL`: The backend connection path (e.g. `http://localhost:5000`).

---

## Running the Application Locally

You will run the backend server and frontend client in separate terminal windows.

### Run Backend Server
```bash
cd backend
npm run dev
```
Server launches on `http://localhost:5000`.

### Run Frontend Client
```bash
cd frontend
npm run dev
```
Client launches on `http://localhost:5173`.

---

## Core AI Logic & Prompts

### Question Generation
The platform uses the following prompt for generating questions:
> **System Prompt**: `You are an expert interviewer for [domain]. Generate [N] realistic interview questions at [difficulty] level. Return as JSON array of objects with fields: id, question, type.`

### Answer Evaluation
The platform uses the following prompt for assessing answers:
> **System Prompt**: `You are a professional interview coach. Evaluate this answer for a [domain] interview. Score on: Communication Clarity (0-10), Technical Accuracy (0-10), Confidence & Tone (0-10). Return JSON: {communication, technical, confidence, strength, improvement, example_answer}.`
