/*
  Warnings:

  - A unique constraint covering the columns `[key,label]` on the table `segment_types` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "segment_types_key_idx" ON "segment_types"("key");

-- CreateIndex
CREATE INDEX "segment_types_label_idx" ON "segment_types"("label");

-- CreateIndex
CREATE UNIQUE INDEX "segment_types_key_label_key" ON "segment_types"("key", "label");
