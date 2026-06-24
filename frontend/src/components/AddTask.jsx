import { useState } from "react";

function AddTask({ setPlan }) {
  const [task, setTask] = useState({
    title: "",
    deadline: "",
    priority: "Medium",
    description: "",
  });
  const generateMockPlan = () => {
  setPlan([
    "Research Requirements",
    "Design UI",
    "Setup Backend",
    "Integrate Gemini API",
    "Testing",
    "Deployment"
  ]);
};

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-6">
        ➕ Add New Task
      </h2>

      <div className="space-y-4">

        <input
          type="text"
          placeholder="Task Title"
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
          value={task.title}
          onChange={(e) =>
            setTask({ ...task, title: e.target.value })
          }
        />

        <input
          type="date"
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
          value={task.deadline}
          onChange={(e) =>
            setTask({ ...task, deadline: e.target.value })
          }
        />

        <select
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
          value={task.priority}
          onChange={(e) =>
            setTask({ ...task, priority: e.target.value })
          }
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <textarea
          rows="4"
          placeholder="Describe your task..."
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
          value={task.description}
          onChange={(e) =>
            setTask({ ...task, description: e.target.value })
          }
        />

        <button
  onClick={generateMockPlan}
  className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold"
>
  Generate AI Plan
</button>
      </div>
    </div>
  );
}

export default AddTask;