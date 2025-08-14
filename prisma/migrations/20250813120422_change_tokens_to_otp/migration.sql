/*
  Warnings:

  - You are about to drop the column `email_verification_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_token_expiry` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "role" ADD VALUE 'REFERRAL_MANAGER';

-- DropIndex
DROP INDEX "users_email_verification_token_key";

-- DropIndex
DROP INDEX "users_password_reset_token_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verification_token",
DROP COLUMN "password_reset_token",
DROP COLUMN "password_reset_token_expiry",
ADD COLUMN     "email_verification_otp" TEXT,
ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_otp" TEXT;
