function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold">DoNext AI 🚀</h1>
          <p className="text-slate-400 mt-2">
            Know exactly what to do next.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <h3 className="text-slate-400 text-sm">Today's Focus</h3>
            <p className="text-xl font-semibold mt-2">
              Complete Dashboard UI
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <h3 className="text-slate-400 text-sm">Upcoming Deadline</h3>
            <p className="text-xl font-semibold mt-2">
              Flipkart Grid
            </p>
            <p className="text-red-400 mt-1">
              5 Days Left
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <h3 className="text-slate-400 text-sm">Productivity Score</h3>
            <p className="text-3xl font-bold mt-2">
              82%
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <h3 className="text-slate-400 text-sm">Tasks Completed</h3>
            <p className="text-3xl font-bold mt-2">
              7
            </p>
          </div>

        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4">
              🤖 AI Recommendation
            </h2>

            <p className="text-slate-300">
              Focus on frontend development today.
              Backend can be completed tomorrow.
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4">
              🎯 Do Next
            </h2>

            <p className="text-slate-300">
              Complete the Add Task screen.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;