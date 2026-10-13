/*
  Warnings:

  - You are about to drop the column `category_id` on the `custom_products` table. All the data in the column will be lost.
  - You are about to drop the column `delivering_date` on the `order_requests` table. All the data in the column will be lost.
  - You are about to drop the column `platform_cost` on the `order_requests` table. All the data in the column will be lost.
  - You are about to drop the column `product_cost` on the `order_requests` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "settlement_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "settlement_type" AS ENUM ('SELLER_PAYMENT', 'REFERRAL_PAYMENT', 'ADMIN_COMMISSION');

-- DropForeignKey
ALTER TABLE "custom_products" DROP CONSTRAINT "custom_products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_request_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_referrer_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropIndex
DROP INDEX "custom_products_category_id_idx";

-- DropIndex
DROP INDEX "products_category_id_idx";

-- AlterTable
ALTER TABLE "custom_products" DROP COLUMN "category_id";

-- AlterTable
ALTER TABLE "order_requests" DROP COLUMN "delivering_date",
DROP COLUMN "platform_cost",
DROP COLUMN "product_cost",
ADD COLUMN     "is_custom_product" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "product_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "category_id",
ADD COLUMN     "category" "product_category" NOT NULL;

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "payment_status";

-- DropEnum
DROP TYPE "payment_type";

-- CreateTable
CREATE TABLE "order_settlements" (
    "id" SERIAL NOT NULL,
    "order_request_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "product_cost" DECIMAL(10,2) NOT NULL,
    "admin_commission" DECIMAL(10,2) NOT NULL,
    "gross_seller_amount" DECIMAL(10,2) NOT NULL,
    "referral_commission" DECIMAL(10,2),
    "referral_commission_rate" DECIMAL(5,2),
    "is_fixed_commission" BOOLEAN NOT NULL DEFAULT false,
    "net_seller_amount" DECIMAL(10,2) NOT NULL,
    "referrer_id" INTEGER,
    "referrer_role" "role",
    "admin_settled_by" INTEGER,
    "admin_settled_at" TIMESTAMP(3),
    "referral_settled_by" INTEGER,
    "referral_settled_at" TIMESTAMP(3),
    "notes" TEXT,
    "status" "settlement_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" SERIAL NOT NULL,
    "order_settlement_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "settlement_type" "settlement_type" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "settlement_status" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "payment_proof" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_settlements_order_request_id_idx" ON "order_settlements"("order_request_id");

-- CreateIndex
CREATE INDEX "order_settlements_referrer_id_idx" ON "order_settlements"("referrer_id");

-- CreateIndex
CREATE INDEX "order_settlements_status_idx" ON "order_settlements"("status");

-- CreateIndex
CREATE INDEX "order_settlements_admin_settled_at_idx" ON "order_settlements"("admin_settled_at");

-- CreateIndex
CREATE INDEX "order_settlements_referral_settled_at_idx" ON "order_settlements"("referral_settled_at");

-- CreateIndex
CREATE INDEX "settlements_order_settlement_id_idx" ON "settlements"("order_settlement_id");

-- CreateIndex
CREATE INDEX "settlements_user_id_idx" ON "settlements"("user_id");

-- CreateIndex
CREATE INDEX "settlements_settlement_type_idx" ON "settlements"("settlement_type");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "order_requests_is_custom_product_idx" ON "order_requests"("is_custom_product");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- AddForeignKey
ALTER TABLE "order_settlements" ADD CONSTRAINT "order_settlements_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_settlements" ADD CONSTRAINT "order_settlements_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_order_settlement_id_fkey" FOREIGN KEY ("order_settlement_id") REFERENCES "order_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
