CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`previousData` json,
	`newData` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklistResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`templateItemId` int NOT NULL,
	`checklistResponse` enum('ok','nao_ok','na') NOT NULL,
	`comment` text,
	`photoUrl` text,
	`occurrenceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklistResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklistTemplateItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`category` varchar(100),
	`isCritical` boolean NOT NULL DEFAULT false,
	`order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistTemplateItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklistTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`vehicleType` enum('carro','caminhonete','moto','van','caminhao') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`reservationId` int,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`km` int,
	`observations` text,
	`hasIssues` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenancePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`vehicleType` enum('carro','caminhonete','moto','van','caminhao') NOT NULL,
	`vehicleId` int,
	`intervalKm` int,
	`intervalDays` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenancePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `occurrenceAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occurrenceId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255),
	`fileType` varchar(50),
	`fileSize` int,
	`description` varchar(255),
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `occurrenceAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `occurrenceComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occurrenceId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `occurrenceComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `occurrences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`reportedById` int NOT NULL,
	`checklistResponseId` int,
	`serviceOrderId` int,
	`occurredAt` timestamp NOT NULL,
	`location` varchar(255),
	`description` text NOT NULL,
	`severity` enum('baixa','media','alta') NOT NULL,
	`occurrenceStatus` enum('aberto','em_tratamento','encerrado') NOT NULL DEFAULT 'aberto',
	`closedAt` timestamp,
	`closedById` int,
	`closureNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `occurrences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`client` varchar(255),
	`unitId` int,
	`active` boolean NOT NULL DEFAULT true,
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`purpose` text,
	`location` varchar(255),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`reservationStatus` enum('agendada','em_uso','concluida','cancelada') NOT NULL DEFAULT 'agendada',
	`checkInAt` timestamp,
	`checkInKm` int,
	`checkInCondition` text,
	`checkInPhotoUrl` text,
	`checkOutAt` timestamp,
	`checkOutKm` int,
	`checkOutCondition` text,
	`checkOutPhotoUrl` text,
	`checklistId` int,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceOrderAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceOrderId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255),
	`fileType` varchar(50),
	`fileSize` int,
	`description` varchar(255),
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceOrderAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceOrderId` int NOT NULL,
	`itemType` enum('peca','servico') NOT NULL,
	`description` varchar(500) NOT NULL,
	`quantity` decimal(10,2) DEFAULT '1',
	`unitPrice` decimal(10,2),
	`totalPrice` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`maintenanceType` enum('preventiva','corretiva') NOT NULL,
	`maintenancePlanId` int,
	`occurrenceId` int,
	`serviceOrderStatus` enum('aberta','em_andamento','aguardando_pecas','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`description` text NOT NULL,
	`severity` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`openedById` int NOT NULL,
	`assignedToId` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`completedById` int,
	`supplierName` varchar(255),
	`supplierContact` varchar(100),
	`kmAtOpen` int,
	`executionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `vehicleDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`documentType` enum('crlv','seguro','licenciamento','outros') NOT NULL,
	`description` varchar(255),
	`expirationDate` timestamp,
	`fileUrl` text,
	`fileName` varchar(255),
	`fileSize` int,
	`alert30Sent` boolean DEFAULT false,
	`alert15Sent` boolean DEFAULT false,
	`alert7Sent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleMaintenanceStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`maintenancePlanId` int NOT NULL,
	`lastExecutedAt` timestamp,
	`lastExecutedKm` int,
	`nextDueDate` timestamp,
	`nextDueKm` int,
	`status` enum('em_dia','a_vencer','vencida') NOT NULL DEFAULT 'em_dia',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleMaintenanceStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plate` varchar(10) NOT NULL,
	`model` varchar(100) NOT NULL,
	`brand` varchar(100),
	`year` int NOT NULL,
	`color` varchar(50),
	`vehicleType` enum('carro','caminhonete','moto','van','caminhao') NOT NULL,
	`vehicleStatus` enum('ativo','manutencao','baixado') NOT NULL DEFAULT 'ativo',
	`unitId` int,
	`defaultProjectId` int,
	`currentResponsibleId` int,
	`currentKm` int NOT NULL DEFAULT 0,
	`chassi` varchar(50),
	`renavam` varchar(20),
	`trackingDeviceId` varchar(100),
	`observations` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_plate_unique` UNIQUE(`plate`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','gestor_frota','motorista','manutencao') NOT NULL DEFAULT 'motorista';--> statement-breakpoint
ALTER TABLE `users` ADD `unitId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `active` boolean DEFAULT true NOT NULL;