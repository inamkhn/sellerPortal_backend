/*
  Warnings:

  - You are about to drop the column `referral_Manager` on the `order_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_requests" DROP COLUMN "referral_Manager",
ADD COLUMN     "Manager_Cost" TEXT;
