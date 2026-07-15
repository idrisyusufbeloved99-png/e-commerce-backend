/*
  Warnings:

  - You are about to drop the column `discountPercent` on the `coupons` table. All the data in the column will be lost.
  - Added the required column `discountValue` to the `coupons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "discountPercent",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discountValue" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "minOrderSubtotal" DECIMAL(10,2),
ADD COLUMN     "startDate" TIMESTAMP(3);
