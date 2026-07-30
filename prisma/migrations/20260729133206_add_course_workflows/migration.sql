-- AlterTable
ALTER TABLE `course` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    ADD COLUMN `billingType` VARCHAR(191) NOT NULL DEFAULT 'ONE_TIME',
    ADD COLUMN `currency` VARCHAR(191) NULL DEFAULT 'EUR',
    ADD COLUMN `price` DECIMAL(10, 2) NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `courselesson` ADD COLUMN `isFreePreview` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `libraryitem` ADD COLUMN `instructions` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `module` ADD COLUMN `isRestDay` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `scheduleLabel` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tenantsettings` ADD COLUMN `draftJson` JSON NULL,
    ADD COLUMN `pageSectionsJson` JSON NULL;

-- AlterTable
ALTER TABLE `timerconfiguration` ADD COLUMN `alertPointsJson` JSON NULL;
