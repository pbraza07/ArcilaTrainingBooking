CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`reservation_id` integer,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `availability_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`reason` text DEFAULT 'Unavailable' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_availability_blocks_start` ON `availability_blocks` (`start_at`);--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_date` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_reports_date_recipient` ON `daily_reports` (`report_date`,`recipient`);--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`event` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notification_reservation` ON `notification_log` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_number` text NOT NULL,
	`service` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`adult_name` text NOT NULL,
	`player_name` text NOT NULL,
	`player_age` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`emergency_name` text NOT NULL,
	`emergency_phone` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`party_guests` integer,
	`team_name` text,
	`age_group` text,
	`coach_name` text,
	`consent_sms` integer DEFAULT false NOT NULL,
	`accepted_policies` integer DEFAULT false NOT NULL,
	`public_token` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_number` ON `reservations` (`reservation_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_public_token` ON `reservations` (`public_token`);--> statement-breakpoint
CREATE INDEX `idx_reservations_start_status` ON `reservations` (`start_at`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reservations_created_at` ON `reservations` (`created_at`);