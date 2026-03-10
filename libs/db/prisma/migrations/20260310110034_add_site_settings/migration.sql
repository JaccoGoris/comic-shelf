-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "collection_name" TEXT NOT NULL DEFAULT 'Comic Collection',

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
