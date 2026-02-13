-- Add profile picture support to users table
-- Run this in MySQL Workbench if you already have the gnews_db created

ALTER TABLE gnews_db.users ADD COLUMN profile_picture LONGBLOB;
ALTER TABLE gnews_db.users ADD COLUMN profile_picture_name VARCHAR(255);

-- Verify the columns were added:
-- DESCRIBE gnews_db.users;
