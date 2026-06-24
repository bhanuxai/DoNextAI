function TaskPlan() {
  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-6">
        🤖 AI Generated Plan
      </h2>

      <div className="space-y-3">

        <div className="bg-slate-800 p-4 rounded-xl">
          ✅ Research Requirements
        </div>

        <div className="bg-slate-800 p-4 rounded-xl">
          🎨 Design UI
        </div>

        <div className="bg-slate-800 p-4 rounded-xl">
          ⚙ Setup Backend
        </div>

        <div className="bg-slate-800 p-4 rounded-xl">
          🤖 Integrate Gemini API
        </div>

        <div className="bg-slate-800 p-4 rounded-xl">
          🧪 Testing
        </div>

        <div className="bg-slate-800 p-4 rounded-xl">
          🚀 Deployment
        </div>

      </div>
    </div>
  );
}

export default TaskPlan;