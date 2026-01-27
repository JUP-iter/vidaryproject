CREATE TABLE `detection_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('image','audio','video') NOT NULL,
	`fileSize` int NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`verdict` enum('ai','human') NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`detectedGenerator` text,
	`generatorScores` json,
	`rawResponse` json,
	`processingTimeMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `detection_results_id` PRIMARY KEY(`id`)
);
