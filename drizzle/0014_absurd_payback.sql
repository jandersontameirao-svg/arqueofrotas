CREATE TABLE `atenaChatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`atenaRole` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`authorId` int,
	`authorName` varchar(255),
	`vehicleId` int,
	`category` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atenaChatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atenaMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`directive` text NOT NULL,
	`atenaMemoryCategory` enum('custo','processo','preferencia','comercial','tecnico','prazo','modelo_escopo','geral') NOT NULL DEFAULT 'geral',
	`active` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdByName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atenaMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `observacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`observacaoCategoria` enum('reclamacao','melhoria','bug','caracteristica') NOT NULL,
	`area` varchar(100),
	`imagens` json,
	`observacaoStatus` enum('aberta','em_analise','resolvida') NOT NULL DEFAULT 'aberta',
	`criadoPorId` int,
	`criadoPorNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `observacoes_id` PRIMARY KEY(`id`)
);
