ALTER TABLE `checklists` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `checklists` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `checklists` ADD `deletedById` int;