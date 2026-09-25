ALTER TABLE `tasks` ADD `sources` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `links` text DEFAULT '[]' NOT NULL;