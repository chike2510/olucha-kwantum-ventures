CREATE TABLE `payment_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(120) NOT NULL,
	`userId` int,
	`customerName` varchar(160) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(50) NOT NULL,
	`deliveryCountry` varchar(100) NOT NULL,
	`deliveryAddress` text NOT NULL,
	`totalKobo` int NOT NULL,
	`currency` varchar(8) NOT NULL,
	`lines` json NOT NULL,
	`status` enum('initializing','pending','failed','cancelled','paid') NOT NULL DEFAULT 'initializing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_intents_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `order_items` ADD `variant` json;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryCountry` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryAddress` text;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_paystackReference_unique` UNIQUE(`paystackReference`);