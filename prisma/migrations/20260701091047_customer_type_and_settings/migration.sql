-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('CUSTOMER', 'NON_CUSTOMER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "type" "CustomerType" NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
