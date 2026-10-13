/*
  Warnings:

  - You are about to drop the column `facebook_last_posted` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_listing_url` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_posting_status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_retry_count` on the `products` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "products_facebook_posting_status_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "facebook_last_posted",
DROP COLUMN "facebook_listing_url",
DROP COLUMN "facebook_posting_status",
DROP COLUMN "facebook_retry_count";

-- DropEnum
DROP TYPE "facebook_posting_status";
