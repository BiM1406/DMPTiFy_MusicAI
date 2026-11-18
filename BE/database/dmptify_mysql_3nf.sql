-- ============================================================================
-- DMPTiFy Music AI - Standalone MySQL 8 3NF Schema & Seed Script
-- Compatible with MySQL Workbench, DBeaver, DataGrip, and mysql CLI
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `dmptify_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `dmptify_db`;

-- Drop tables in reverse foreign-key order for clean re-import if needed
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `payment_transactions`;
DROP TABLE IF EXISTS `ai_chat_logs`;
DROP TABLE IF EXISTS `playlist_songs`;
DROP TABLE IF EXISTS `playlists`;
DROP TABLE IF EXISTS `user_song_likes`;
DROP TABLE IF EXISTS `songs`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_google_id_key` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Songs
CREATE TABLE `songs` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `artist` VARCHAR(200) NOT NULL,
  `album` VARCHAR(200) NOT NULL,
  `duration` INT NOT NULL,
  `audio_url` VARCHAR(500) NOT NULL,
  `cover_url` VARCHAR(500) NOT NULL,
  `lyrics_url` VARCHAR(500) NULL,
  `mood` ENUM('chill', 'sad', 'energetic', 'focus', 'acoustic') NOT NULL,
  `mood_label` VARCHAR(100) NOT NULL,
  `bpm` INT NOT NULL,
  `play_count` INT NOT NULL DEFAULT 0,
  `is_vip_only` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_songs_mood` (`mood`),
  KEY `idx_songs_play_count` (`play_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. User Song Likes (3NF Junction)
CREATE TABLE `user_song_likes` (
  `user_id` VARCHAR(64) NOT NULL,
  `song_id` VARCHAR(64) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `song_id`),
  KEY `idx_user_song_likes_song_id` (`song_id`),
  CONSTRAINT `user_song_likes_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_song_likes_song_id_fkey`
    FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Playlists
CREATE TABLE `playlists` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL,
  `title` VARCHAR(120) NOT NULL,
  `description` TEXT NOT NULL,
  `cover_url` VARCHAR(500) NOT NULL,
  `mood` ENUM('chill', 'sad', 'energetic', 'focus', 'acoustic') NULL,
  `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_playlists_user_id` (`user_id`),
  KEY `idx_playlists_mood` (`mood`),
  CONSTRAINT `playlists_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Playlist Songs (3NF Ordered Junction)
CREATE TABLE `playlist_songs` (
  `playlist_id` VARCHAR(64) NOT NULL,
  `song_id` VARCHAR(64) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`playlist_id`, `song_id`),
  KEY `idx_playlist_songs_song_id` (`song_id`),
  KEY `idx_playlist_songs_order` (`playlist_id`, `position`),
  CONSTRAINT `playlist_songs_playlist_id_fkey`
    FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `playlist_songs_song_id_fkey`
    FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. AI Chat Logs
CREATE TABLE `ai_chat_logs` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL,
  `user_message` TEXT NOT NULL,
  `ai_reply` TEXT NOT NULL,
  `detected_mood` VARCHAR(64) NOT NULL,
  `target_bpm` INT NOT NULL,
  `generated_playlist_id` VARCHAR(64) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_logs_user_created` (`user_id`, `created_at`),
  KEY `idx_ai_chat_logs_playlist_id` (`generated_playlist_id`),
  CONSTRAINT `ai_chat_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ai_chat_logs_generated_playlist_id_fkey`
    FOREIGN KEY (`generated_playlist_id`) REFERENCES `playlists` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payment Transactions
