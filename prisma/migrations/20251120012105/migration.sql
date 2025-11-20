/*
  Warnings:

  - You are about to drop the column `weight` on the `segment_types` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "segment_types" DROP COLUMN "weight";

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "segment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
