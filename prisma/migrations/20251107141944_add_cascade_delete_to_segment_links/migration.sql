-- DropForeignKey
ALTER TABLE "SegmentLink" DROP CONSTRAINT "SegmentLink_from_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "SegmentLink" DROP CONSTRAINT "SegmentLink_to_segment_id_fkey";

-- AddForeignKey
ALTER TABLE "SegmentLink" ADD CONSTRAINT "SegmentLink_from_segment_id_fkey" FOREIGN KEY ("from_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentLink" ADD CONSTRAINT "SegmentLink_to_segment_id_fkey" FOREIGN KEY ("to_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
