-- Init database schema
CREATE DATABASE IF NOT EXISTS setupso;
USE setupso;

-- The schema will be created by Prisma migrations
-- This file just ensures the database is created with proper charset
ALTER DATABASE setupso CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
