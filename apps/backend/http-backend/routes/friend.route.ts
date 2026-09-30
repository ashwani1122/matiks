import { Router, type Request, type Response } from "express";
import { prisma } from "@repo/prisma/client";
import { auth } from "../middleware/middleware.route.ts";
// import { auth } from "../middleware/auth.ts";

export const friendRoute = Router();


// ─────────────────────────────────────────────
// GET FRIENDS
// GET /api/v1/friends
// ─────────────────────────────────────────────

friendRoute.get(
  "/",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      const sent = await prisma.friends.findMany({
        where: {
          senderId: userId,
        },

        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      const received = await prisma.friends.findMany({
        where: {
          receiverId: userId,
        },

        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        message: "Friends fetched successfully",

        data: {
          sent,
          received,
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
// SEND FRIEND REQUEST
// POST /api/v1/friends/:userId
// ─────────────────────────────────────────────

friendRoute.post(
  "/:userId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const senderId = req.userId;
      const receiverId = req.params.userId;

      if (senderId === receiverId) {
        return res.status(400).json({
          message: "You cannot send a friend request to yourself",
        });
      }

      const receiver = await prisma.user.findUnique({
        where: {
          id: receiverId,
        },
      });

      if (!receiver) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const existing = await prisma.friends.findFirst({
        where: {
          OR: [
            {
              senderId,
              receiverId,
            },
            {
              senderId: receiverId,
              receiverId: senderId,
            },
          ],
        },
      });

      if (existing) {
        return res.status(400).json({
          message: "Friend request already exists",
        });
      }

      const friendRequest = await prisma.friends.create({
        data: {
          senderId,
          receiverId,
          status: "PENDING",
        },
      });

      return res.status(201).json({
        message: "Friend request sent",
        data: {
          friendRequest,
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
// ACCEPT / REJECT FRIEND REQUEST
// PATCH /api/v1/friends/:friendId
// ─────────────────────────────────────────────

friendRoute.patch(
  "/:friendId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { friendId } = req.params;

      const { status } = req.body;

      if (status !== "ACCEPTED" && status !== "REJECTED") {
        return res.status(400).json({
          message: "Status must be ACCEPTED or REJECTED",
        });
      }

      const friendRequest = await prisma.friends.findFirst({
        where: {
          id: friendId,
          receiverId: userId,
          status: "PENDING",
        },
      });

      if (!friendRequest) {
        return res.status(404).json({
          message: "Friend request not found",
        });
      }

      const updated = await prisma.friends.update({
        where: {
          id: friendId,
        },

        data: {
          status,
        },
      });

      return res.status(200).json({
        message: `Friend request ${status.toLowerCase()}`,
        data: {
          friendRequest: updated,
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
// DELETE FRIEND / REQUEST
// DELETE /api/v1/friends/:friendId
// ─────────────────────────────────────────────

friendRoute.delete(
  "/:friendId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { friendId } = req.params;

      const friendship = await prisma.friends.findFirst({
        where: {
          id: friendId,

          OR: [
            {
              senderId: userId,
            },
            {
              receiverId: userId,
            },
          ],
        },
      });

      if (!friendship) {
        return res.status(404).json({
          message: "Friend relationship not found",
        });
      }

      await prisma.friends.delete({
        where: {
          id: friendId,
        },
      });

      return res.status(200).json({
        message: "Friend removed successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);
