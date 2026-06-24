function TaskPlan({ plan }) {
  if (plan.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-6">
        🤖 AI Generated Plan
      </h2>
      <div className="mb-6">
  <div className="flex justify-between mb-2">
    <span>Progress</span>
    <span>0%</span>
  </div>

  <div className="w-full bg-slate-800 rounded-full h-3">
    <div className="bg-blue-500 h-3 rounded-full w-0"></div>
  </div>
</div>

      <div className="space-y-3">
        {plan.map((task, index) => (
          <div
            key={index}
            className="bg-slate-800 p-4 rounded-xl"
          >
            <div className="flex items-center justify-between">
  <span>✅ {task}</span>
  <span className="text-green-400 text-sm">
    Ready
  </span>
</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskPlan;