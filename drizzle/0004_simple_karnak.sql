CREATE TABLE `appNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('os_pendente_aprovacao','os_aprovada','os_rejeitada','ocorrencia_nova','ocorrencia_atualizada','documento_vencendo','multa_registrada','geral') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceOrderApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceOrderId` int NOT NULL,
	`approvalStatus` enum('pendente','aprovado','rejeitado') NOT NULL,
	`userId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceOrderApprovals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`phone` varchar(30),
	`email` varchar(255),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`specialties` text,
	`rating` decimal(3,2),
	`observations` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleFines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`fineDate` timestamp NOT NULL,
	`dueDate` timestamp,
	`autoInfracao` varchar(50),
	`infraction` varchar(500) NOT NULL,
	`location` varchar(500),
	`amount` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2),
	`points` int,
	`fineStatus` enum('pendente','paga','recorrida','cancelada') NOT NULL DEFAULT 'pendente',
	`responsibleDriverId` int,
	`paidAt` timestamp,
	`paidAmount` decimal(10,2),
	`receiptUrl` text,
	`observations` text,
	`registeredById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleFines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `serviceOrders` MODIFY COLUMN `serviceOrderStatus` enum('rascunho','pendente_aprovacao','aprovada','rejeitada','aberta','em_andamento','aguardando_pecas','concluida','cancelada') NOT NULL DEFAULT 'aberta';--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `providerId` int;--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `approvedById` int;--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `serviceOrders` ADD `approvalNotes` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `registrationOrigin` enum('manual','ia') DEFAULT 'manual';