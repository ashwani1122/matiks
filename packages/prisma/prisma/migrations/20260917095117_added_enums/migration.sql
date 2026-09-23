/*
  Warnings:

  - Added the required column `status` to the `GameMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rating` to the `UserRating` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('RUNNING', 'ENDED', 'SEARCHING_FOR_PLAYERS');

-- CreateEnum
CREATE TYPE "GameMemberStatus" AS ENUM ('WON', 'LOST');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'SEARCHING_FOR_PLAYERS',
ALTER COLUMN "startedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GameMember" ADD COLUMN     "status" "GameMemberStatus" NOT NULL;

-- AlterTable
ALTER TABLE "UserRating" ADD COLUMN     "rating" INTEGER NOT NULL;
