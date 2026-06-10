-- CreateEnum
CREATE TYPE "FundDocumentKind" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "FundDocumentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateTable
CREATE TABLE "FundDocument" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "kind" "FundDocumentKind" NOT NULL,
    "status" "FundDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "documentDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "postedById" TEXT,
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "FundDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "FundDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundDocument_code_key" ON "FundDocument"("code");

-- CreateIndex
CREATE INDEX "FundDocument_fundId_documentDate_idx" ON "FundDocument"("fundId", "documentDate");

-- CreateIndex
CREATE INDEX "FundDocument_kind_status_idx" ON "FundDocument"("kind", "status");

-- CreateIndex
CREATE INDEX "FundDocument_createdById_idx" ON "FundDocument"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "FundDocumentLine_documentId_lineNo_key" ON "FundDocumentLine"("documentId", "lineNo");

-- CreateIndex
CREATE INDEX "FundDocumentLine_category_idx" ON "FundDocumentLine"("category");

-- AddForeignKey
ALTER TABLE "FundDocument" ADD CONSTRAINT "FundDocument_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDocument" ADD CONSTRAINT "FundDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDocument" ADD CONSTRAINT "FundDocument_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDocument" ADD CONSTRAINT "FundDocument_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDocumentLine" ADD CONSTRAINT "FundDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FundDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
