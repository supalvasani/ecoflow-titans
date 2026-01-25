/*
  Warnings:

  - You are about to drop the `ECOBOMDraft` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ECODraftAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ECODraftComponent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ECODraftOperation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ECOProductDraft` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ECOBOMDraft" DROP CONSTRAINT "ECOBOMDraft_bomId_fkey";

-- DropForeignKey
ALTER TABLE "ECOBOMDraft" DROP CONSTRAINT "ECOBOMDraft_ecoId_fkey";

-- DropForeignKey
ALTER TABLE "ECODraftAttachment" DROP CONSTRAINT "ECODraftAttachment_ecoId_fkey";

-- DropForeignKey
ALTER TABLE "ECODraftComponent" DROP CONSTRAINT "ECODraftComponent_bomDraftId_fkey";

-- DropForeignKey
ALTER TABLE "ECODraftComponent" DROP CONSTRAINT "ECODraftComponent_componentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ECODraftOperation" DROP CONSTRAINT "ECODraftOperation_bomDraftId_fkey";

-- DropForeignKey
ALTER TABLE "ECOProductDraft" DROP CONSTRAINT "ECOProductDraft_ecoId_fkey";

-- DropForeignKey
ALTER TABLE "ECOProductDraft" DROP CONSTRAINT "ECOProductDraft_productId_fkey";

-- AlterTable
ALTER TABLE "ECO" ADD COLUMN     "draftAttachments" JSONB,
ADD COLUMN     "draftBomId" TEXT,
ADD COLUMN     "draftComponents" JSONB,
ADD COLUMN     "draftCostPrice" DECIMAL(10,2),
ADD COLUMN     "draftName" TEXT,
ADD COLUMN     "draftNotes" TEXT,
ADD COLUMN     "draftOperations" JSONB,
ADD COLUMN     "draftProductId" TEXT,
ADD COLUMN     "draftSalePrice" DECIMAL(10,2),
ADD COLUMN     "mandatoryApproval" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "ECOBOMDraft";

-- DropTable
DROP TABLE "ECODraftAttachment";

-- DropTable
DROP TABLE "ECODraftComponent";

-- DropTable
DROP TABLE "ECODraftOperation";

-- DropTable
DROP TABLE "ECOProductDraft";

-- AddForeignKey
ALTER TABLE "ECO" ADD CONSTRAINT "ECO_draftProductId_fkey" FOREIGN KEY ("draftProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECO" ADD CONSTRAINT "ECO_draftBomId_fkey" FOREIGN KEY ("draftBomId") REFERENCES "BOM"("id") ON DELETE SET NULL ON UPDATE CASCADE;
