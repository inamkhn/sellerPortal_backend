/*
  Warnings:

  - The `status` column on the `order_settlements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrderSettlement_status" AS ENUM ('SETTLED', 'MANAGER_PENDING', 'PENDING', 'CANCELLED');

-- AlterTable
ALTER TABLE "order_settlements" DROP COLUMN "status",
ADD COLUMN     "status" "OrderSettlement_status" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "product_category";

-- CreateIndex
CREATE INDEX "order_settlements_status_idx" ON "order_settlements"("status");
