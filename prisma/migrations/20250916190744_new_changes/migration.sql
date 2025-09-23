/*
  Warnings:

  - You are about to drop the column `facebook_last_error` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_listing_url` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_posted_at` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_posting_status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `facebook_retry_count` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `account_number` on the `profiles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "products_facebook_posting_status_idx";

-- AlterTable
ALTER TABLE "order_requests" ADD COLUMN     "referral_Manager" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "facebook_last_error",
DROP COLUMN "facebook_listing_url",
DROP COLUMN "facebook_posted_at",
DROP COLUMN "facebook_posting_status",
DROP COLUMN "facebook_retry_count";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "account_number";
