/*
  Warnings:

  - A unique constraint covering the columns `[metron_id]` on the table `comics` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "comics" ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "metron_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "comics_metron_id_key" ON "comics"("metron_id");
