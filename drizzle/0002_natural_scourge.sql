ALTER TABLE `detection_results` MODIFY COLUMN `fileType` enum('image','audio','video','text') NOT NULL;--> statement-breakpoint
ALTER TABLE `detection_results` MODIFY COLUMN `fileSize` int;--> statement-breakpoint
ALTER TABLE `detection_results` MODIFY COLUMN `s3Key` varchar(512);