CREATE TABLE `payment_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `txn_ref` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `amount_vnd` INT NOT NULL,
  `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `vnp_transaction_no` VARCHAR(64) NULL,
  `raw_ipn_payload` JSON NULL,
  `paid_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_transactions_txn_ref_key` (`txn_ref`),
  KEY `idx_payment_txns_user_created` (`user_id`, `created_at`),
  KEY `idx_payment_txns_status` (`status`),
  CONSTRAINT `payment_transactions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Seed Data (Synced with FE/src/lib/mock-songs.ts & Demo User)
-- ============================================================================

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `google_id`, `role`, `plan_tier`, `vip_expires_at`, `created_at`)
VALUES
  ('user-dat-01', 'dat.nguyen@dtu.edu.vn', NULL, 'Nguyễn Tuấn Đạt', NULL, NULL, 'USER', 'FREE', NULL, '2026-11-18 00:00:00.000');

INSERT INTO `songs` (`id`, `title`, `artist`, `album`, `duration`, `audio_url`, `cover_url`, `lyrics_url`, `mood`, `mood_label`, `bpm`, `play_count`, `is_vip_only`, `created_at`)
VALUES
  ('song-1', 'Chuyện Đôi Ta', 'Emcee L ft. Muộii', 'Acoustic Healing', 30, '/audio/song-1.wav', '/covers/cover-1.svg', '/lyrics/song-1.lrc', 'chill', 'Thư giãn & Chill', 78, 1540, 0, '2026-11-18 00:01:00.000'),
  ('song-2', 'Mưa Tháng Sáu', 'Văn Mai Hương x GREY D', 'Chiều Mưa Tâm Trạng', 30, '/audio/song-2.wav', '/covers/cover-2.svg', '/lyrics/song-2.lrc', 'sad', 'U buồn & Hoài niệm', 68, 1280, 0, '2026-11-18 00:02:00.000'),
  ('song-3', 'Ánh Sao Và Bầu Trời', 'T.R.I x Cá', 'Đêm Muộn Bình Yên', 30, '/audio/song-3.wav', '/covers/cover-3.svg', '/lyrics/song-3.lrc', 'acoustic', 'Mộc mạc & Thư thái', 85, 980, 0, '2026-11-18 00:03:00.000'),
  ('song-4', 'Đi Giữa Trời Rực Rỡ', 'Ngô Lan Hương', 'Bừng Sáng Năng Lượng', 30, '/audio/song-4.wav', '/covers/cover-4.svg', '/lyrics/song-4.lrc', 'energetic', 'Năng động & Phấn khởi', 115, 840, 0, '2026-11-18 00:04:00.000'),
  ('song-5', 'Lofi Beats For Coding', 'DMPTiFy Ambient', 'Deep Focus & Study', 30, '/audio/song-5.wav', '/covers/cover-5.svg', '/lyrics/song-5.lrc', 'focus', 'Tập trung cao độ', 72, 720, 0, '2026-11-18 00:05:00.000');

INSERT INTO `user_song_likes` (`user_id`, `song_id`)
VALUES
  ('user-dat-01', 'song-1'),
  ('user-dat-01', 'song-3'),
  ('user-dat-01', 'song-5');

INSERT INTO `playlists` (`id`, `user_id`, `title`, `description`, `cover_url`, `mood`, `is_ai_generated`, `is_public`, `created_at`)
VALUES
  ('pl-1', 'user-dat-01', 'Vỗ Về Ngày Mưa', 'Tuyển tập những giai điệu mộc mạc xoa dịu những chiều mưa u buồn', '/covers/cover-2.svg', 'sad', 1, 1, '2026-11-18 00:01:00.000'),
  ('pl-2', 'user-dat-01', 'Chill Cafe Cuối Tuần', 'Thư giãn cùng tách cà phê và những bản Acoustic dịu êm', '/covers/cover-1.svg', 'chill', 0, 1, '2026-11-18 00:02:00.000'),
  ('pl-3', 'user-dat-01', 'Deep Focus Coding', 'Sóng não Alpha BPM 70-75 hỗ trợ tập trung lập trình & ôn thi', '/covers/cover-5.svg', 'focus', 1, 1, '2026-11-18 00:03:00.000'),
  ('pl-4', 'user-dat-01', 'Sạc Đầy Năng Lượng', 'Những giai điệu sôi động xua tan mệt mỏi cho ngày mới', '/covers/cover-4.svg', 'energetic', 0, 1, '2026-11-18 00:04:00.000');

INSERT INTO `playlist_songs` (`playlist_id`, `song_id`, `position`)
VALUES
  ('pl-1', 'song-2', 0),
  ('pl-2', 'song-1', 0),
  ('pl-2', 'song-3', 1),
  ('pl-3', 'song-5', 0),
  ('pl-4', 'song-4', 0);
