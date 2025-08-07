-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "product_category" ADD VALUE 'WARDROBES';
ALTER TYPE "product_category" ADD VALUE 'DINING_SETS';
ALTER TYPE "product_category" ADD VALUE 'OFFICE_FURNITURE';
ALTER TYPE "product_category" ADD VALUE 'DECORATIVE_ITEMS';
ALTER TYPE "product_category" ADD VALUE 'LIGHTING';
ALTER TYPE "product_category" ADD VALUE 'STORAGE';

-- AlterTable
ALTER TABLE "order_requests" ADD COLUMN     "customer_notes" TEXT;
