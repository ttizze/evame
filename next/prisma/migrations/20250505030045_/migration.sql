-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Progress" AS ENUM ('IDEA', 'WIP', 'REVIEW', 'RELEASED', 'FROZEN');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "progress" "Progress" NOT NULL DEFAULT 'IDEA',
ADD COLUMN     "status" "LifecycleStatus" NOT NULL DEFAULT 'DRAFT';
