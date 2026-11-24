CREATE TABLE `vehicleAccidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`accidentDate` timestamp NOT NULL,
	`location` varchar(500),
	`description` text NOT NULL,
	`severity` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`accidentStatus` enum('aberto','em_analise','em_reparo','encerrado') NOT NULL DEFAULT 'aberto',
	`driverId` int,
	`thirdPartyInvolved` boolean NOT NULL DEFAULT false,
	`thirdPartyDetails` text,
	`insuranceClaimNumber` varchar(100),
	`estimatedCost` decimal(12,2),
	`finalCost` decimal(12,2),
	`kmAtAccident` int,
	`observations` text,
	`registeredById` int NOT NULL,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedById` int,
	CONSTRAINT `vehicleAccidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fleetNumber` varchar(30);