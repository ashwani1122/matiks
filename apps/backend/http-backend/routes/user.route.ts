import { Router, type Request, type Response } from "express";
import { prisma } from "@repo/prisma/client";
import { auth } from "../middleware/middleware.route.ts";
// import { auth } from "../middleware/auth.ts";

export const userRoute = Router();


// GET /api/v1/users/me
userRoute.get(
  "/me",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: false,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        message: "User fetched successfully",
        data: {
          user,
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
