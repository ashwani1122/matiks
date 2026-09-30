import { Router, type Request, type Response } from "express";
import { prisma } from "@repo/prisma/client";
import { auth } from "../middleware/middleware.route.ts";
// import { auth } from "../middleware/auth.ts";

export const leaderboardRoute = Router();


// ─────────────────────────────────────────────
// MATH DUEL LEADERBOARD
// GET /api/v1/leaderboard/math
// ─────────────────────────────────────────────

leaderboardRoute.get(
  "/math",
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(
        Number(req.query.limit) || 50,
        100,
      );

      const leaderboard = await prisma.leaderboard.findMany({
        where: {
          gameType: "MATH_DUEL",
        },

        select: {
          rating: true,
          gamesPlayed: true,
          wins: true,
          losses: true,
          totalScore: true,
          correctAnswers: true,

          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },

        orderBy: {
          rating: "desc",
        },

        take: limit,
      });

      return res.status(200).json({
        message: "Math leaderboard fetched successfully",
        data: {
          leaderboard,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);


// ─────────────────────────────────────────────
// MEMORY GRID LEADERBOARD
// GET /api/v1/leaderboard/memory
// ─────────────────────────────────────────────

leaderboardRoute.get(
  "/memory",
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(
        Number(req.query.limit) || 50,
        100,
      );

      const leaderboard = await prisma.leaderboard.findMany({
        where: {
          gameType: "MEMORY_GRID",
        },

        select: {
          rating: true,
          gamesPlayed: true,
          wins: true,
          losses: true,
          totalScore: true,
          correctAnswers: true,

          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },

        orderBy: {
          rating: "desc",
        },

        take: limit,
      });

      return res.status(200).json({
        message: "Memory leaderboard fetched successfully",
        data: {
          leaderboard,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);


// ─────────────────────────────────────────────
// MY LEADERBOARD STATS
// GET /api/v1/leaderboard/me
// ─────────────────────────────────────────────

leaderboardRoute.get(
  "/me",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      const leaderboard = await prisma.leaderboard.findMany({
        where: {
          userId,
        },

        select: {
          gameType: true,
          rating: true,
          gamesPlayed: true,
          wins: true,
          losses: true,
          totalScore: true,
          correctAnswers: true,
        },
      });

      return res.status(200).json({
        message: "Leaderboard stats fetched successfully",
        data: {
          leaderboard,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);
