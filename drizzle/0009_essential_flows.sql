CREATE TABLE `evidenceFiles` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(50) NOT NULL,
	`content` longtext NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `odometerReadings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`userId` int NOT NULL,
	`source` varchar(50) NOT NULL,
	`originalKm` int NOT NULL,
	`previousKm` int NOT NULL,
	`correctedKm` int,
	`reason` text,
	`collectedAt` timestamp NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `odometerReadings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operationReceipts` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`operation` varchar(100) NOT NULL,
	`requestId` varchar(100) NOT NULL,
	`inputHash` varchar(64) NOT NULL,
	`result` json NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operationReceipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleHolds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`reason` text NOT NULL,
	`userId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`releasedAt` timestamp,
	`releasedById` int,
	CONSTRAINT `vehicleHolds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reservations` ADD `checkInFuel` int;--> statement-breakpoint
ALTER TABLE `reservations` ADD `returnChecklistId` int;--> statement-breakpoint
ALTER TABLE `reservations` ADD `checkOutFuel` int;