CREATE TABLE `board_meta` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`q` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`due` text DEFAULT '' NOT NULL
);
