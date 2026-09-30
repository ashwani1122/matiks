import express, {
  type Express,
  type Request,
  type Response,
} from "express";

import cors from "cors";

import { authRoute } from "./routes/auth.route.ts";
import { userRoute } from "./routes/user.route.ts";
import { gameRoute } from "./routes/game.route.ts";
import { leaderboardRoute } from "./routes/leaderboard.route.ts";
import { friendRoute } from "./routes/friend.route.ts";

const app: Express = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Matiks HTTP backend is running",
  });
});

// Auth
app.use("/api/v1/auth", authRoute);

// Users
app.use("/api/v1/users", userRoute);

// Games
app.use("/api/v1/games", gameRoute);

// Leaderboard
app.use("/api/v1/leaderboard", leaderboardRoute);

// Friends
app.use("/api/v1/friends", friendRoute);

app.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});