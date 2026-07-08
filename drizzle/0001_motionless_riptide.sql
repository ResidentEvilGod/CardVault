CREATE TABLE `appConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `appConfig_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `binder_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardId` int NOT NULL,
	`condition` enum('NM','LP','MP','HP','DMG') NOT NULL DEFAULT 'NM',
	`isGraded` boolean NOT NULL DEFAULT false,
	`gradingCompany` varchar(32),
	`gradeLevel` varchar(16),
	`certNumber` varchar(64),
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`purchasePrice` decimal(10,2),
	`currentValue` decimal(10,2),
	`valueUpdatedAt` timestamp,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `binder_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tcg` varchar(64) NOT NULL,
	`cardName` varchar(256) NOT NULL,
	`setName` varchar(256),
	`setCode` varchar(32),
	`cardNumber` varchar(32),
	`rarity` varchar(64),
	`artist` varchar(128),
	`scrydexId` varchar(128),
	`scryfallId` varchar(128),
	`uploadedImageKey` varchar(512),
	`uploadedImageUrl` varchar(1024),
	`officialImageUrl` varchar(1024),
	`priceNm` decimal(10,2),
	`priceLp` decimal(10,2),
	`priceMp` decimal(10,2),
	`priceHp` decimal(10,2),
	`priceDmg` decimal(10,2),
	`gradedPrices` json,
	`identificationConfidence` decimal(5,2),
	`pricesUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creditTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('purchase','subscription_grant','scan_debit','refund','admin_grant','free_tier') NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(256),
	`stripePaymentIntentId` varchar(128),
	`stripeSessionId` varchar(128),
	`packId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listingTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`shippingDetails` text,
	`descriptionSnippet` text,
	`returnPolicy` text,
	`paymentDetails` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listingTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceUpdateJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastRunStatus` varchar(64),
	`cardsUpdated` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `priceUpdateJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`binderCardId` int NOT NULL,
	`cardId` int NOT NULL,
	`listingTitle` varchar(512),
	`listingDescription` text,
	`askingPrice` decimal(10,2),
	`platform` varchar(64) DEFAULT 'ebay',
	`ebaySearchUrl` varchar(1024),
	`status` enum('draft','listed','sold','archived') NOT NULL DEFAULT 'draft',
	`soldPrice` decimal(10,2),
	`soldAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scanSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardId` int,
	`imageKey` varchar(512),
	`status` enum('success','failed','low_confidence') NOT NULL,
	`creditsUsed` int NOT NULL DEFAULT 1,
	`estimatedValue` decimal(10,2),
	`isHighValue` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scanSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `scanCredits` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalScansUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('none','active','canceled','past_due') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `notifyHighValue` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ebayUsername` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `tcgplayerUsername` varchar(128);