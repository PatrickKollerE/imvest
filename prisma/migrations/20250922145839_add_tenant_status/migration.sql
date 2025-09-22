-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "leaseStart" DATETIME,
    "leaseEnd" DATETIME,
    "baseRentCents" INTEGER,
    "contractUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("baseRentCents", "contactEmail", "contactPhone", "contractUrl", "createdAt", "id", "leaseEnd", "leaseStart", "name", "propertyId", "updatedAt") SELECT "baseRentCents", "contactEmail", "contactPhone", "contractUrl", "createdAt", "id", "leaseEnd", "leaseStart", "name", "propertyId", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE INDEX "Tenant_propertyId_idx" ON "Tenant"("propertyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
