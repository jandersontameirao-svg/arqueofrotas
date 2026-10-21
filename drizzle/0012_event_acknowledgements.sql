CREATE TABLE `eventAcknowledgements` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`consumer` varchar(100) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventAcknowledgements_id` PRIMARY KEY(`id`)
);
