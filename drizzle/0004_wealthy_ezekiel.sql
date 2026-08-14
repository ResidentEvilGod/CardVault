ALTER TABLE `cards` ADD `physicalCardLikelihood` decimal(5,2);--> statement-breakpoint
ALTER TABLE `cards` ADD `digitalImageRisk` decimal(5,2);--> statement-breakpoint
ALTER TABLE `cards` ADD `authenticityStatus` enum('likely_physical','uncertain','likely_digital') DEFAULT 'uncertain' NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `authenticityNotes` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `captureSource` enum('camera','upload') DEFAULT 'upload' NOT NULL;