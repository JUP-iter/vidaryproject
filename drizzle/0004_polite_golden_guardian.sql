CREATE TABLE `share_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`detectionResultId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`lastViewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `share_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_links_shareToken_unique` UNIQUE(`shareToken`)
);
