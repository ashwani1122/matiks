import { Router, type Request, type Response } from "express";
import { prisma } from "@repo/prisma/client";
import { auth } from "../middleware/middleware.route.ts";
// import { auth } from "../middleware/auth.ts";

export const gameRoute = Router();


// ─────────────────────────────────────────────
// GET GAME HISTORY
// GET /api/v1/games
// ─────────────────────────────────────────────

gameRoute.get(
  "/",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      const games = await prisma.game.findMany({
        where: {
          gameMembers: {
            some: {
              userId,
            },
          },
        },

        include: {
          gameMembers: {
            select: {
              userId: true,
              score: true,
              correctAnswers: true,
              status: true,

              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },

        orderBy: {
          startedAt: "desc",
        },

        take: 50,
      });

      return res.status(200).json({
        message: "Games fetched successfully",
        data: {
          games,
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
// GET SINGLE GAME
// GET /api/v1/games/:gameId
// ─────────────────────────────────────────────

gameRoute.get(
  "/:gameId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { gameId } = req.params;

      const game = await prisma.game.findFirst({
        where: {
          id: gameId,

          gameMembers: {
            some: {
              userId,
            },
          },
        },

        include: {
          gameMembers: {
            select: {
              userId: true,
              score: true,
              correctAnswers: true,
              status: true,

              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },

          questions: true,

          memoryQuestions: true,
        },
      });

      if (!game) {
        return res.status(404).json({
          message: "Game not found",
        });
      }

      return res.status(200).json({
        message: "Game fetched successfully",
        data: {
          game,
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
