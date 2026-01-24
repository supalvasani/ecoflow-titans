/*
  Warnings:

  - You are about to drop the column `proposedState` on the `ECO` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ECO" DROP COLUMN "proposedState";

-- CreateTable
CREATE TABLE "ECOProductDraft" (
    "id" TEXT NOT NULL,
    "ecoId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT,
    "salePrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),

    CONSTRAINT "ECOProductDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECOBOMDraft" (
    "id" TEXT NOT NULL,
    "ecoId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ECOBOMDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECODraftAttachment" (
    "id" TEXT NOT NULL,
    "ecoId" TEXT NOT NULL,
    "productVersionId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "ECODraftAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECODraftComponent" (
    "id" TEXT NOT NULL,
    "bomDraftId" TEXT NOT NULL,
    "componentVersionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "ECODraftComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECODraftOperation" (
    "id" TEXT NOT NULL,
    "bomDraftId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeMinutes" INTEGER NOT NULL,
    "workCenter" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "ECODraftOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ECOProductDraft_ecoId_key" ON "ECOProductDraft"("ecoId");

-- CreateIndex
CREATE UNIQUE INDEX "ECOBOMDraft_ecoId_key" ON "ECOBOMDraft"("ecoId");

-- AddForeignKey
ALTER TABLE "ECOProductDraft" ADD CONSTRAINT "ECOProductDraft_ecoId_fkey" FOREIGN KEY ("ecoId") REFERENCES "ECO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECOProductDraft" ADD CONSTRAINT "ECOProductDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECOBOMDraft" ADD CONSTRAINT "ECOBOMDraft_ecoId_fkey" FOREIGN KEY ("ecoId") REFERENCES "ECO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECOBOMDraft" ADD CONSTRAINT "ECOBOMDraft_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BOM"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECODraftAttachment" ADD CONSTRAINT "ECODraftAttachment_ecoId_fkey" FOREIGN KEY ("ecoId") REFERENCES "ECO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECODraftComponent" ADD CONSTRAINT "ECODraftComponent_bomDraftId_fkey" FOREIGN KEY ("bomDraftId") REFERENCES "ECOBOMDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECODraftComponent" ADD CONSTRAINT "ECODraftComponent_componentVersionId_fkey" FOREIGN KEY ("componentVersionId") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECODraftOperation" ADD CONSTRAINT "ECODraftOperation_bomDraftId_fkey" FOREIGN KEY ("bomDraftId") REFERENCES "ECOBOMDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
