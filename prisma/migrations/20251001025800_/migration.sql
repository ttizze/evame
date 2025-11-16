/*
  Warnings:

  - Added the required column `segment_type_id` to the `segments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."contents" ADD COLUMN     "import_file_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."segments" ADD COLUMN     "segment_type_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."SegmentType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SegmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SegmentLink" (
    "id" SERIAL NOT NULL,
    "from_segment_id" INTEGER NOT NULL,
    "to_segment_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageBreak" (
    "id" SERIAL NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "edition" TEXT NOT NULL,
    "page_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Edition" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."ImportRun" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportFile" (
    "id" SERIAL NOT NULL,
    "import_run_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportFile_pkey" PRIMARY KEY ("id")
);

-- Seed initial SegmentType data
INSERT INTO "public"."SegmentType" ("key", "label", "is_primary", "weight")
VALUES
    ('PRIMARY', 'Primary Text', true, 0);
-- Seed initial Edition data
INSERT INTO "public"."Edition" ("code", "label")
VALUES
    ('PTS', 'Pali Text Society'),
    ('VRI', 'Vipassanā Research Institute'),
    ('Thai', 'Thai Edition'),
    ('Myanmar', 'Myanmar Edition'),
    ('OUP', 'Oxford University Press');

-- Ensure existing segments point to PRIMARY segment type
UPDATE "public"."segments" SET "segment_type_id" = (
    SELECT "id" FROM "public"."SegmentType" WHERE "key" = 'PRIMARY'
);

-- Enforce NOT NULL after backfilling
ALTER TABLE "public"."segments" ALTER COLUMN "segment_type_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SegmentType_key_key" ON "public"."SegmentType"("key");

-- CreateIndex
CREATE INDEX "SegmentLink_from_segment_id_idx" ON "public"."SegmentLink"("from_segment_id");

-- CreateIndex
CREATE INDEX "SegmentLink_to_segment_id_idx" ON "public"."SegmentLink"("to_segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentLink_from_segment_id_to_segment_id_key" ON "public"."SegmentLink"("from_segment_id", "to_segment_id");

-- CreateIndex
CREATE INDEX "PageBreak_edition_page_code_idx" ON "public"."PageBreak"("edition", "page_code");

-- CreateIndex
CREATE INDEX "PageBreak_segment_id_edition_idx" ON "public"."PageBreak"("segment_id", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "PageBreak_segment_id_edition_page_code_key" ON "public"."PageBreak"("segment_id", "edition", "page_code");

-- AddForeignKey
ALTER TABLE "public"."contents" ADD CONSTRAINT "contents_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "public"."ImportFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."segments" ADD CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "public"."SegmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SegmentLink" ADD CONSTRAINT "SegmentLink_from_segment_id_fkey" FOREIGN KEY ("from_segment_id") REFERENCES "public"."segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SegmentLink" ADD CONSTRAINT "SegmentLink_to_segment_id_fkey" FOREIGN KEY ("to_segment_id") REFERENCES "public"."segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageBreak" ADD CONSTRAINT "PageBreak_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportFile" ADD CONSTRAINT "ImportFile_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "public"."ImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
