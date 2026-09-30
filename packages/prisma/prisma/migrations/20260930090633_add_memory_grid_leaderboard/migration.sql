/*
  Warnings:

  - You are about to drop the `UserRating` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,gameId]` on the table `GameMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('MATH_DUEL', 'MEMORY_GRID');

-- DropForeignKey
ALTER TABLE "UserRating" DROP CONSTRAINT "UserRating_userId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "type" "GameType" NOT NULL,
ALTER COLUMN "startedAt" DROP NOT NULL,
ALTER COLUMN "endedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GameMember" ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuestionAnswer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "UserRating";

-- CreateTable
CREATE TABLE "MemoryQuestion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "pattern" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryAnswer" (
    "id" TEXT NOT NULL,
    "memoryQuestionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedCells" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryQuestion_gameId_idx" ON "MemoryQuestion"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryQuestion_gameId_questionNumber_key" ON "MemoryQuestion"("gameId", "questionNumber");

-- CreateIndex
CREATE INDEX "MemoryAnswer_gameId_idx" ON "MemoryAnswer"("gameId");

-- CreateIndex
CREATE INDEX "MemoryAnswer_userId_idx" ON "MemoryAnswer"("userId");

-- CreateIndex
CREATE INDEX "MemoryAnswer_memoryQuestionId_idx" ON "MemoryAnswer"("memoryQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryAnswer_memoryQuestionId_userId_key" ON "MemoryAnswer"("memoryQuestionId", "userId");

-- CreateIndex
CREATE INDEX "Leaderboard_gameType_rating_idx" ON "Leaderboard"("gameType", "rating");

-- CreateIndex
CREATE INDEX "Leaderboard_gameType_totalScore_idx" ON "Leaderboard"("gameType", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_userId_gameType_key" ON "Leaderboard"("userId", "gameType");

-- CreateIndex
CREATE INDEX "Friends_senderId_idx" ON "Friends"("senderId");

-- CreateIndex
CREATE INDEX "Friends_receiverId_idx" ON "Friends"("receiverId");

-- CreateIndex
CREATE INDEX "Game_type_idx" ON "Game"("type");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "GameMember_userId_idx" ON "GameMember"("userId");

-- CreateIndex
CREATE INDEX "GameMember_gameId_idx" ON "GameMember"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMember_userId_gameId_key" ON "GameMember"("userId", "gameId");

-- CreateIndex
CREATE INDEX "Question_gameId_idx" ON "Question"("gameId");

-- CreateIndex
CREATE INDEX "QuestionAnswer_questionId_idx" ON "QuestionAnswer"("questionId");

-- CreateIndex
CREATE INDEX "QuestionAnswer_gameId_idx" ON "QuestionAnswer"("gameId");

-- CreateIndex
CREATE INDEX "QuestionAnswer_userId_idx" ON "QuestionAnswer"("userId");

-- AddForeignKey
ALTER TABLE "MemoryQuestion" ADD CONSTRAINT "MemoryQuestion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryAnswer" ADD CONSTRAINT "MemoryAnswer_memoryQuestionId_fkey" FOREIGN KEY ("memoryQuestionId") REFERENCES "MemoryQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryAnswer" ADD CONSTRAINT "MemoryAnswer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryAnswer" ADD CONSTRAINT "MemoryAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
