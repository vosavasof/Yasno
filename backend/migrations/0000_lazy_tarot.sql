CREATE TABLE `yasna_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `yasna_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `yasna_members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`family` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `yasna_members_user_id_unique` ON `yasna_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `yasna_notification_reads` (
	`user_id` text PRIMARY KEY NOT NULL,
	`json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `yasna_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`json` text NOT NULL
);
