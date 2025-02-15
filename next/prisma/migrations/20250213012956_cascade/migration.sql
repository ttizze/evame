-- DropForeignKey
ALTER TABLE "gemini_api_keys" DROP CONSTRAINT "gemini_api_keys_user_id_fkey";

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
