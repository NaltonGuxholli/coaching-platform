-- AlterTable
ALTER TABLE `report` ADD COLUMN `resolutionNote` TEXT NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tenantsettings` ADD COLUMN `publishedAt` DATETIME(3) NULL,
    ADD COLUMN `publishedThemeRevisionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TenantThemeRevision` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `configJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TenantThemeRevision_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    UNIQUE INDEX `TenantThemeRevision_tenantId_version_key`(`tenantId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimerAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `timerId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NULL,
    `moduleId` VARCHAR(191) NULL,
    `lessonId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TimerAttachment_timerId_idx`(`timerId`),
    INDEX `TimerAttachment_courseId_idx`(`courseId`),
    INDEX `TimerAttachment_moduleId_idx`(`moduleId`),
    INDEX `TimerAttachment_lessonId_idx`(`lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `contentPublished` BOOLEAN NOT NULL DEFAULT true,
    `remindersEnabled` BOOLEAN NOT NULL DEFAULT true,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantThemeRevision` ADD CONSTRAINT `TenantThemeRevision_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantThemeRevision` ADD CONSTRAINT `TenantThemeRevision_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimerAttachment` ADD CONSTRAINT `TimerAttachment_timerId_fkey` FOREIGN KEY (`timerId`) REFERENCES `TimerConfiguration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimerAttachment` ADD CONSTRAINT `TimerAttachment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimerAttachment` ADD CONSTRAINT `TimerAttachment_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimerAttachment` ADD CONSTRAINT `TimerAttachment_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `CourseLesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
