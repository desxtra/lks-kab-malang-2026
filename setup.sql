CREATE DATABASE IF NOT EXISTS lks_db;
USE lks_db;

CREATE TABLE IF NOT EXISTS visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data contoh (optional)
-- INSERT INTO visitors (ip_address) VALUES ('127.0.0.1');