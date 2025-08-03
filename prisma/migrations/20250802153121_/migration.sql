/*
  Warnings:

  - You are about to drop the column `session_state` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `token_type` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."accounts" DROP COLUMN "session_state",
DROP COLUMN "token_type",
DROP COLUMN "type";
