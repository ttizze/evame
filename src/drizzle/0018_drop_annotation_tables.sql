ALTER TABLE "segments" DROP CONSTRAINT "segments_segment_type_id_fkey";
--> statement-breakpoint
DROP TABLE "segment_annotation_links";--> statement-breakpoint
DROP TABLE "segment_metadata";--> statement-breakpoint
DROP TABLE "segment_metadata_types";--> statement-breakpoint
DROP TABLE "segment_types";--> statement-breakpoint
ALTER TABLE "segments" DROP COLUMN "segment_type_id";--> statement-breakpoint
DROP TYPE "public"."segment_type_key";
