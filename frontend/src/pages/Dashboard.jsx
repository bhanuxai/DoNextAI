import { useState, useEffect, useRef } from "react";
import AddTask from "../components/AddTask";
import TaskPlan from "../components/TaskPlan";
import axios from "axios";
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase.js";
import {
  syncToGoogleTasks,
  scheduleOnGoogleCalendar,
  createGoogleMeetRoom,
  exportStatsToGoogleSheets,
} from "../services/googleApi.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
    ? "http://localhost:5000"
    : "https://donextai.onrender.com");

// Default tasks for hackathon demonstration
const defaultTasks = [
  {
    id: 1,
    title: "Flipkart Grid Submission",
    description: "Complete all backend endpoints and build a gorgeous Gemini themed React UI.",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "High",
    completed: false,
    subtasks: [
      { id: 0, title: "Initialize Vite & Tailwind v4", completed: true },
      { id: 1, title: "Configure Express and Google Gen AI SDK", completed: true },
      { id: 2, title: "Overhaul theme to glassmorphic dark mode", completed: true },
      { id: 3, title: "Implement Speech-to-Text dictation input", completed: false },
      { id: 4, title: "Integrate Dynamic AI Advisor route", completed: false },
      { id: 5, title: "Deploy and record video walkthrough", completed: false },
    ],
  },
  {
    id: 2,
    title: "Study for ML Midsem Exam",
    description: "Review Support Vector Machines dual formulation, Backpropagation, and kernels.",
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "High",
    completed: false,
    subtasks: [
      { id: 0, title: "Derive SVM dual form Lagrangian dual", completed: false },
      { id: 1, title: "Solve backpropagation partial derivative chains", completed: false },
      { id: 2, title: "Review lecture slides 1 to 5", completed: false },
    ],
  },
  {
    id: 3,
    title: "Pay Broadband Internet Bill",
    description: "Authorize online transaction to prevent service interruption.",
    deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "Low",
    completed: true,
    subtasks: [
      { id: 0, title: "Login to ISP account portal", completed: true },
      { id: 1, title: "Authorize UPI check out transaction", completed: true },
    ],
  },
];

