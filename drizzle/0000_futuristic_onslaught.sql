CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot` text NOT NULL,
	`rating` integer DEFAULT 1000 NOT NULL,
	`power` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rankings_rating_idx` ON `rankings` (`rating`);