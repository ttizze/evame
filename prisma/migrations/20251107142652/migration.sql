-- AlterTable
ALTER TABLE "editions" RENAME CONSTRAINT "Edition_pkey" TO "editions_pkey";

-- AlterTable
ALTER TABLE "segment_types" RENAME CONSTRAINT "SegmentType_pkey" TO "segment_types_pkey";

-- RenameIndex
ALTER INDEX "SegmentType_key_key" RENAME TO "segment_types_key_key";
