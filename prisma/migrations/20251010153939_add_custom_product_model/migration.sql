-- CreateEnum
CREATE TYPE "role" AS ENUM ('USER', 'ADMIN', 'REFERRAL_MANAGER');

-- CreateEnum
CREATE TYPE "bank_account" AS ENUM ('EASYPAISA', 'JAZZCASH', 'BANK_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('BEDS', 'CHAIRS', 'TABLES', 'SOFAS', 'OTHER', 'WARDROBES', 'STORAGE');

-- CreateEnum
CREATE TYPE "product_condition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'SECOND_HAND');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED', 'PAYMENT_PENDING', 'PARTIALLY_DELIVERED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('SELLER', 'REFERRAL');

-- CreateEnum
CREATE TYPE "facebook_posting_status" AS ENUM ('NOT_POSTED', 'POSTING', 'POSTED', 'FAILED', 'NEEDS_UPDATE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar" TEXT,
    "role" "role" NOT NULL DEFAULT 'USER',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "email_verification_expiry" TIMESTAMP(3),
    "refresh_token" TEXT,
    "email_verification_otp" TEXT,
    "password_reset_expiry" TIMESTAMP(3),
    "password_reset_otp" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT,
    "address" TEXT,
    "whatsapp_number" TEXT,
    "bank_account" "bank_account",
    "account_number" TEXT,
    "facebook_link" TEXT,
    "dubizzle_link" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "referral_code" TEXT NOT NULL,
    "referred_by" INTEGER,
    "listed_products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "referrer_id" INTEGER NOT NULL,
    "referee_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "product_category" NOT NULL,
    "condition" "product_condition" NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand" TEXT,
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "material" TEXT,
    "product_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT,
    "facebook_posting_status" "facebook_posting_status" NOT NULL DEFAULT 'NOT_POSTED',
    "facebook_listing_url" TEXT,
    "facebook_last_posted" TIMESTAMP(3),
    "facebook_retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_products" (
    "id" SERIAL NOT NULL,
    "order_request_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_description" TEXT,
    "customize_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "platform" TEXT,
    "decidedPrice" DECIMAL(10,2) NOT NULL,
    "advance_payment" BOOLEAN NOT NULL DEFAULT false,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_whatsapp" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "delivering_date" TIMESTAMP(3),
    "delivery_address" TEXT,
    "delivery_date" TIMESTAMP(3),
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_notes" TEXT,
    "advance_pay" DECIMAL(10,2),
    "platform_cost" DECIMAL(10,2),
    "product_cost" DECIMAL(10,2),

    CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "order_request_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_share" DECIMAL(10,2) NOT NULL,
    "referrer_id" INTEGER,
    "referrer_share" DECIMAL(10,2),
    "total_price" DECIMAL(10,2) NOT NULL,
    "proof_screenshot_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "payment_type" "payment_type" NOT NULL DEFAULT 'SELLER',
    "platform_cost" DECIMAL(10,2),
    "product_cost" DECIMAL(10,2),
    "manager_commission" DECIMAL(10,2),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_refresh_token_key" ON "users"("refresh_token");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_google_id_idx" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_refresh_token_idx" ON "users"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_referral_code_key" ON "profiles"("referral_code");

-- CreateIndex
CREATE INDEX "profiles_referral_code_idx" ON "profiles"("referral_code");

-- CreateIndex
CREATE INDEX "profiles_verified_idx" ON "profiles"("verified");

-- CreateIndex
CREATE INDEX "profiles_referred_by_idx" ON "profiles"("referred_by");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referee_id_idx" ON "referrals"("referee_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_referee_id_key" ON "referrals"("referrer_id", "referee_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_owner_id_idx" ON "products"("owner_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_condition_idx" ON "products"("condition");

-- CreateIndex
CREATE INDEX "products_title_idx" ON "products"("title");

-- CreateIndex
CREATE INDEX "products_price_idx" ON "products"("price");

-- CreateIndex
CREATE INDEX "products_facebook_posting_status_idx" ON "products"("facebook_posting_status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_products_order_request_id_key" ON "custom_products"("order_request_id");

-- CreateIndex
CREATE INDEX "custom_products_order_request_id_idx" ON "custom_products"("order_request_id");

-- CreateIndex
CREATE INDEX "order_requests_user_id_idx" ON "order_requests"("user_id");

-- CreateIndex
CREATE INDEX "order_requests_product_id_idx" ON "order_requests"("product_id");

-- CreateIndex
CREATE INDEX "order_requests_status_idx" ON "order_requests"("status");

-- CreateIndex
CREATE INDEX "order_requests_created_at_idx" ON "order_requests"("created_at");

-- CreateIndex
CREATE INDEX "payments_order_request_id_idx" ON "payments"("order_request_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_referrer_id_idx" ON "payments"("referrer_id");

-- CreateIndex
CREATE INDEX "payments_payment_type_idx" ON "payments"("payment_type");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_products" ADD CONSTRAINT "custom_products_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
