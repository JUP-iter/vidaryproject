ALTER TABLE `detection_results` ADD `fileHash` varchar(64);--> statement-breakpoint
ALTER TABLE `detection_results` ADD `isDuplicate` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `detection_results` ADD `duplicateOfId` int;