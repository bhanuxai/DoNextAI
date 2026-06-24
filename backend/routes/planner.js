import express from "express";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for file DB
const readUserFile = (type, uid) => {
  const filePath = path.join(DATA_DIR, `${type}_${uid}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
};

const writeUserFile = (type, uid, data) => {
  const filePath = path.join(DATA_DIR, `${type}_${uid}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Smart mock subtask roadmap generator for fallback
const getMockPlan = (taskTitle) => {
  const title = taskTitle.toLowerCase();
  
  if (title.includes("auth") || title.includes("login") || title.includes("signup")) {
    return [
      "Design login and registration form inputs with validation checks",
      "Create MySQL/Firebase databases schema for user accounts",
      "Implement secure password hashing on signup requests",
      "Code JWT session token generation on backend login routes",
      "Build React routing guards and login verification hooks",
      "Verify access token updates and session timeout resets",
    ];
  }
  
  if (title.includes("deploy") || title.includes("host") || title.includes("cloud") || title.includes("publish")) {
    return [
      "Verify environment variables and production secrets",
      "Build optimized HTML/JS production bundles locally",
      "Configure Docker container and container port mapping rules",
      "Connect codebase branch to cloud hosting (Render/Vercel)",
      "Map custom domain names and DNS server routing parameters",
      "Run latency checks and review SSL certificate security status",
    ];
  }
  
  if (title.includes("test") || title.includes("spec") || title.includes("jest") || title.includes("cypress")) {
    return [
      "Define test coverage target requirements and assertions",
      "Configure mock API servers and database transaction resets",
      "Write unit tests for core helper utilities and classes",
      "Code integration specs for express router paths",
      "Build Cypress E2E flows simulating user interactions",
      "Generate code coverage summaries and resolve warnings",
    ];
  }

  if (
    title.includes("design") ||
    title.includes("ui") ||
    title.includes("css") ||
    title.includes("frontend") ||
    title.includes("page") ||
    title.includes("landing") ||
    title.includes("theme")
  ) {
    return [
      "Select Google Fonts styling and color tokens",
      "Design responsive sidebar and flex layout grids",
      "Develop navigation headers and control button components",
      "Build card grid containers and progress indicator bars",
      "Inject hover and active status transition animations",
      "Verify browser responsive boundaries and layout spacing",
    ];
  }

  if (title.includes("study") || title.includes("exam") || title.includes("midsem") || title.includes("course")) {
    return [
      "Identify high-weight topics in exam syllabus specifications",
      "Gather textbook PDFs, lecture slides, and handwritten notes",
      "Solve SVM formulations and backpropagation dual chains",
      "Complete practice problems from previous semester papers",
      "Write a one-page cheat sheet for key formulas and theories",
      "Perform a self-test review and get a good night's sleep",
    ];
  }

  // Default fallback plan
  return [
    `Gather specs and define guidelines for: ${taskTitle}`,
    "Research required libraries, API documentation, and tools",
    "Set up code repo and project directory structure",
    "Code basic functional components and baseline tests",
    "Integrate styles, theme parameters, and micro-interactions",
    "Perform code review, fix warnings, and publish final build",
  ];
};

// Smart mock advisor recommendation generator for fallback
const getMockRecommendation = (tasks) => {
  const incomplete = tasks.filter((t) => !t.completed);
  if (incomplete.length === 0) {
    return "Your schedule is clear! Dictate or type a new task above to begin planning your productivity route.";
  }

  // Sort by earliest deadline
  const sorted = [...incomplete].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const nearest = sorted[0];

  const today = new Date();
  const diffTime = new Date(nearest.deadline) - today;
  const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return `Proactive recommendation: Focus immediately on "${nearest.title}". It carries ${nearest.priority} priority and is due in ${days} day(s). Tackle its remaining roadmap checklists to ensure your submission is safe.`;
};

// Smart mock advisor chatbot reply generator for fallback
const getMockChatReply = (message, tasks) => {
  const text = message.toLowerCase();
  const incomplete = tasks.filter((t) => !t.completed);

  if (
    text.includes("next") ||
    text.includes("do") ||
    text.includes("prioritize") ||
    text.includes("urgent") ||
    text.includes("schedule")
  ) {
    if (incomplete.length === 0) {
      return "All clear! You have no pending deadlines. Add a task to set your focus.";
    }
    const sorted = [...incomplete].sort((a, b) => {
      const w = { High: 3, Medium: 2, Low: 1 };
      return w[b.priority] - w[a.priority];
    });
    return `Your most urgent focus should be "${sorted[0].title}". It is flagged as ${sorted[0].priority} priority. Try starting a Pomodoro Focus session on it!`;
  }

  if (
    text.includes("study") ||
    text.includes("exam") ||
    text.includes("ml") ||
    text.includes("midsem") ||
    text.includes("review")
  ) {
    return "For study prep, lock into a 25-minute Pomodoro focus block. Clear your desk, read the SVM Dual Lagrangian derivations or Neural Net Backpropagation derivations, and solve previous paper equations.";
  }

  if (text.includes("priorit") || text.includes("sort")) {
    return "You can use the 'AI Smart Sort' button on the dashboard. It will automatically order your deadlines by urgency (earliest dates and highest priority task steps first).";
  }

  // General fallback
  return "Review your active deadline checklists and complete their pending steps. Start a Pomodoro session on your selected focus task to build momentum!";
};

router.get("/", (req, res) => {
  res.send("Planner Route Working");
});

// 1. Task plan generator endpoint
router.post("/", async (req, res) => {
  try {
    const { task } = req.body;

    const prompt = `
You are a productivity planning AI.

Task: ${task}

Break this task into 6 actionable subtasks.

Return ONLY a JSON array.

Example:
[
  "Research Requirements",
  "Design UI",
  "Setup Backend"
]
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text;
    text = text.replace(/```json/g, "");
    text = text.replace(/```/g, "");

    const plan = JSON.parse(text);
    res.json({ plan });
  } catch (error) {
    console.warn("Gemini API Quota Exceeded or Error. Using robust fallback generation.", error.message);
    // Fallback to high quality mock plan
    const mockPlan = getMockPlan(req.body.task || "Productivity Task");
    res.json({ plan: mockPlan });
  }
});

// 2. Advisor recommendation endpoint
router.post("/recommend", async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({
        recommendation: "Your schedule is clear! Add a task using the input bar above to begin planning your productivity route.",
      });
    }

    const prompt = `
You are an expert productivity coach and "Last-Minute Life Saver" assistant.
The user is tracking their tasks, deadlines, and completed subtask roadmaps.
Here is the user's current task list:
${JSON.stringify(tasks, null, 2)}

Provide a concise, highly motivating action recommendation (exactly 2-3 sentences) recommending what they should focus on IMMEDIATELY to prevent missing critical deadlines. Refer to specific tasks and dates. Be direct, proactive, and encouraging.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ recommendation: response.text });
  } catch (error) {
    console.warn("Gemini API Quota Exceeded or Error. Using mock recommendation.", error.message);
    const mockRec = getMockRecommendation(req.body.tasks || []);
    res.json({ recommendation: mockRec });
  }
});

