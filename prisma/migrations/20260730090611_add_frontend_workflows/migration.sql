-- AlterTable
ALTER TABLE `fileasset` ADD COLUMN `isProtected` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `mimeType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tenantsettings` ADD COLUMN `baseThemeId` VARCHAR(191) NULL,
    ADD COLUMN `heroImageUrl` TEXT NULL,
    ADD COLUMN `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    ADD COLUMN `logoDarkUrl` TEXT NULL,
    ADD COLUMN `logoLightUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `theme` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `timersession` ADD COLUMN `elapsedSeconds` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastResumedAt` DATETIME(3) NULL,
    ADD COLUMN `remainingSeconds` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isPlatformAdmin` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `videoaccesstoken` MODIFY `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `videoasset` ADD COLUMN `captionsUrl` TEXT NULL,
    ADD COLUMN `drmEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `streamingFormat` VARCHAR(191) NULL DEFAULT 'HLS',
    ADD COLUMN `transcript` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `watermarksession` MODIFY `userId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `LessonAnalytics` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `completedViews` INTEGER NOT NULL DEFAULT 0,
    `totalWatchSeconds` BIGINT NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LessonAnalytics_lessonId_key`(`lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DeviceSession_tokenHash_key`(`tokenHash`),
    INDEX `DeviceSession_userId_revokedAt_idx`(`userId`, `revokedAt`),
    INDEX `DeviceSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentAccessToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `watermarkText` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentAccessToken_token_key`(`token`),
    INDEX `DocumentAccessToken_userId_fileId_idx`(`userId`, `fileId`),
    INDEX `DocumentAccessToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantSettings` ADD CONSTRAINT `TenantSettings_baseThemeId_fkey` FOREIGN KEY (`baseThemeId`) REFERENCES `Theme`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonAnalytics` ADD CONSTRAINT `LessonAnalytics_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `CourseLesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceSession` ADD CONSTRAINT `DeviceSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentAccessToken` ADD CONSTRAINT `DocumentAccessToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentAccessToken` ADD CONSTRAINT `DocumentAccessToken_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `FileAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
