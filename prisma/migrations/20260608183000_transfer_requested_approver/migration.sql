ALTER TABLE "Document" ADD COLUMN "requestedApproverId" TEXT;
CREATE INDEX "Document_requestedApproverId_idx" ON "Document"("requestedApproverId");
ALTER TABLE "Document"
ADD CONSTRAINT "Document_requestedApproverId_fkey"
FOREIGN KEY ("requestedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
