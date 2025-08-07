/*
  Warnings:

  - The values [NORMAL] on the enum `payment_type` will be removed. If these variants are still used in the database, this will fail.
  - The values [WARDROBES,DINING_SETS,OFFICE_FURNITURE,DECORATIVE_ITEMS,LIGHTING,STORAGE] on the enum `product_category` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `customer_notes` on the `order_requests` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "payment_type_new" AS ENUM ('SELLER', 'REFERRAL');
ALTER TABLE "payments" ALTER COLUMN "payment_type" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "payment_type" TYPE "payment_type_new" USING ("payment_type"::text::"payment_type_new");
ALTER TYPE "payment_type" RENAME TO "payment_type_old";
ALTER TYPE "payment_type_new" RENAME TO "payment_type";
DROP TYPE "payment_type_old";
ALTER TABLE "payments" ALTER COLUMN "payment_type" SET DEFAULT 'SELLER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "product_category_new" AS ENUM ('BEDS', 'CHAIRS', 'TABLES', 'SOFAS', 'DRESSER', 'OTHER');
ALTER TABLE "products" ALTER COLUMN "category" TYPE "product_category_new" USING ("category"::text::"product_category_new");
ALTER TYPE "product_category" RENAME TO "product_category_old";
ALTER TYPE "product_category_new" RENAME TO "product_category";
DROP TYPE "product_category_old";
COMMIT;

-- AlterTable
ALTER TABLE "order_requests" DROP COLUMN "customer_notes",
ADD COLUMN     "customize_image" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "product_des" TEXT,
ADD COLUMN     "product_name" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "payment_type" SET DEFAULT 'SELLER';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "account_number" TEXT;
