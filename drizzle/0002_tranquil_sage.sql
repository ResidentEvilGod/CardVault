CREATE TABLE `xrplPaymentIntents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`packId` varchar(64) NOT NULL,
	`credits` int NOT NULL,
	`destinationAddress` varchar(64) NOT NULL,
	`destinationTag` int NOT NULL,
	`amountDrops` varchar(32) NOT NULL,
	`amountXrp` decimal(18,6) NOT NULL,
	`status` enum('pending','confirmed','expired','failed') NOT NULL DEFAULT 'pending',
	`transactionHash` varchar(128),
	`expiresAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xrplPaymentIntents_id` PRIMARY KEY(`id`),
	CONSTRAINT `xrplPaymentIntents_invoiceId_unique` UNIQUE(`invoiceId`),
	CONSTRAINT `xrplPaymentIntents_transactionHash_unique` UNIQUE(`transactionHash`)
);
--> statement-breakpoint
CREATE TABLE `xrplTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentIntentId` int NOT NULL,
	`userId` int NOT NULL,
	`transactionHash` varchar(128) NOT NULL,
	`sourceAddress` varchar(64) NOT NULL,
	`destinationAddress` varchar(64) NOT NULL,
	`destinationTag` int NOT NULL,
	`amountDrops` varchar(32) NOT NULL,
	`ledgerIndex` int,
	`status` enum('confirmed','failed') NOT NULL DEFAULT 'confirmed',
	`creditsGranted` int NOT NULL,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xrplTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `xrplTransactions_transactionHash_unique` UNIQUE(`transactionHash`)
);
--> statement-breakpoint
ALTER TABLE `creditTransactions` ADD `xrplTransactionHash` varchar(128);--> statement-breakpoint
ALTER TABLE `creditTransactions` ADD `xrplPaymentIntentId` varchar(64);