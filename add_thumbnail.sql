-- Add profile picture thumbnail support to users table
-- Run this in MySQL Workbench if you already have profile pictures in users table

ALTER TABLE gnews_db.users ADD COLUMN profile_picture_thumbnail LONGBLOB;

-- Verify the columns exist:
-- DESCRIBE gnews_db.users;
