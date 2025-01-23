/*
  Warnings:

  - You are about to drop the column `icon` on the `users` table. All the data in the column will be lost.
  - Added the required column `image` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" RENAME COLUMN "icon" TO "image";
