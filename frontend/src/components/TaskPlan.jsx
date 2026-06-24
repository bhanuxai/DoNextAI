import { useState } from "react";

function TaskPlan({ plan, onToggleTask }) {
  if (plan.length === 0) return null;

  const totalTasks = plan.length;
  const completedTasks = plan.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Smart status badge logic
  const getTaskStatus = (index) => {
    if (plan[index].completed) {
      return {
        label: "Completed",
        classes: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      };
    }
    // Check if it's the first incomplete task
    const prevTasks = plan.slice(0, index);
    const allPrevCompleted = prevTasks.every((t) => t.completed);
    if (allPrevCompleted) {
      return {
        label: "In Focus",
        classes: "text-gemini-blue bg-gemini-blue/10 border-gemini-blue/20 border-glow animate-pulse",
      };
    }
    return {
      label: "Upcoming",
      classes: "text-gemini-text-muted bg-white/5 border-white/5",
    };
  };

  return (
    <div className="glass-card border border-gemini-border rounded-2xl p-6 relative overflow-hidden">

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gemini-blue/10 border border-gemini-blue/20">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current text-gemini-blue animate-float">
            <path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
          </svg>
        </div>
        <h2 className="font-heading font-semibold text-xl text-white m-0">
          AI Generated Plan
        </h2>
      </div>

      {/* Progress Section */}
      <div className="mb-8 bg-white/5 border border-white/5 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider">Plan Progress</span>
          <span className="text-sm font-bold text-white">{progress}%</span>
        </div>

        <div className="w-full bg-white/5 rounded-full h-3.5 overflow-hidden p-[2px] border border-white/5">
          <div
            className="gemini-bg-gradient h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Step checklist */}
      <div className="space-y-3.5">
        {plan.map((task, index) => {
          const status = getTaskStatus(index);
          return (
            <div
              key={task.id !== undefined ? task.id : index}
              onClick={() => onToggleTask(task.id)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                task.completed
                  ? "bg-white/5 border-white/5 hover:bg-white/10 opacity-75"
                  : "bg-gemini-bg-light/35 border-gemini-border hover:border-white/20 hover:bg-gemini-bg-light/50"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Custom Checkbox */}
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    task.completed
                      ? "gemini-bg-gradient border-transparent text-white"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  {task.completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gemini-text-muted uppercase tracking-wider block mb-0.5">
                    Step {index + 1}
                  </span>
                  <p
                    className={`text-[15px] font-medium leading-normal transition-all truncate-2-lines m-0 ${
                      task.completed ? "text-gemini-text-muted line-through" : "text-white"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.classes} whitespace-nowrap`}>
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskPlan;