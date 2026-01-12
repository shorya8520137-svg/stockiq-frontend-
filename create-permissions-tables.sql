-- Create permissions system tables in hunyhuny_auto_dispatch database
-- This script creates only the essential tables needed for the permissions system

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    