function Dashboard() {
  // Splash Screen State
  const [splashActive, setSplashActive] = useState(true);

  // Sidebar Open/Collapse State
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("donext_sidebar_open");
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("donext_sidebar_open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [showLoginPage, setShowLoginPage] = useState(false);

  // Load tasks from state (hydrated by auth listener)
  const [tasks, setTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);

  // Task Filter State
  const [filter, setFilter] = useState("All");

  // Advisor Chat Drawer State
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  // Profile Dashboard Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Gamified achievements state
  const [achievements, setAchievements] = useState({
    voicePioneer: false,
    focusMaster: false,
    calendarSync: false,
    deadlineConqueror: false,
  });

  const [aiRecommendation, setAiRecommendation] = useState("Analyzing your schedule to generate tailored productivity action advice...");
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  // Focus Timer state (Pomodoro)
  const [timeLeft, setTimeLeft] = useState(1500); // 25 mins
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState("Focus"); // Focus or Break

  const chatEndRef = useRef(null);

  // Entrance Splash Timer Hook
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashActive(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Sync tasks and achievements from backend
  const syncFromBackend = async (currentUser) => {
    try {
      const tasksRes = await axios.get(`${API_BASE_URL}/api/planner/tasks/${currentUser.uid}`);
      if (tasksRes.data.tasks) {
        const loadedTasks = tasksRes.data.tasks;
        setTasks(loadedTasks);
        localStorage.setItem(`donext_tasks_${currentUser.uid}`, JSON.stringify(loadedTasks));
        
        // Set active task
        const incomplete = loadedTasks.find((t) => !t.completed);
        setActiveTaskId(incomplete ? incomplete.id : loadedTasks.length > 0 ? loadedTasks[0].id : null);
      } else {
        const savedTasks = localStorage.getItem(`donext_tasks_${currentUser.uid}`);
        const loadedTasks = savedTasks ? JSON.parse(savedTasks) : defaultTasks;
        setTasks(loadedTasks);
        
        // Set active task
        const incomplete = loadedTasks.find((t) => !t.completed);
        setActiveTaskId(incomplete ? incomplete.id : loadedTasks.length > 0 ? loadedTasks[0].id : null);
        
        await axios.post(`${API_BASE_URL}/api/planner/tasks/${currentUser.uid}`, { tasks: loadedTasks });
      }

      const achRes = await axios.get(`${API_BASE_URL}/api/planner/achievements/${currentUser.uid}`);
      if (achRes.data.achievements) {
        setAchievements(achRes.data.achievements);
        localStorage.setItem(`donext_achievements_${currentUser.uid}`, JSON.stringify(achRes.data.achievements));
      } else {
        const savedAchievements = localStorage.getItem(`donext_achievements_${currentUser.uid}`);
        const loadedAchievements = savedAchievements ? JSON.parse(savedAchievements) : {
          voicePioneer: false,
          focusMaster: false,
          calendarSync: false,
          deadlineConqueror: false,
        };
        setAchievements(loadedAchievements);
        await axios.post(`${API_BASE_URL}/api/planner/achievements/${currentUser.uid}`, { achievements: loadedAchievements });
      }
    } catch (err) {
      console.error("Error syncing from backend", err);
      // Fallback to local storage on error
      const savedTasks = localStorage.getItem(`donext_tasks_${currentUser.uid}`);
      const loadedTasks = savedTasks ? JSON.parse(savedTasks) : defaultTasks;
      setTasks(loadedTasks);
      
      // Set active task
      const incomplete = loadedTasks.find((t) => !t.completed);
      setActiveTaskId(incomplete ? incomplete.id : loadedTasks.length > 0 ? loadedTasks[0].id : null);

      const savedAchievements = localStorage.getItem(`donext_achievements_${currentUser.uid}`);
      setAchievements(savedAchievements ? JSON.parse(savedAchievements) : {
        voicePioneer: false,
        focusMaster: false,
        calendarSync: false,
        deadlineConqueror: false,
      });
    }
  };

  // Firebase Auth State Observer and LocalStorage Loader
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setShowLoginPage(false); // Close login view on successful login
        syncFromBackend(currentUser);

        // Restore Google Access Token from localStorage
        const savedToken = localStorage.getItem(`donext_google_token_${currentUser.uid}`);
        if (savedToken) {
          setGoogleAccessToken(savedToken);
        }
      } else {
        setUser(null);
        setTasks([]);
        setActiveTaskId(null);
        setGoogleAccessToken(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save tasks to localStorage when modified
  useEffect(() => {
    if (!authLoading && user) {
      localStorage.setItem(`donext_tasks_${user.uid}`, JSON.stringify(tasks));
      axios.post(`${API_BASE_URL}/api/planner/tasks/${user.uid}`, { tasks })
        .catch((err) => console.error("Failed to save tasks to backend", err));
    }
  }, [tasks, user, authLoading]);

  // Save achievements to localStorage when modified
  useEffect(() => {
    if (!authLoading && user) {
      localStorage.setItem(`donext_achievements_${user.uid}`, JSON.stringify(achievements));
      axios.post(`${API_BASE_URL}/api/planner/achievements/${user.uid}`, { achievements })
        .catch((err) => console.error("Failed to save achievements to backend", err));
    }
  }, [achievements, user, authLoading]);

  // Real-time synchronization effect for active sessions across tabs/browsers
  useEffect(() => {
    if (!user) return;

    const fetchLatest = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/planner/tasks/${user.uid}`);
        if (response.data.tasks) {
          const backendStr = JSON.stringify(response.data.tasks);
          const localStr = JSON.stringify(tasks);
          if (backendStr !== localStr) {
            setTasks(response.data.tasks);
            localStorage.setItem(`donext_tasks_${user.uid}`, backendStr);
            
            // Validate and update activeTaskId if the active task was deleted/changed on another device
            const stillExists = response.data.tasks.some((t) => t.id === activeTaskId);
            if (!stillExists && response.data.tasks.length > 0) {
              const incomplete = response.data.tasks.find((t) => !t.completed);
              setActiveTaskId(incomplete ? incomplete.id : response.data.tasks[0].id);
            } else if (response.data.tasks.length === 0) {
              setActiveTaskId(null);
            } else if (activeTaskId === null && response.data.tasks.length > 0) {
              const incomplete = response.data.tasks.find((t) => !t.completed);
              setActiveTaskId(incomplete ? incomplete.id : response.data.tasks[0].id);
            }
          }
        }
        
        const achResponse = await axios.get(`${API_BASE_URL}/api/planner/achievements/${user.uid}`);
        if (achResponse.data.achievements) {
          const backendAchStr = JSON.stringify(achResponse.data.achievements);
          const localAchStr = JSON.stringify(achievements);
          if (backendAchStr !== localAchStr) {
            setAchievements(achResponse.data.achievements);
            localStorage.setItem(`donext_achievements_${user.uid}`, backendAchStr);
          }
        }
      } catch (err) {
        console.error("Sync fetch failed", err);
      }
    };

    // Revalidate on browser window focus
    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener("focus", handleFocus);

    // Active background poll every 4 seconds
    const interval = setInterval(fetchLatest, 4000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [user, tasks, achievements, activeTaskId]);

  // Set chat messages when user changes
  useEffect(() => {
    const firstName = user ? (user.displayName ? user.displayName.split(" ")[0] : "Planner") : "Guest";
    setMessages([
      {
        sender: "ai",
        text: user 
          ? `Hi ${firstName}! I'm your Gemini Advisor. Ask me anything about prioritizing your deadlines or generating roadmap study strategies!`
          : `Hi ${firstName}! I'm your Gemini Advisor. Please sign in with Google to ask me anything about prioritizing your deadlines or generating roadmap study strategies!`,
      },
    ]);
  }, [user]);

  // Google Sign-In and Sign-Out triggers
  const handleGoogleSignIn = async () => {
    try {
      // Add required scopes dynamically
      googleProvider.addScope("https://www.googleapis.com/auth/tasks");
      googleProvider.addScope("https://www.googleapis.com/auth/calendar");
      googleProvider.addScope("https://www.googleapis.com/auth/drive.readonly");
      googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");

      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        setGoogleAccessToken(token);
        localStorage.setItem(`donext_google_token_${result.user.uid}`, token);

        // Instantly mark the Calendar Sync achievement since they linked their Google Workspace
        setAchievements((prev) => ({
          ...prev,
          calendarSync: true,
        }));
      }
    } catch (error) {
      console.error("Sign in failed", error);
      alert(`Sign in failed: ${error.code || error.message || "Please check your internet connection."}`);
    }
  };

  // Google REST API Integration Actions & Loading states
  const [googleSyncing, setGoogleSyncing] = useState({
    tasks: false,
    calendar: false,
    meet: false,
    sheets: false,
  });

  const handleSyncToGoogleTasks = async (task) => {
    if (!googleAccessToken) {
      alert("Please connect your Google Workspace account first.");
      return;
    }
    setGoogleSyncing(prev => ({ ...prev, tasks: true }));
    try {
      await syncToGoogleTasks(task, googleAccessToken);
      alert("Successfully synced task and subtasks to Google Tasks!");
    } catch (error) {
      console.error("Google Tasks sync failed", error);
      const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
      alert(`Failed to sync to Google Tasks: ${errMsg}`);
    } finally {
      setGoogleSyncing(prev => ({ ...prev, tasks: false }));
    }
  };

  const handleScheduleOnGoogleCalendar = async (task) => {
    if (!googleAccessToken) {
      alert("Please connect your Google Workspace account first.");
      return;
    }
    setGoogleSyncing(prev => ({ ...prev, calendar: true }));
    try {
      const event = await scheduleOnGoogleCalendar(task, googleAccessToken);
      alert(`Study focus block scheduled on Google Calendar!\nEvent: ${event.summary}\nTime: ${new Date(event.start.dateTime).toLocaleString()}`);
    } catch (error) {
      console.error("Google Calendar sync failed", error);
      const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
      alert(`Failed to schedule on Google Calendar: ${errMsg}`);
    } finally {
      setGoogleSyncing(prev => ({ ...prev, calendar: false }));
    }
  };

  const handleCreateMeetRoom = async (task) => {
    if (!googleAccessToken) {
      alert("Please connect your Google Workspace account first.");
      return;
    }
    setGoogleSyncing(prev => ({ ...prev, meet: true }));
    try {
      const result = await createGoogleMeetRoom(task, googleAccessToken);
      alert(`Google Meet room created successfully!\n\nJoin Link: ${result.meetingUrl}`);
      window.open(result.meetingUrl, "_blank");
    } catch (error) {
      console.error("Google Meet creation failed", error);
      const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
      alert(`Failed to generate Google Meet room: ${errMsg}`);
    } finally {
      setGoogleSyncing(prev => ({ ...prev, meet: false }));
    }
  };

  const handleExportStatsToGoogleSheets = async () => {
    if (!googleAccessToken) {
      alert("Please connect your Google Workspace account first.");
      return;
    }
    setGoogleSyncing(prev => ({ ...prev, sheets: true }));
    try {
      const result = await exportStatsToGoogleSheets(tasks, achievements, googleAccessToken);
      alert("Successfully created and exported your roadmaps to Google Sheets!");
      if (result.spreadsheetUrl) {
        window.open(result.spreadsheetUrl, "_blank");
      }
    } catch (error) {
      console.error("Google Sheets export failed", error);
      const errMsg = error.response?.data?.error?.message || error.message || "Unknown error";
      alert(`Failed to export statistics to Google Sheets: ${errMsg}`);
    } finally {
      setGoogleSyncing(prev => ({ ...prev, sheets: false }));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowProfileModal(false);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  // Fetch dynamic AI recommendation when tasks change
  useEffect(() => {
    const fetchRecommendation = async () => {
      setLoadingRecommendation(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/api/planner/recommend`, {
          tasks: tasks,
        });
        setAiRecommendation(response.data.recommendation);
      } catch (error) {
        console.error("Failed to fetch recommendation", error);
        setAiRecommendation(
          "Review your ML Midsem Exam prep dual formulations! That task is due tomorrow and has High priority. Get started immediately."
        );
      } finally {
        setLoadingRecommendation(false);
      }
    };

    fetchRecommendation();
  }, [tasks]);

  // Focus Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (timerMode === "Focus") {
        setTimerMode("Break");
        setTimeLeft(300); // 5 mins break
        alert("Focus session complete! Take a 5-minute breather.");
      } else {
        setTimerMode("Focus");
        setTimeLeft(1500); // 25 mins focus
        alert("Break over! Time to get back to planning.");
      }
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, timerMode]);

  // Auto-scroll chat advisor drawer
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showAdvisor]);

  // Timer controls
  const toggleTimer = () => {
    if (!timerActive) {
      setAchievements((prev) => ({ ...prev, focusMaster: true }));
    }
    setTimerActive(!timerActive);
  };
  const resetTimer = () => {
    setTimerActive(false);
    setTimeLeft(timerMode === "Focus" ? 1500 : 300);
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Add a new task to list
  const handleAddTask = (newTask) => {
    setTasks((prev) => [...prev, newTask]);
    setActiveTaskId(newTask.id);

    if (newTask.createdViaVoice) {
      setAchievements((prev) => ({ ...prev, voicePioneer: true }));
    }
  };

  // Delete a task
  const handleDeleteTask = (taskId, e) => {
    e.stopPropagation();
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      if (activeTaskId === taskId && updated.length > 0) {
        const nextActive = updated.find((t) => !t.completed) || updated[0];
        setActiveTaskId(nextActive.id);
      } else if (updated.length === 0) {
        setActiveTaskId(null);
      }
      return updated;
    });
  };

  // Physics Confetti Particle Engine (Vanilla JS Canvas Confetti)
  const triggerConfetti = () => {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ["#4285f4", "#9b72cb", "#d96570", "#f1ae44", "#a855f7", "#ec4899", "#3b82f6"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -100 - 20,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
      });
    }

    let animationFrameId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p, index) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2.2;
        p.x += Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle - index / 3) * 12;

        if (p.y < canvas.height) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    draw();

    setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 4500);
  };

  // Toggle subtask status with Confetti & Conqueror Badge hook
  const handleToggleSubtask = (subtaskId) => {
    setTasks((prevTasks) => {
      let isPerfectComplete = false;

      const updated = prevTasks.map((t) => {
        if (t.id === activeTaskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );

          const wasComplete = t.completed;
          const isNowComplete = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);

          if (!wasComplete && isNowComplete) {
            isPerfectComplete = true;
          }

          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: isNowComplete,
          };
        }
        return t;
      });

      if (isPerfectComplete) {
        setTimeout(() => {
          triggerConfetti();
          setAchievements((prev) => ({ ...prev, deadlineConqueror: true }));
        }, 150);
      }

      return updated;
    });
  };

  // AI Smart Sort Tasks (Urgent deadline first + high priority)
  const handleSmartSort = () => {
    setTasks((prev) => {
      const sorted = [...prev].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityWeight = { High: 3, Medium: 2, Low: 1 };
        const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(a.deadline) - new Date(b.deadline);
      });
      return sorted;
    });
  };

  // Export task roadmap to calendar .ics file + Unlock Badge
  const exportToICS = (task) => {
    setAchievements((prev) => ({ ...prev, calendarSync: true }));

    const dateStr = task.deadline.replace(/-/g, "");
    const dtStart = `${dateStr}T090000`;
    const dtEnd = `${dateStr}T100000`;

    const subtasksText = task.subtasks
      ? task.subtasks.map((st, i) => `${i + 1}. [${st.completed ? "x" : " "}] ${st.title}`).join("\\n")
      : "";

    const description = `${task.description || ""}\\n\\nAI Generated Roadmap:\\n${subtasksText}`;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DoNext AI//Productivity Roadmap//EN",
      "BEGIN:VEVENT",
      `UID:${task.id}@donext.ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${task.title} [DoNext AI]`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${task.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Conversational AI Advisor submit message
  const handleSendChatMessage = async (presetText) => {
    if (!user) {
      alert("Login to use: Please sign in with Google to chat with the AI Advisor!");
      setShowLoginPage(true);
      return;
    }

    const message = presetText || chatInput;
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: message.trim() }]);
    if (!presetText) setChatInput("");

    setChatLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/planner/chat`, {
        message: message.trim(),
        tasks: tasks,
      });

      setMessages((prev) => [...prev, { sender: "ai", text: response.data.reply }]);
    } catch (error) {
      console.error("AI Advisor Chat failed", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced a connection lag. Make sure the server backend is running on port 5000!",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Compute overall stats
  const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subtasks ? t.subtasks.length : 0), 0);
  const completedSubtasks = tasks.reduce(
    (sum, t) => sum + (t.subtasks ? t.subtasks.filter((st) => st.completed).length : 0),
    0
  );
  const totalProductivityScore = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // Compute nearest deadline
  const activeIncomplete = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const nearestTask = activeIncomplete[0];
  const todayDate = new Date();
  let daysRemaining = 0;
  if (nearestTask) {
    const diffTime = new Date(nearestTask.deadline) - todayDate;
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Filter Tasks list
  const filteredTasks = tasks.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Completed") return t.completed;
    if (filter === "Active") return !t.completed;
    if (filter === "Urgent") {
      if (t.completed) return false;
      if (t.priority === "High") return true;
      const diffTime = new Date(t.deadline) - todayDate;
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days <= 2;
    }
    return true;
  });

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gemini-bg text-white relative">
        <div className="gemini-bg-glow-container">
          <div className="gemini-glow-blob gemini-glow-blob-1"></div>
          <div className="gemini-glow-blob gemini-glow-blob-2"></div>
          <div className="gemini-glow-blob gemini-glow-blob-3"></div>
        </div>
        <div className="relative animate-gemini-spark z-10">
          <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-white">
            <defs>
              <linearGradient id="loaderSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285f4" />
                <stop offset="30%" stopColor="#9b72cb" />
                <stop offset="70%" stopColor="#d96570" />
                <stop offset="100%" stopColor="#f1ae44" />
              </linearGradient>
            </defs>
            <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" fill="url(#loaderSparkGrad)" />
          </svg>
        </div>
      </div>
    );
  }

  if (showLoginPage && !user) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gemini-bg text-gemini-text font-sans relative flex-col items-center justify-center animate-fade-in">
        {/* Background glow auroras */}
        <div className="gemini-bg-glow-container">
          <div className="gemini-glow-blob gemini-glow-blob-1"></div>
          <div className="gemini-glow-blob gemini-glow-blob-2"></div>
          <div className="gemini-glow-blob gemini-glow-blob-3"></div>
        </div>

        {/* Floating gradient aurora behind the login card */}
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-gemini-blue/15 via-gemini-purple/15 to-gemini-pink/15 rounded-full blur-[100px] animate-rotate-glow"></div>

        <div className="relative z-10 w-[90vw] sm:w-[450px] p-8 glass-card rounded-[28px] border border-gemini-border bg-gemini-bg-light/95 flex flex-col items-center gap-6 shadow-2xl text-center animate-scale-in">
          {/* Pulsing Spark Logo */}
          <div className="relative animate-gemini-spark mb-2 shrink-0">
            <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-white animate-float">
              <defs>
                <linearGradient id="loginSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285f4" />
                  <stop offset="30%" stopColor="#9b72cb" />
                  <stop offset="70%" stopColor="#d96570" />
                  <stop offset="100%" stopColor="#f1ae44" />
                </linearGradient>
              </defs>
              <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" fill="url(#loginSparkGrad)" />
            </svg>
          </div>

          <h2 className="font-heading font-semibold text-2xl text-white m-0 gemini-text-gradient tracking-tight">
            Sign in to DoNext AI
          </h2>

          <p className="text-sm text-gemini-text-muted leading-relaxed m-0 px-2">
            Unlock your personalized AI-powered productivity workspace. Store your roadmaps, customize priorities, and collaborate with the proactive advisor.
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="w-full mt-2 flex items-center justify-center gap-3 py-3 px-5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 font-bold transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#ea4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.327 2.682 1.345 6.6L5.266 9.765z"
              />
              <path
                fill="#4285f4"
                d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.445A5.51 5.51 0 0 1 12 18.091l3.918 3.127c2.291-2.11 3.572-5.19 3.572-8.945z"
              />
              <path
                fill="#fbbc05"
                d="M5.266 14.235L1.345 17.4A11.948 11.948 0 0 0 12 24c3.055 0 5.782-1.145 7.91-3L16 17.873a7.077 7.077 0 0 1-10.734-3.638z"
              />
              <path
                fill="#34a853"
                d="M1.345 6.6C.49 8.245 0 10.073 0 12s.49 3.755 1.345 5.4l3.92-3.164a7.077 7.077 0 0 1 0-4.473L1.345 6.6z"
              />
            </svg>
            <span className="text-sm">Sign in with Google</span>
          </button>

          <div className="flex flex-col items-center gap-1.5 mt-2">
            <button
              onClick={() => setShowLoginPage(false)}
              className="text-xs font-semibold text-gemini-purple hover:underline bg-transparent border-0 cursor-pointer"
            >
              Continue as Guest (Read-Only)
            </button>
            <span className="text-[10px] text-slate-500">
              Tasks cannot be created or saved in Guest mode
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gemini-bg text-gemini-text font-sans relative">
      {/* Animated Google Gemini style background glow blooms */}
      <div className="gemini-bg-glow-container">
        <div className="gemini-glow-blob gemini-glow-blob-1"></div>
        <div className="gemini-glow-blob gemini-glow-blob-2"></div>
        <div className="gemini-glow-blob gemini-glow-blob-3"></div>
      </div>

      {/* Gemini Promo Splash Entrance Overlay */}
      <div
        className={`fixed inset-0 bg-[#08090d] z-[999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          splashActive ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
        }`}
      >
        {/* Shimmering colored radial aurora glow */}
        <div className="absolute w-[450px] h-[450px] bg-gradient-to-tr from-gemini-blue/15 via-gemini-purple/15 to-gemini-pink/15 rounded-full blur-[90px] animate-rotate-glow"></div>

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Logo with pulsing glowing scale */}
          <div className="relative animate-gemini-spark">
            <svg viewBox="0 0 24 24" className="w-24 h-24 fill-current text-white">
              <defs>
                <linearGradient id="splashSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285f4" />
                  <stop offset="30%" stopColor="#9b72cb" />
                  <stop offset="70%" stopColor="#d96570" />
                  <stop offset="100%" stopColor="#f1ae44" />
                </linearGradient>
              </defs>
              <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" fill="url(#splashSparkGrad)" />
            </svg>
          </div>

          <h1 className="font-heading font-bold text-4xl tracking-widest text-white m-0 gemini-text-gradient">
            DONEXT AI
          </h1>

          <p className="text-[10px] tracking-widest text-gemini-text-muted uppercase font-semibold m-0">
            Productivity Powered by Gemini
          </p>

          {/* Shimmering Loader bar */}
          <div className="w-48 bg-white/5 h-1 rounded-full overflow-hidden mt-4 border border-white/5 relative">
            <div className="gemini-bg-gradient h-full rounded-full animate-loader-bar"></div>
          </div>
        </div>
      </div>

      {/* Canvas for completion celebration confetti */}
      <canvas id="confetti-canvas" className="pointer-events-none fixed inset-0 w-screen h-screen z-50"></canvas>

      {/* Slide-out AI Advisor Chat Drawer */}
      <div
        onClick={() => setShowAdvisor(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          showAdvisor ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      ></div>

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-gemini-bg-light/95 border-l border-gemini-border backdrop-blur-2xl z-50 transform transition-transform duration-300 flex flex-col justify-between shadow-2xl ${
          showAdvisor ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-gemini-border flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-gemini-purple animate-pulse">
              <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
            </svg>
            <h3 className="font-heading font-semibold text-lg text-white m-0">Gemini AI Advisor</h3>
          </div>
          <button
            onClick={() => setShowAdvisor(false)}
            className="text-gemini-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
                  m.sender === "user"
                    ? "bg-gemini-purple/20 text-white rounded-tr-none border border-gemini-purple/30"
                    : "bg-white/5 text-gemini-text rounded-tl-none border border-white/5"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 text-gemini-text rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-white/5 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gemini-purple animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions Quick Pills */}
        <div className="px-5 py-2.5 bg-black/10 border-t border-gemini-border overflow-x-auto flex gap-2 no-scrollbar">
          <button
            onClick={() => handleSendChatMessage("What should I do next?")}
            className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[11px] rounded-full text-white/80 border border-white/5 transition-all cursor-pointer"
          >
            📋 What's next?
          </button>
          <button
            onClick={() => handleSendChatMessage("Give me a study guide for SVMs")}
            className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[11px] rounded-full text-white/80 border border-white/5 transition-all cursor-pointer"
          >
            🎓 SVM Study Tips
          </button>
          <button
            onClick={() => handleSendChatMessage("Summarize my high priority tasks")}
            className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[11px] rounded-full text-white/80 border border-white/5 transition-all cursor-pointer"
          >
            🔥 Priority Summary
          </button>
        </div>

        {/* Chat input bar */}
        <div className="p-4 border-t border-gemini-border bg-white/5 flex gap-2">
          <input
            type="text"
            placeholder="Ask Advisor something..."
            className="flex-1 bg-white/5 border border-white/5 rounded-full px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-gemini-purple/50 transition-colors"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
          />
          <button
            onClick={() => handleSendChatMessage()}
            disabled={chatLoading || !chatInput.trim()}
            className="w-8 h-8 rounded-full gemini-bg-gradient flex items-center justify-center text-white hover:scale-105 disabled:opacity-50 cursor-pointer transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gamified Profile Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowProfileModal(false)} className="absolute inset-0 bg-black/75 backdrop-blur-md"></div>

          <div className="glass-card rounded-[28px] border border-gemini-border bg-gemini-bg-light/95 w-[92vw] sm:w-full sm:max-w-lg p-5 sm:p-6 relative z-10 animate-scale-in overflow-hidden shadow-2xl">
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center gap-3 min-w-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center font-heading font-extrabold text-2xl text-white shadow-lg shrink-0">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "P"}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-xl text-white m-0 truncate max-w-[240px]">
                    {user?.displayName || "Planner"}
                  </h3>
                  <span className="text-[11px] text-gemini-text-muted block mt-0.5 lowercase truncate max-w-[240px]">
                    {user?.email || ""}
                  </span>
                  <span className="text-[9px] bg-gemini-purple/20 text-gemini-purple font-semibold px-2 py-0.5 rounded-full border border-gemini-purple/35 mt-1.5 inline-block uppercase tracking-wider">
                    Elite Level Planner
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gemini-text-muted hover:text-white transition-colors cursor-pointer bg-white/5 border border-white/5 hover:border-white/10 rounded-full p-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 relative">
              <div className="text-center">
                <span className="text-[10px] text-gemini-text-muted uppercase font-bold tracking-wider">Deadlines</span>
                <p className="text-xl font-heading font-bold text-white mt-1">{tasks.length}</p>
              </div>
              <div className="text-center border-x border-white/5">
                <span className="text-[10px] text-gemini-text-muted uppercase font-bold tracking-wider">Completed</span>
                <p className="text-xl font-heading font-bold text-white mt-1">{completedTasksCount}</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-gemini-text-muted uppercase font-bold tracking-wider">Step Rate</span>
                <p className="text-xl font-heading font-bold text-gemini-purple mt-1">{totalProductivityScore}%</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 relative">
              <h4 className="text-xs font-semibold uppercase text-gemini-text-muted tracking-wider m-0">Your Achievements</h4>
              <div className="grid grid-cols-2 gap-3.5">
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    achievements.voicePioneer
                      ? "bg-gemini-blue/10 border-gemini-blue/30 text-white"
                      : "bg-white/5 border-white/5 opacity-55 text-gemini-text-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${achievements.voicePioneer ? "bg-gemini-blue/20 text-gemini-blue" : "bg-white/5"}`}>
                    🎙️
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold m-0 truncate">Voice Pioneer</h5>
                    <span className="text-[9px] block text-gemini-text-muted mt-0.5">Dictated a task</span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    achievements.focusMaster
                      ? "bg-gemini-pink/10 border-gemini-pink/30 text-white"
                      : "bg-white/5 border-white/5 opacity-55 text-gemini-text-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${achievements.focusMaster ? "bg-gemini-pink/20 text-gemini-pink" : "bg-white/5"}`}>
                    ⏱️
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold m-0 truncate">Focus Master</h5>
                    <span className="text-[9px] block text-gemini-text-muted mt-0.5">Run Focus Timer</span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    achievements.calendarSync
                      ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                      : "bg-white/5 border-white/5 opacity-55 text-gemini-text-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${achievements.calendarSync ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5"}`}>
                    📅
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold m-0 truncate">Cal Synchronizer</h5>
                    <span className="text-[9px] block text-gemini-text-muted mt-0.5">Exported an .ics</span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    achievements.deadlineConqueror
                      ? "bg-gemini-purple/10 border-gemini-purple/30 text-white"
                      : "bg-white/5 border-white/5 opacity-55 text-gemini-text-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${achievements.deadlineConqueror ? "bg-gemini-purple/20 text-gemini-purple" : "bg-white/5"}`}>
                    🏆
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold m-0 truncate">Conqueror</h5>
                    <span className="text-[9px] block text-gemini-text-muted mt-0.5">Finished a roadmap</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gemini-border pt-4 mt-6 relative">
              <h4 className="text-xs font-semibold uppercase text-gemini-text-muted tracking-wider mb-2.5 m-0">Gemini Engine Status</h4>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white">Google Gemini API</span>
                    <span className="text-[8px] bg-gemini-blue/10 text-gemini-blue font-bold px-1.5 py-0.5 rounded-full border border-gemini-blue/20">Free Tier</span>
                  </div>
                  <p className="text-[10px] text-gemini-text-muted m-0">Model: gemini-2.5-flash (Failover enabled)</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span className="text-[9px] font-semibold text-amber-400">Failsafe Mode</span>
                  </div>
                  <span className="text-[8px] text-gemini-text-muted">Simulated Fallback active</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 mt-2.5 leading-relaxed m-0 text-center">
                If the Gemini API key runs out of daily credits, DoNext AI automatically failovers to the local failsafe roadmap generator to guarantee uninterrupted presentations.
              </p>
              {googleAccessToken ? (
                <button
                  onClick={handleExportStatsToGoogleSheets}
                  disabled={googleSyncing.sheets}
                  className="w-full mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 font-semibold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {googleSyncing.sheets ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5 fill-current text-emerald-400" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM6 6h5v5H6V6zm0 7h5v5H6v-5zm12 5h-5v-2h5v2zm0-4h-5v-2h5v2zm0-4h-5V6h5v3z"/>
                    </svg>
                  )}
                  <span>Export Roadmaps to Google Sheets</span>
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full mt-4 bg-gemini-purple/10 hover:bg-gemini-purple/20 text-gemini-purple border border-gemini-purple/25 font-semibold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 fill-current text-gemini-purple" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3 0.6 4.6 1.7l2.4-2.4C17.3 1.5 14.9 0.7 12.24 0.7 6.033 0.7 1 5.733 1 12s5.033 11.3 11.24 11.3c6.47 0 10.77-4.5 10.77-10.9 0-.74-.08-1.3-.23-1.89H12.24z"/>
                  </svg>
                  <span>Connect Google Workspace API</span>
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-semibold py-2 px-4 rounded-full text-xs transition-colors cursor-pointer"
              >
                Sign Out from Google Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden transition-opacity"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 border-r border-gemini-border bg-gemini-bg-light/40 backdrop-blur-md p-5 flex flex-col justify-between z-40 transition-all duration-300 relative ${
          sidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full md:translate-x-0 md:p-3"
        }`}
      >
        <div className="space-y-8">
          {/* Logo */}
          <div className={`flex items-center gap-3 ${sidebarOpen ? "" : "justify-center"}`}>
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-gemini-blue to-gemini-pink rounded-full blur-sm opacity-70"></div>
              <svg viewBox="0 0 24 24" className="w-8 h-8 relative fill-current text-white animate-float">
                <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
              </svg>
            </div>
            {sidebarOpen && (
              <span className="font-heading font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                DoNext AI
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            <a
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-full bg-gemini-card-hover text-white font-medium transition-all ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title="Dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 opacity-90 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              {sidebarOpen && <span>Dashboard</span>}
            </a>
            {sidebarOpen ? (
              <div className="px-4 py-2.5 text-xs font-semibold text-gemini-text-muted uppercase tracking-wider">
                Life Saver Hub
              </div>
            ) : (
              <div className="h-[1px] bg-gemini-border my-3"></div>
            )}
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-gemini-text-muted hover:text-white hover:bg-gemini-card-hover/40 transition-colors cursor-pointer ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title="Task Manager"
            >
              <span className="w-2 h-2 rounded-full bg-gemini-blue shrink-0"></span>
              {sidebarOpen && <span>Task Manager</span>}
            </div>
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-gemini-text-muted hover:text-white hover:bg-gemini-card-hover/40 transition-colors cursor-pointer ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title="Pomodoro Timer"
            >
              <span className="w-2 h-2 rounded-full bg-gemini-purple shrink-0"></span>
              {sidebarOpen && <span>Pomodoro Timer</span>}
            </div>
            <div
              onClick={() => setShowAdvisor(true)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-gemini-text-muted hover:text-white hover:bg-gemini-card-hover/40 transition-colors cursor-pointer ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title="AI Advisor"
            >
              <span className="w-2 h-2 rounded-full bg-gemini-pink animate-pulse shrink-0"></span>
              {sidebarOpen && <span>AI Advisor</span>}
            </div>
          </nav>
        </div>

        {/* Profile Card Trigger Modal or Sign In Button */}
        {user ? (
          <div
            onClick={() => setShowProfileModal(true)}
            className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer ${
              sidebarOpen ? "" : "justify-center"
            }`}
            title="Open Profile Dashboard"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover shadow-md shrink-0 border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gemini-blue via-gemini-purple to-gemini-pink flex items-center justify-center font-heading font-bold text-white shadow-md shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : "P"}
              </div>
            )}
            {sidebarOpen && (
              <div className="min-w-0">
                <h4 className="font-medium text-sm text-white truncate">{user.displayName || "Planner"}</h4>
                <span className="text-xs text-gemini-text-muted flex items-center gap-1">
                  <span>Profile</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLoginPage(true)}
            className={`flex items-center gap-2.5 p-3 rounded-2xl bg-white text-neutral-800 font-bold hover:bg-neutral-100 transition-all cursor-pointer shadow-md ${
              sidebarOpen ? "w-full justify-center text-xs" : "w-10 h-10 justify-center p-0 rounded-full shrink-0"
            }`}
            title="Sign In with Google"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#ea4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.327 2.682 1.345 6.6L5.266 9.765z"
              />
              <path
                fill="#4285f4"
                d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.445A5.51 5.51 0 0 1 12 18.091l3.918 3.127c2.291-2.11 3.572-5.19 3.572-8.945z"
              />
              <path
                fill="#fbbc05"
                d="M5.266 14.235L1.345 17.4A11.948 11.948 0 0 0 12 24c3.055 0 5.782-1.145 7.91-3L16 17.873a7.077 7.077 0 0 1-10.734-3.638z"
              />
              <path
                fill="#34a853"
                d="M1.345 6.6C.49 8.245 0 10.073 0 12s.49 3.755 1.345 5.4l3.92-3.164a7.077 7.077 0 0 1 0-4.473L1.345 6.6z"
              />
            </svg>
            {sidebarOpen && <span>Sign In</span>}
          </button>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="h-20 border-b border-gemini-border px-4 sm:px-8 flex items-center justify-between animate-fade-in-up delay-75">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer shrink-0"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-heading font-semibold text-lg sm:text-2xl tracking-tight m-0 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate max-w-[130px] min-[360px]:max-w-[160px] sm:max-w-none">
              Last-Minute Life Saver
            </h1>
            <span className="h-5 w-[1px] bg-gemini-border shrink-0"></span>
            <div className="hidden min-[480px]:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-400">Gemini 2.5 Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-gemini-text-muted block">Global Subtask Rate</span>
              <span className="text-sm font-semibold text-white">{totalProductivityScore}%</span>
            </div>
            <div
              onClick={() => setShowAdvisor(true)}
              className="w-10 h-10 rounded-full glass-card flex items-center justify-center border border-white/10 hover:border-white/20 cursor-pointer"
              title="Chat with AI Advisor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          {/* Welcome Header */}
          <div className="space-y-1 sm:space-y-2 animate-fade-in-up delay-100">
            <h2 className="font-heading font-semibold text-2xl sm:text-3xl tracking-tight text-white m-0">
              Welcome back, <span className="gemini-text-gradient font-extrabold">{user?.displayName?.split(" ")[0] || "Guest"}</span>
            </h2>
            <p className="text-gemini-text-muted text-xs sm:text-sm max-w-2xl">
              Beat the deadline panic. Dictate tasks hands-free, receive proactive AI planning, sort roadmaps by priority, and stay focused with our integrated Pomodoro.
            </p>
          </div>

          {/* Core Stats */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in-up delay-150">
            {/* Card 1: Today's Focus */}
            <div className="glass-card rounded-2xl p-5 border border-gemini-border flex flex-col justify-between min-h-[135px]">
              <div>
                <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider">Today's Focus</span>
                <p className="text-base font-medium mt-2 text-white line-clamp-2">
                  {activeTask ? activeTask.title : "Add a task to set focus"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gemini-blue mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Select task card to change focus</span>
              </div>
            </div>

            {/* Card 2: Upcoming Deadlines */}
            <div className="glass-card rounded-2xl p-5 border border-gemini-border flex flex-col justify-between min-h-[135px]">
              <div>
                <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider">Urgent Deadline</span>
                {nearestTask ? (
                  <div>
                    <p className="text-base font-medium mt-2 text-white line-clamp-1">{nearestTask.title}</p>
                    <p className="text-sm font-semibold text-gemini-pink mt-0.5">{daysRemaining} Days Left</p>
                  </div>
                ) : (
                  <p className="text-base font-medium mt-2 text-white">All tasks cleared!</p>
                )}
              </div>
              <div className="text-xs text-gemini-text-muted mt-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gemini-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Calculated dynamically</span>
              </div>
            </div>

            {/* Card 3: Productivity Score */}
            <div className="glass-card rounded-2xl p-5 border border-gemini-border flex items-center justify-between min-h-[135px]">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider block">Completed Subtasks</span>
                <span className="text-3xl font-heading font-bold text-white block">{totalProductivityScore}%</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span>{completedSubtasks} / {totalSubtasks} complete</span>
                </span>
              </div>
              {/* Circular Gauge */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/5" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className="text-gemini-purple transition-all duration-500 ease-out"
                    strokeDasharray={`${totalProductivityScore}, 100`}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-semibold text-white">{totalProductivityScore}%</span>
              </div>
            </div>

            {/* Card 4: Tasks Completed */}
            <div className="glass-card rounded-2xl p-5 border border-gemini-border flex flex-col justify-between min-h-[135px]">
              <div>
                <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider">High Level Tasks</span>
                <p className="text-3xl font-heading font-bold mt-2 text-white">
                  {completedTasksCount} <span className="text-lg font-normal text-gemini-text-muted">/ {tasks.length}</span>
                </p>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-gemini-blue to-gemini-purple h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* Workspace Layout */}
          <section className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Left/Central Column: Task Manager, Add Task, and Roadmap Checklist */}
            <div className="lg:col-span-8 space-y-6 sm:space-y-8 animate-fade-in-up delay-200">
              {/* Task list selection cards */}
              <div className="glass-card rounded-2xl p-4 sm:p-6 border border-gemini-border">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="font-heading font-semibold text-lg text-white m-0">Your Active Deadlines</h3>
                  <button
                    onClick={handleSmartSort}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gemini-blue/35 bg-gemini-blue/10 hover:bg-gemini-blue/20 text-gemini-blue cursor-pointer transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span>AI Smart Sort</span>
                  </button>
                </div>

                {/* Filter Capsule Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  {["All", "Active", "Urgent", "Completed"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        filter === f
                          ? "bg-white/12 border-white/20 text-white"
                          : "bg-transparent border-gemini-border hover:bg-white/5 text-gemini-text-muted hover:text-white"
                      }`}
                    >
                      {f} Tasks
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredTasks.map((t) => {
                    const isSelected = t.id === activeTaskId;
                    const subDone = t.subtasks ? t.subtasks.filter((st) => st.completed).length : 0;
                    const subTotal = t.subtasks ? t.subtasks.length : 0;
                    const taskPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setActiveTaskId(t.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                          isSelected
                            ? "bg-gemini-card-hover border-gemini-border-hover"
                            : "bg-gemini-card border-gemini-border hover:bg-gemini-card-hover/40"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              t.priority === "High"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : t.priority === "Medium"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToICS(t);
                              }}
                              className="text-gemini-text-muted hover:text-gemini-blue transition-colors p-0.5 cursor-pointer"
                              title="Export to Calendar (.ics)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(t.id, e)}
                              className="text-gemini-text-muted hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                              title="Delete task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <h4 className={`font-semibold text-sm line-clamp-1 ${t.completed ? "line-through text-gemini-text-muted" : "text-white"}`}>
                          {t.title}
                        </h4>
                        <p className="text-xs text-gemini-text-muted mt-1">Due: {t.deadline}</p>

                        <div className="flex items-center justify-between mt-3 text-[11px] text-gemini-text-muted font-medium">
                          <span>Progress</span>
                          <span>{taskPct}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-gemini-blue to-gemini-purple h-full rounded-full transition-all duration-300"
                            style={{ width: `${taskPct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="sm:col-span-2 text-center py-6 text-gemini-text-muted text-xs">
                      No tasks found in "{filter}" filter category.
                    </div>
                  )}
                </div>
              </div>

              {/* Add Task Prompt Box */}
              <AddTask onAddTask={handleAddTask} user={user} onSignIn={() => setShowLoginPage(true)} googleAccessToken={googleAccessToken} />

              {/* Checklist Roadmap */}
              {activeTask ? (
                <div className="glass-card border border-gemini-border rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gemini-border/40 pb-4">
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-lg text-white m-0 flex items-center gap-2 flex-wrap">
                        <span>Roadmap: {activeTask.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                          activeTask.priority === "High"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : activeTask.priority === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {activeTask.priority}
                        </span>
                      </h3>
                      {activeTask.description && (
                        <p className="text-xs text-gemini-text-muted mt-2 leading-relaxed max-w-xl">
                          {activeTask.description}
                        </p>
                      )}
                      
                      {activeTask.googleDriveFile && (
                        <div className="flex items-center gap-2 mt-3">
                          <a
                            href={activeTask.googleDriveFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] bg-gemini-blue/15 border border-gemini-blue/30 text-gemini-blue rounded-full px-3 py-1 flex items-center gap-1.5 hover:bg-gemini-blue/20 transition-all font-medium"
                            title="Open file in Google Drive"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 12H7v-2h6v2zm3-4H7V9h9v2z" />
                            </svg>
                            <span className="truncate max-w-[200px]">{activeTask.googleDriveFile.name}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Google Action buttons for activeTask */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSyncToGoogleTasks(activeTask)}
                        disabled={googleSyncing.tasks}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
                        title="Sync task list to Google Tasks"
                      >
                        {googleSyncing.tasks ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3 fill-current text-emerald-400" viewBox="0 0 24 24">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                          </svg>
                        )}
                        <span>Sync Tasks</span>
                      </button>

                      <button
                        onClick={() => handleScheduleOnGoogleCalendar(activeTask)}
                        disabled={googleSyncing.calendar}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
                        title="Schedule 30-min study slot on Google Calendar"
                      >
                        {googleSyncing.calendar ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3 fill-none stroke-current text-blue-400" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span>Schedule Block</span>
                      </button>

                      <button
                        onClick={() => handleCreateMeetRoom(activeTask)}
                        disabled={googleSyncing.meet}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
                        title="Generate ad-hoc Google Meet group study room link"
                      >
                        {googleSyncing.meet ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3 fill-none stroke-current text-purple-400" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span>Instant Meet</span>
                      </button>
                    </div>
                  </div>

                  <TaskPlan plan={activeTask.subtasks || []} onToggleTask={handleToggleSubtask} />
                </div>
              ) : (
                <div className="glass-card border border-gemini-border rounded-2xl p-6 text-center text-gemini-text-muted text-sm">
                  Add a task above to generate your first AI roadmap!
                </div>
              )}
            </div>

            {/* Right Column: AI Proactive Advisor & Pomodoro Timer */}
            <div className="lg:col-span-4 space-y-6 sm:space-y-8 animate-fade-in-up delay-300">
              {/* AI Recommendation Widget */}
              <div className="glass-card rounded-2xl p-4 sm:p-6 border border-gemini-border relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-4 relative">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gemini-purple/10 border border-gemini-purple/20">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gemini-purple animate-pulse">
                      <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
                    </svg>
                  </div>
                  <h3 className="font-heading font-medium text-lg text-white m-0">
                    Proactive AI Advisor
                  </h3>
                </div>

                {loadingRecommendation ? (
                  <div className="space-y-2 py-2">
                    <div className="h-4 bg-white/5 rounded gemini-shimmer-wave w-full"></div>
                    <div className="h-4 bg-white/5 rounded gemini-shimmer-wave w-5/6"></div>
                    <div className="h-4 bg-white/5 rounded gemini-shimmer-wave w-3/4"></div>
                  </div>
                ) : (
                  <p className="text-gemini-text/90 text-sm leading-relaxed relative m-0">
                    {aiRecommendation}
                  </p>
                )}
              </div>

              {/* Focus Timer Widget */}
              <div className="glass-card rounded-2xl p-4 sm:p-6 border border-gemini-border text-center relative overflow-hidden">
                <h3 className="font-heading font-medium text-lg text-white mb-4 text-left flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gemini-pink animate-pulse"></span>
                  Pomodoro Focus Session
                </h3>

                <div className="flex flex-col items-center py-4">
                  {/* Circular Dial */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/5" stroke="currentColor" strokeWidth="2.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path
                        className="text-gemini-pink transition-all duration-300"
                        strokeDasharray={`${(timeLeft / (timerMode === "Focus" ? 1500 : 300)) * 100}, 100`}
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-heading font-bold text-white tracking-wide">
                        {formatTime(timeLeft)}
                      </span>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-gemini-pink mt-1">
                        {timerMode} Mode
                      </span>
                    </div>
                  </div>

                  {/* Timer Action Buttons */}
                  <div className="flex items-center gap-4 mt-6">
                    <button
                      onClick={toggleTimer}
                      className={`px-5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                        timerActive
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          : "gemini-bg-gradient text-white border-transparent hover:scale-105 shadow-md shadow-gemini-pink/20"
                      }`}
                    >
                      {timerActive ? "Pause Timer" : "Start Focus"}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-white/5 bg-white/5 text-gemini-text-muted hover:text-white cursor-pointer hover:bg-white/10 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;