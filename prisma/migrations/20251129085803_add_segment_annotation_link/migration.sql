-- CreateTable
CREATE TABLE "segment_annotation_links" (
    "main_segment_id" INTEGER NOT NULL,
    "annotation_segment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_annotation_links_pkey" PRIMARY KEY ("main_segment_id","annotation_segment_id")
);

-- CreateIndex
CREATE INDEX "segment_annotation_links_main_segment_id_idx" ON "segment_annotation_links"("main_segment_id");

-- CreateIndex
CREATE INDEX "segment_annotation_links_annotation_segment_id_idx" ON "segment_annotation_links"("annotation_segment_id");

-- AddForeignKey
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_main_segment_id_fkey" FOREIGN KEY ("main_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_annotation_segment_id_fkey" FOREIGN KEY ("annotation_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
