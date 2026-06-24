# DoNext AI 🚀

<div align="center">

![DoNext AI Banner](docs/banner.png)

**Know exactly what to do next. Beat the deadline panic.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

*DoNext AI is an agentic last-minute productivity companion designed to save your hackathons, midsems, and project submissions. Built on Google Gemini 2.5 and Material 3 design systems.*

[Key Features](#-key-features) • [Interactive Mockup](#-dashboard-interface) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Gamification](#-gamified-achievements)

</div>

---

## 🔮 Overview

**DoNext AI** is not just another todo list. It is an agentic scheduler designed to fight the anxiety of approaching deadlines. By taking task inputs via text or hands-free voice dictation, the app queries the **Google Gemini API** to output a prioritized, actionable 6-step roadmap checklist. It keeps you focused on the **one single next action** you must take, supports real-time multi-browser synchronization, and includes a Pomodoro Focus Session dial.

---

## ⚡ Key Features

*   🎙️ **Speech-to-Text Dictation**: Dictate tasks hands-free using the Web Speech API directly in the prompt bar.
*   🤖 **Proactive AI Advisor**: A sidebar chat companion powered by Google Gemini that analyzes your active task list, smart-sorts deadlines, and gives real-time advice.
*   🔄 **Real-Time Cross-Browser Sync**: Log in with the same account across tabs, browsers, or devices. Focus revalidation and active background polling keep tasks in sync.
*   🏆 **Milestone Gamification**: Unlock credentials and badges (e.g., *Voice Pioneer*, *Focus Master*, *Calendar Synchronizer*, *Conqueror*) saved directly to your profile.
*   ⏱️ **Pomodoro Focus Sessions**: Integrated 25-minute focus dial with break transitions and progressive progress rings to keep you productive.
*   📅 **Calendar Export**: Instantly package and download your AI roadmap checklist into a standard `.ics` file for easy calendar imports.

---

## 🖥️ Dashboard Interface

<div align="center">

![DoNext AI Dashboard Mockup](docs/dashboard_mockup.png)

*The Gemini-themed Material 3 dark mode dashboard features glowing auroras, flat card layouts, progress meters, and dynamic AI advisories.*

</div>

---

## ⚙️ Architecture

DoNext AI leverages a decoupled React client and Express backend architecture with Firebase Authentication. Data is persisted securely in local browser storage and back-saved to a lightweight JSON database store.

```mermaid
graph TD
    A[Vite React Frontend] -->|Auth State Observer| B[Firebase Auth]
    A -->|1. Generate Task Roadmap| C[Express Backend]
    A -->|2. Get Advisor Chats| C
    C -->|API Queries| D[Google Gemini 2.5 API]
    C -->|Failover Mode| E[Local Plan Generator]
    
    A -->|POST /tasks/:uid| C
    C -->|Write JSON DB| F[(backend/data/tasks_uid.json)]
    A -->|Revalidate & Poll| C
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase Web App credentials (configured in frontend)
- Google Gemini API key

### 1. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file in the backend root:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```

### 2. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173`.

---

## 🏆 Gamified Achievements

Earn unique badges for completing high-productivity tasks:

| Badge | Achievement Icon | Unlock Condition |
| :--- | :---: | :--- |
| **Voice Pioneer** | 🎙️ | Dictate a task roadmap title using Speech-to-Text. |
| **Focus Master** | ⏱️ | Start and run the Pomodoro Focus Session Timer. |
| **Cal Synchronizer** | 📅 | Export an AI-planned roadmap checklist as an `.ics` file. |
| **Conqueror** | 🏆 | Complete the final checklist item of an active task roadmap. |

---

<div align="center">

*Designed and crafted with 💜 matching the Google Gemini Brand Guidelines.*

</div>
