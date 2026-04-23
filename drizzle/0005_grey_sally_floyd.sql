ALTER TABLE `vehicleFines` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicleFines` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `vehicleFines` ADD `deletedById` int;