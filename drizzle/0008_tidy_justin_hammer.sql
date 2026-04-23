ALTER TABLE `occurrences` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `occurrences` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `occurrences` ADD `deletedById` int;