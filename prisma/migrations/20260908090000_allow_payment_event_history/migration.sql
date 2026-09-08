ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_orderId_fkey`;
ALTER TABLE `Payment` DROP INDEX `Payment_orderId_key`;
ALTER TABLE `Payment` ADD INDEX `Payment_orderId_idx`(`orderId`);
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
