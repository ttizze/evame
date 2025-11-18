/*
  Warnings:

  - You are about to drop the `editions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `page_breaks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "page_breaks" DROP CONSTRAINT "page_breaks_segment_id_fkey";

-- DropTable
DROP TABLE "editions";

-- DropTable
DROP TABLE "page_breaks";

-- CreateTable
CREATE TABLE "segment_metadata_types" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "segment_metadata_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_metadata" (
    "id" SERIAL NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "metadata_type_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "segment_metadata_types_key_key" ON "segment_metadata_types"("key");

-- CreateIndex
CREATE INDEX "segment_metadata_metadata_type_id_idx" ON "segment_metadata"("metadata_type_id");

-- CreateIndex
CREATE INDEX "segment_metadata_segment_id_idx" ON "segment_metadata"("segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_metadata_segment_id_metadata_type_id_value_key" ON "segment_metadata"("segment_id", "metadata_type_id", "value");

-- AddForeignKey
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_metadata_type_id_fkey" FOREIGN KEY ("metadata_type_id") REFERENCES "segment_metadata_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
