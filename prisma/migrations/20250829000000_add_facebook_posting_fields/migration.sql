-- CreateEnum
CREATE TYPE "facebook_posting_status" AS ENUM ('NOT_POSTED', 'POSTING', 'POSTED', 'FAILED', 'NEEDS_UPDATE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "facebook_last_error" TEXT,
ADD COLUMN     "facebook_listing_url" TEXT,
ADD COLUMN     "facebook_posted_at" TIMESTAMP(3),
ADD COLUMN     "facebook_posting_status" "facebook_posting_status" NOT NULL DEFAULT 'NOT_POSTED',
ADD COLUMN     "facebook_retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_facebook_posting_status_idx" ON "products"("facebook_posting_status");