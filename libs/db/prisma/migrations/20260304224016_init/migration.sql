-- CreateEnum
CREATE TYPE "CreatorRole" AS ENUM ('WRITER', 'ARTIST', 'PENCILLER', 'INKER', 'COLORIST', 'COVER_ARTIST', 'LETTERER', 'EDITOR', 'CREATED_BY');

-- CreateEnum
CREATE TYPE "GenreType" AS ENUM ('GENRE', 'SUBGENRE');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('COLLECTION', 'WISHLIST');

-- CreateTable
CREATE TABLE "publishers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "publisher_id" INTEGER,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_arcs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "story_arcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comic_story_arcs" (
    "comic_id" INTEGER NOT NULL,
    "story_arc_id" INTEGER NOT NULL,

    CONSTRAINT "comic_story_arcs_pkey" PRIMARY KEY ("comic_id","story_arc_id")
);

-- CreateTable
CREATE TABLE "comic_creators" (
    "comic_id" INTEGER NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "role" "CreatorRole" NOT NULL,

    CONSTRAINT "comic_creators_pkey" PRIMARY KEY ("comic_id","creator_id","role")
);

-- CreateTable
CREATE TABLE "comic_characters" (
    "comic_id" INTEGER NOT NULL,
    "character_id" INTEGER NOT NULL,

    CONSTRAINT "comic_characters_pkey" PRIMARY KEY ("comic_id","character_id")
);

-- CreateTable
CREATE TABLE "comic_genres" (
    "comic_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,
    "type" "GenreType" NOT NULL DEFAULT 'GENRE',

    CONSTRAINT "comic_genres_pkey" PRIMARY KEY ("comic_id","genre_id","type")
);

-- CreateTable
CREATE TABLE "comics" (
    "id" SERIAL NOT NULL,
    "item_id" BIGINT NOT NULL,
    "barcode" TEXT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "cover_date" TEXT,
    "issue_number" TEXT,
    "legacy_number" TEXT,
    "volume" TEXT,
    "month" TEXT,
    "year" INTEGER,
    "variant_number" TEXT,
    "cover_letter" TEXT,
    "purchase_type" TEXT,
    "attributes" TEXT,
    "country" TEXT,
    "printing" TEXT,
    "print_run" INTEGER,
    "print_order_ratio" TEXT,
    "cover_price_raw" TEXT,
    "cover_price_cents" INTEGER,
    "cover_price_currency" TEXT,
    "cover_exclusive" TEXT,
    "era" TEXT,
    "language" TEXT,
    "type_of_comic" TEXT,
    "number_of_pages" INTEGER,
    "preordered" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "loaned_to" TEXT,
    "estimated_value" TEXT,
    "purchase_price_raw" TEXT,
    "purchase_price_cents" INTEGER,
    "purchase_price_currency" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchased_from" TEXT,
    "for_sale" BOOLEAN NOT NULL DEFAULT false,
    "sold_for" TEXT,
    "personal_rating" TEXT,
    "signed_by" TEXT,
    "condition" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "graded_by" TEXT,
    "graded_rating" TEXT,
    "graded_label_type" TEXT,
    "graded_serial_number" TEXT,
    "grader_notes" TEXT,
    "page_quality" TEXT,
    "storage_location" TEXT,
    "notes" TEXT,
    "owner" TEXT,
    "collection_name" TEXT,
    "date_added" TIMESTAMP(3),
    "collection_wishlist" "CollectionType",
    "publisher_id" INTEGER,
    "series_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publishers_name_key" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "series_name_publisher_id_key" ON "series"("name", "publisher_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_arcs_name_key" ON "story_arcs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "creators_name_key" ON "creators"("name");

-- CreateIndex
CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "comics_item_id_key" ON "comics"("item_id");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_story_arcs" ADD CONSTRAINT "comic_story_arcs_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_story_arcs" ADD CONSTRAINT "comic_story_arcs_story_arc_id_fkey" FOREIGN KEY ("story_arc_id") REFERENCES "story_arcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_creators" ADD CONSTRAINT "comic_creators_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_creators" ADD CONSTRAINT "comic_creators_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_characters" ADD CONSTRAINT "comic_characters_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_characters" ADD CONSTRAINT "comic_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_genres" ADD CONSTRAINT "comic_genres_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_genres" ADD CONSTRAINT "comic_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comics" ADD CONSTRAINT "comics_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comics" ADD CONSTRAINT "comics_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
