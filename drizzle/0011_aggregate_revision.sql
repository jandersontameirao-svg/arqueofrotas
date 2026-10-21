ALTER TABLE `vehicles` ADD `revision` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `integrationReferences` ADD CONSTRAINT `integration_local_ref` UNIQUE(`system`,`entityType`,`localId`);--> statement-breakpoint
ALTER TABLE `integrationReferences` ADD CONSTRAINT `integration_external_ref` UNIQUE(`system`,`entityType`,`externalId`);