ALTER TABLE `serviceOrders` ADD `osCode` varchar(20);--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD CONSTRAINT `serviceOrders_osCode_unique` UNIQUE(`osCode`);