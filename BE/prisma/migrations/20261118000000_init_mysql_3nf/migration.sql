-- DMPTiFy Music AI - Initial MySQL 8 3NF Schema Migration

CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `google_id` VARCHAR(128) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `plan_tier` ENUM('FREE', 'VIP') NOT NULL DEFAULT 'FREE',
    `vip_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `songs` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `artist` VARCHAR(200) NOT NULL,
    `album` VARCHAR(200) NOT NULL,
    `duration` INTEGER NOT NULL,
    `audio_url` VARCHAR(500) NOT NULL,
    `cover_url` VARCHAR(500) NOT NULL,
    `lyrics_url` VARCHAR(500) NULL,
    `mood` ENUM('chill', 'sad', 'energetic', 'focus', 'acoustic') NOT NULL,
    `mood_label` VARCHAR(100) NOT NULL,
    `bpm` INTEGER NOT NULL,
    `play_count` INTEGER NOT NULL DEFAULT 0,
    `is_vip_only` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_songs_mood`(`mood`),
    INDEX `idx_songs_play_count`(`play_count`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_song_likes` (
    `user_id` VARCHAR(64) NOT NULL,
    `song_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_song_likes_song_id`(`song_id`),
    PRIMARY KEY (`user_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `playlists` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `cover_url` VARCHAR(500) NOT NULL,
    `mood` ENUM('chill', 'sad', 'energetic', 'focus', 'acoustic') NULL,
    `is_ai_generated` BOOLEAN NOT NULL DEFAULT false,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `idx_playlists_user_id`(`user_id`),
    INDEX `idx_playlists_mood`(`mood`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `playlist_songs` (
    `playlist_id` VARCHAR(64) NOT NULL,
    `song_id` VARCHAR(64) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_playlist_songs_song_id`(`song_id`),
    INDEX `idx_playlist_songs_order`(`playlist_id`, `position`),
    PRIMARY KEY (`playlist_id`, `song_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_logs` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NULL,
    `user_message` TEXT NOT NULL,
    `ai_reply` TEXT NOT NULL,
    `detected_mood` VARCHAR(64) NOT NULL,
    `target_bpm` INTEGER NOT NULL,
    `generated_playlist_id` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ai_chat_logs_user_created`(`user_id`, `created_at`),
    INDEX `idx_ai_chat_logs_playlist_id`(`generated_playlist_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_transactions` (
    `id` VARCHAR(64) NOT NULL,
    `txn_ref` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `amount_vnd` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `vnp_transaction_no` VARCHAR(64) NULL,
    `raw_ipn_payload` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_transactions_txn_ref_key`(`txn_ref`),
    INDEX `idx_payment_txns_user_created`(`user_id`, `created_at`),
    INDEX `idx_payment_txns_status`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_song_likes`
    ADD CONSTRAINT `user_song_likes_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_song_likes`
    ADD CONSTRAINT `user_song_likes_song_id_fkey`
    FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `playlists`
    ADD CONSTRAINT `playlists_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `playlist_songs`
    ADD CONSTRAINT `playlist_songs_playlist_id_fkey`
    FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `playlist_songs`
    ADD CONSTRAINT `playlist_songs_song_id_fkey`
    FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ai_chat_logs`
    ADD CONSTRAINT `ai_chat_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ai_chat_logs`
    ADD CONSTRAINT `ai_chat_logs_generated_playlist_id_fkey`
    FOREIGN KEY (`generated_playlist_id`) REFERENCES `playlists`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_transactions`
    ADD CONSTRAINT `payment_transactions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
