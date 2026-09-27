-- À exécuter UNE fois avec un compte administrateur MySQL/MariaDB (ex: root).
-- Remplacez le mot de passe. L'application utilise un compte aux privilèges limités :
-- pas de DROP, ALTER, CREATE, GRANT. Les migrations utilisent DB_ADMIN_USER.
CREATE DATABASE IF NOT EXISTS tontine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'Thibaut'@'localhost' IDENTIFIED BY '12345678';
GRANT SELECT, INSERT, UPDATE, DELETE ON tontine.* TO 'Thibaut'@'localhost';
FLUSH PRIVILEGES;
