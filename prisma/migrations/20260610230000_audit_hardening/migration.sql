-- CreateEnum
CREATE TYPE "PeriodLockScope" AS ENUM ('INVENTORY', 'FUND', 'ALL');

-- CreateTable
CREATE TABLE "FundDocumentAuditLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" "DocumentAuditAction" NOT NULL,
    "fromRevisionNo" INTEGER,
    "toRevisionNo" INTEGER,
    "reason" TEXT,
    "snapshotBefore" JSONB,
    "snapshotAfter" JSONB,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundDocumentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriodLock" (
    "id" TEXT NOT NULL,
    "scope" "PeriodLockScope" NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingPeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundDocumentAuditLog_documentId_idx" ON "FundDocumentAuditLog"("documentId");

-- CreateIndex
CREATE INDEX "FundDocumentAuditLog_changedById_idx" ON "FundDocumentAuditLog"("changedById");

-- CreateIndex
CREATE INDEX "FundDocumentAuditLog_changedAt_idx" ON "FundDocumentAuditLog"("changedAt");

-- CreateIndex
CREATE INDEX "AccountingPeriodLock_scope_fromDate_toDate_idx" ON "AccountingPeriodLock"("scope", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "AccountingPeriodLock_createdById_idx" ON "AccountingPeriodLock"("createdById");

-- CreateIndex
CREATE INDEX "AccountingPeriodLock_createdAt_idx" ON "AccountingPeriodLock"("createdAt");

-- AddForeignKey
ALTER TABLE "FundDocumentAuditLog" ADD CONSTRAINT "FundDocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FundDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDocumentAuditLog" ADD CONSTRAINT "FundDocumentAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriodLock" ADD CONSTRAINT "AccountingPeriodLock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
