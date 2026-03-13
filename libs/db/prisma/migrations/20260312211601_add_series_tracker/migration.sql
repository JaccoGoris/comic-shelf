-- Add MISSING to CollectionType enum
ALTER TYPE "CollectionType"
ADD
  VALUE 'MISSING';

-- Add metronSeriesId to Series model
ALTER TABLE
  "series"
ADD
  COLUMN "metron_series_id" INTEGER;

CREATE UNIQUE INDEX "series_metron_series_id_key" ON "series"("metron_series_id");

-- Create TrackedSeries model
CREATE TABLE "tracked_series" (
  "id" SERIAL NOT NULL,
  "metron_series_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "volume" INTEGER,
  "publisher" TEXT,
  "year_began" INTEGER,
  "issue_count" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracked_series_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracked_series_metron_series_id_key" ON "tracked_series"("metron_series_id");