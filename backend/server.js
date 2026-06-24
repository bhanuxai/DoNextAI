import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import plannerRoute from "./routes/planner.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("DoNext AI Backend Running");
});
app.use("/api/planner", plannerRoute);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});