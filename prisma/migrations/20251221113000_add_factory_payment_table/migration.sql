-- CreateTable
CREATE TABLE "factory_payment" (
    "id" SERIAL NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_payment_pkey" PRIMARY KEY ("id")
);
