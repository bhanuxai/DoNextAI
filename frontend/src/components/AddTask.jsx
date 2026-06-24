import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AddTask({ onAddTask, user, onSignIn, googleAccessToken }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [showDesc, setShowDesc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);

  // Load Google Picker API dynamically
  useEffect(() => {
    if (!window.gapi) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load("picker", () => {
          console.log("Google Picker API loaded.");
        });
      };
      document.body.appendChild(script);
    } else {
      window.gapi.load("picker");
    }
  }, []);

  const handleDrivePicker = () => {
    if (!googleAccessToken) {
      alert("Please connect your Google Workspace account to attach Google Drive files.");
      return;
    }

    if (!window.google || !window.google.picker) {
      alert("Google Drive Picker library is still loading. Please try again in a moment.");
      return;
    }

    try {
      const developerKey = "AIzaSyBns0Ll9lj7PC41gWDd_K4VgsQ-qrh4HBc"; 
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(googleAccessToken)
        .setDeveloperKey(developerKey)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            setAttachedFile({
              id: doc.id,
              name: doc.name,
              url: doc.url,
            });
          }
        })
        .build();
      
      picker.setVisible(true);
    } catch (err) {
      console.error("Error launching Google Picker:", err);
      alert("Failed to open Google Drive Picker. Please check popups and authorization.");
    }
  };

  const recognitionRef = useRef(null);

  const handleInteraction = (e) => {
    if (!user) {
      if (e && e.target) {
        e.target.blur();
      }
      alert("Login to use: Please sign in with Google to create tasks and generate AI roadmaps!");
      onSignIn();
      return true;
    }
    return false;
  };

  // Web Speech API Voice Dictation
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in your browser. Please try Google Chrome or MS Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceUsed(true); // Mark that voice was utilized for this task
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setTitle((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      recognition.start();
    }
  };

  const generatePlan = async () => {
    if (!user) {
      alert("Login to use: Please sign in with Google to create tasks and generate AI roadmaps!");
      onSignIn();
      return;
    }

    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }

    setLoading(true);
    try {
      let taskPrompt = title;
      if (description) taskPrompt += `. Description: ${description}`;
      if (attachedFile) taskPrompt += `. Linked Reference Document: ${attachedFile.name}`;
      if (deadline) taskPrompt += `. Deadline: ${deadline}`;
      if (priority) taskPrompt += `. Priority: ${priority}`;

      const response = await axios.post(
        `${API_BASE_URL}/api/planner`,
        {
          task: taskPrompt,
        }
      );

      const subtasksList = response.data.plan.map((st, idx) => ({
        id: idx,
        title: st,
        completed: false,
      }));

      const finalDeadline = deadline || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const newTask = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        deadline: finalDeadline,
        priority,
        completed: false,
        subtasks: subtasksList,
        createdViaVoice: voiceUsed, // Tag voice usage
        googleDriveFile: attachedFile,
      };

      onAddTask(newTask);

      // Reset prompt input bar
      setTitle("");
      setDescription("");
      setDeadline("");
      setPriority("Medium");
      setShowDesc(false);
      setVoiceUsed(false); // Reset voice flag
      setAttachedFile(null); // Reset attached file
    } catch (error) {
      console.error(error);
      alert("Failed to generate task plan. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="glass-card rounded-[28px] p-5 border border-gemini-border focus-within:border-gemini-purple/40 focus-within:ring-2 focus-within:ring-gemini-purple/10 transition-all duration-300">
        <div className="flex flex-col gap-3">
          {/* Main Title Input & Speech Mic */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={(e) => {
                if (handleInteraction(e)) return;
                toggleListening();
              }}
              className={`mt-1.5 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isListening
                  ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
                  : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-gemini-text-muted hover:text-white"
              }`}
              title={isListening ? "Listening... Click to stop" : "Dictate task (Voice Input)"}
            >
              {isListening ? (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <textarea
              rows="1"
              placeholder={isListening ? "Listening, speak now..." : "What task would you like to plan? Dictate or type here..."}
              className="w-full bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none resize-none min-h-[36px] text-[17px] font-sans pt-1"
              value={title}
              onFocus={handleInteraction}
              onChange={(e) => {
                if (!user) return;
                setTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (handleInteraction(e)) return;
                  generatePlan();
                }
              }}
            />
          </div>

          {/* Expandable Description Input */}
          {showDesc && (
            <div className="pl-11 pr-4 transition-all duration-300">
              <textarea
                rows="2"
                placeholder="Add additional details, guidelines or context (optional)..."
                className="w-full bg-transparent border-0 text-sm text-gemini-text-muted placeholder-slate-500 focus:outline-none resize-none min-h-[44px]"
                value={description}
                onFocus={handleInteraction}
                onChange={(e) => {
                  if (!user) return;
                  setDescription(e.target.value);
                }}
              />
            </div>
          )}

          {attachedFile && (
            <div className="pl-11 pr-4 flex items-center gap-2 mb-2">
              <span className="text-xs bg-gemini-blue/15 border border-gemini-blue/30 text-gemini-blue rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm shadow-gemini-blue/5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 12H7v-2h6v2zm3-4H7V9h9v2z" />
                </svg>
                <span className="truncate max-w-[180px] font-medium">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="hover:text-red-400 font-bold transition-colors cursor-pointer text-xs ml-1.5"
                  title="Remove linked file"
                >
                  ✕
                </button>
              </span>
            </div>
          )}

          {/* Divider Line */}
          <div className="h-[1px] bg-gemini-border/50 my-1"></div>

          {/* Controls & Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-11">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Input */}
              <div 
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    handleInteraction(e);
                  }
                }}
                className="flex items-center gap-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 rounded-full px-3 py-1.5 text-xs text-gemini-text-muted transition-all cursor-pointer relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  className="bg-transparent border-0 text-xs text-white focus:outline-none cursor-pointer w-[100px] h-[16px] p-0"
                  value={deadline}
                  onFocus={handleInteraction}
                  onChange={(e) => {
                    if (!user) return;
                    setDeadline(e.target.value);
                  }}
                />
              </div>

              {/* Priority Select */}
              <div 
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    handleInteraction(e);
                  }
                }}
                className="flex items-center gap-2 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 rounded-full px-3.5 py-1.5 text-xs text-gemini-text-muted transition-all cursor-pointer relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <select
                  className="bg-transparent border-0 text-xs text-white focus:outline-none cursor-pointer p-0"
                  value={priority}
                  onFocus={handleInteraction}
                  onChange={(e) => {
                    if (!user) return;
                    setPriority(e.target.value);
                  }}
                >
                  <option className="bg-gemini-bg text-white">Low</option>
                  <option className="bg-gemini-bg text-white">Medium</option>
                  <option className="bg-gemini-bg text-white">High</option>
                </select>
              </div>

              {/* Toggle Description */}
              <button
                type="button"
                onClick={(e) => {
                  if (handleInteraction(e)) return;
                  setShowDesc(!showDesc);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  showDesc
                    ? "bg-gemini-purple/10 border-gemini-purple/20 text-gemini-purple"
                    : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-gemini-text-muted hover:text-white"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span>{showDesc ? "Hide Notes" : "Add Notes"}</span>
              </button>

              {/* Google Drive Picker */}
              <button
                type="button"
                onClick={(e) => {
                  if (handleInteraction(e)) return;
                  handleDrivePicker();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  attachedFile
                    ? "bg-gemini-blue/10 border-gemini-blue/20 text-gemini-blue font-semibold hover:bg-gemini-blue/15"
                    : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-gemini-text-muted hover:text-white"
                }`}
                title="Attach study guides, slides or docs from Google Drive"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{attachedFile ? "File Linked" : "Add Drive File"}</span>
              </button>
            </div>

            {/* Submit / Generate Button */}
            <button
              onClick={(e) => {
                if (handleInteraction(e)) return;
                generatePlan();
              }}
              disabled={loading || (user && !title.trim())}
              className={`flex items-center justify-center rounded-full p-2.5 transition-all relative ${
                loading
                  ? "shimmer-bg cursor-not-allowed opacity-80"
                  : (!user || title.trim())
                  ? "gemini-bg-gradient hover:scale-105 shadow-lg shadow-gemini-purple/20 cursor-pointer text-white"
                  : "bg-white/5 cursor-not-allowed text-white/20"
              }`}
              title="Generate AI Plan"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                  <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddTask;