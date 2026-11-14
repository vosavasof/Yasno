CREATE TABLE `yasna_access_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`role` text NOT NULL,
	`family` text,
	`link_id` text,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `yasna_password_masters` (
	`username` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`hash` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `yasna_parent_links` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`family` text NOT NULL,
	`label` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`last_used` integer,
	`revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `yasna_parent_links_token_hash_unique` ON `yasna_parent_links` (`token_hash`);