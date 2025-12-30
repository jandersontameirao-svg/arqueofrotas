CREATE TABLE `vehiclePhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoType` enum('frente','traseira','lateral_esquerda','lateral_direita','interior') NOT NULL,
	`description` varchar(255),
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehiclePhotos_id` PRIMARY KEY(`id`)
);
