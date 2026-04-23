ALTER TABLE `serviceOrders` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `deletedById` int;