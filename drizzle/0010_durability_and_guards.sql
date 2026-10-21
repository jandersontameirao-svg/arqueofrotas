CREATE TABLE `activeVehicleUses` (
	`vehicleId` int NOT NULL,
	`userId` int NOT NULL,
	`reservationId` int NOT NULL,
	CONSTRAINT `activeVehicleUses_vehicleId` PRIMARY KEY(`vehicleId`),
	CONSTRAINT `activeVehicleUses_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `activeVehicleUses_reservationId_unique` UNIQUE(`reservationId`)
);
--> statement-breakpoint
CREATE TABLE `domainEvents` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`requestId` varchar(100) NOT NULL,
	`operation` varchar(100) NOT NULL,
	`resourceId` int,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domainEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationReferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`system` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`localId` varchar(100) NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`version` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationReferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `vehicleHolds` (`vehicleId`,`reason`,`active`)
SELECT `id`, 'Situação de manutenção anterior à revisão. Gestor deve conferir e liberar com justificativa.', true
FROM `vehicles` WHERE `vehicleStatus` = 'manutencao';
--> statement-breakpoint
INSERT INTO `activeVehicleUses` (`vehicleId`,`userId`,`reservationId`)
SELECT `vehicleId`,`userId`,`id` FROM `reservations` WHERE `reservationStatus` = 'em_uso';
