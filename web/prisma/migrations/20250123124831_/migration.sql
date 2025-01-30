-- AlterTable
ALTER TABLE "users" RENAME COLUMN "user_name" TO "handle";

-- RenameIndex
ALTER INDEX "users_user_name_key" RENAME TO "users_handle_key";
ALTER INDEX "users_user_name_idx" RENAME TO "users_handle_idx";