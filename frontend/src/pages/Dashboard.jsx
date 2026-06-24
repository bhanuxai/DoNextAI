import { useState } from "react";
import AddTask from "../components/AddTask";
import TaskPlan from "../components/TaskPlan";

function Dashboard() {
  const [plan, setPlan] = useState([]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>DoNext AI</h1>

      <h2>Today's Focus</h2>
      <div>Complete Hackathon Dashboard UI</div>

      <h2>Upcoming Deadlines</h2>
      <div>Flipkart Grid - 5 Days Left</div>

      <h2>AI Recommendation</h2>
      <div>Start frontend development today.</div>

      <AddTask setPlan={setPlan} />
      <TaskPlan plan={plan} />
    </div>
  );
}

export default Dashboard;