// 3. Conversational Advisor Chat endpoint
router.post("/chat", async (req, res) => {
  try {
    const { message, tasks } = req.body;

    const prompt = `
You are the "DoNext AI Advisor", a helpful, context-aware productivity companion.
The user is managing their tasks, deadlines, and completed subtask roadmaps.
Here is the user's current task list:
${JSON.stringify(tasks, null, 2)}

The user asks: "${message}"

Provide a concise, encouraging, and highly specific answer (2-3 sentences max) to help the user complete their tasks or answer their productivity question. Reference their specific tasks if relevant. Be conversational, direct, and motivating.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.warn("Gemini API Quota Exceeded or Error. Using chat fallback.", error.message);
    const mockReply = getMockChatReply(req.body.message || "", req.body.tasks || []);
    res.json({ reply: mockReply });
  }
});

// Sync Tasks & Achievements for multi-browser support
router.get("/tasks/:uid", (req, res) => {
  const { uid } = req.params;
  const tasks = readUserFile("tasks", uid);
  res.json({ tasks });
});

router.post("/tasks/:uid", (req, res) => {
  const { uid } = req.params;
  const { tasks } = req.body;
  writeUserFile("tasks", uid, tasks);
  res.json({ success: true });
});

router.get("/achievements/:uid", (req, res) => {
  const { uid } = req.params;
  const achievements = readUserFile("achievements", uid);
  res.json({ achievements });
});

router.post("/achievements/:uid", (req, res) => {
  const { uid } = req.params;
  const { achievements } = req.body;
  writeUserFile("achievements", uid, achievements);
  res.json({ success: true });
});

export default router;