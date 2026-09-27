-- Schéma de la plateforme de tontine (MySQL 8 / MariaDB 10.5+)
-- Les blocs sont séparés par la ligne "-- @@" (utilisée par scripts/migrate.js).
-- Les montants sont des entiers (FCFA/XOF n'a pas de décimales) : pas d'erreurs d'arrondi.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('admin','member') NOT NULL DEFAULT 'member',
  status ENUM('active','disabled','deleted') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  failed_logins INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY idx_sessions_user (user_id, revoked_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS email_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('verify_email','reset_password') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_tokens_hash (token_hash),
  KEY idx_email_tokens_user (user_id, purpose, created_at),
  CONSTRAINT fk_email_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS tontines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  contribution_amount BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'XOF',
  frequency ENUM('weekly','biweekly','monthly') NOT NULL,
  start_date DATE NOT NULL,
  status ENUM('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tontines_status (status),
  CONSTRAINT chk_tontines_amount CHECK (contribution_amount > 0),
  CONSTRAINT fk_tontines_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS tontine_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tontine_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  invited_email VARCHAR(190) NULL,
  display_name VARCHAR(120) NOT NULL,
  tontine_role ENUM('manager','treasurer','member') NOT NULL DEFAULT 'member',
  position INT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_user (tontine_id, user_id),
  UNIQUE KEY uq_member_invite (tontine_id, invited_email),
  KEY idx_members_user (user_id),
  CONSTRAINT fk_members_tontine FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS rounds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tontine_id BIGINT UNSIGNED NOT NULL,
  round_number INT UNSIGNED NOT NULL,
  beneficiary_member_id BIGINT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('open','paid_out') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_round_number (tontine_id, round_number),
  CONSTRAINT fk_rounds_tontine FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  CONSTRAINT fk_rounds_beneficiary FOREIGN KEY (beneficiary_member_id) REFERENCES tontine_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS contributions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tontine_id BIGINT UNSIGNED NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  amount_due BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  UNIQUE KEY uq_contribution (round_id, member_id),
  KEY idx_contrib_member (member_id, status),
  KEY idx_contrib_tontine (tontine_id),
  CONSTRAINT fk_contrib_tontine FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  CONSTRAINT fk_contrib_round FOREIGN KEY (round_id) REFERENCES rounds(id),
  CONSTRAINT fk_contrib_member FOREIGN KEY (member_id) REFERENCES tontine_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
-- Grand livre. open_key / payout_key (colonnes générées) garantissent en base
-- qu'une cotisation ne peut avoir qu'un seul paiement actif et qu'un tour ne peut avoir qu'un seul versement actif.
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  txn_number VARCHAR(40) NOT NULL,
  tontine_id BIGINT UNSIGNED NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NULL,
  contribution_id BIGINT UNSIGNED NULL,
  type ENUM('contribution','payout','reversal') NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL,
  status ENUM('pending','validated','failed','reversed') NOT NULL,
  method ENUM('cash','mobile_money') NOT NULL,
  provider VARCHAR(30) NULL,
  provider_ref VARCHAR(80) NULL,
  idempotency_key VARCHAR(80) NULL,
  reverses_txn_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validated_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  open_key BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN type = 'contribution' AND status IN ('pending','validated') THEN contribution_id ELSE NULL END) STORED,
  payout_key BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN type = 'payout' AND status IN ('pending','validated') THEN round_id ELSE NULL END) STORED,
  UNIQUE KEY uq_txn_number (txn_number),
  UNIQUE KEY uq_txn_provider_ref (provider_ref),
  UNIQUE KEY uq_txn_idem (created_by, idempotency_key),
  UNIQUE KEY uq_txn_reverses (reverses_txn_id),
  UNIQUE KEY uq_txn_open (open_key),
  UNIQUE KEY uq_txn_payout (payout_key),
  KEY idx_txn_tontine (tontine_id, created_at),
  KEY idx_txn_member (member_id),
  CONSTRAINT chk_txn_amount CHECK (amount > 0),
  CONSTRAINT fk_txn_tontine FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  CONSTRAINT fk_txn_round FOREIGN KEY (round_id) REFERENCES rounds(id),
  CONSTRAINT fk_txn_member FOREIGN KEY (member_id) REFERENCES tontine_members(id),
  CONSTRAINT fk_txn_contribution FOREIGN KEY (contribution_id) REFERENCES contributions(id),
  CONSTRAINT fk_txn_reverses FOREIGN KEY (reverses_txn_id) REFERENCES transactions(id),
  CONSTRAINT fk_txn_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS uploads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT UNSIGNED NOT NULL,
  stored_name CHAR(40) NOT NULL,
  original_name VARCHAR(120) NOT NULL,
  mime VARCHAR(50) NOT NULL,
  size INT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_upload_name (stored_name),
  KEY idx_upload_txn (transaction_id),
  CONSTRAINT fk_upload_txn FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  CONSTRAINT fk_upload_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  event_id VARCHAR(100) NOT NULL,
  signature_valid TINYINT(1) NOT NULL,
  payload LONGTEXT NOT NULL,
  status ENUM('received','processed','ignored','rejected') NOT NULL DEFAULT 'received',
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_webhook_event (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,
  resource_type VARCHAR(40) NULL,
  resource_id VARCHAR(40) NULL,
  result ENUM('success','failure','denied') NOT NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at),
  KEY idx_audit_user (user_id),
  KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- @@
DROP TRIGGER IF EXISTS trg_txn_no_delete;
-- @@
CREATE TRIGGER trg_txn_no_delete BEFORE DELETE ON transactions FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les transactions ne peuvent pas être supprimées';
-- @@
DROP TRIGGER IF EXISTS trg_txn_immutable;
-- @@
-- Une transaction validée ne change plus : seule la bascule validated -> reversed est permise
-- (via une écriture de contrepartie). Montant, type, membre, tontine sont figés dès la création.
CREATE TRIGGER trg_txn_immutable BEFORE UPDATE ON transactions FOR EACH ROW
BEGIN
  IF NEW.amount <> OLD.amount OR NEW.type <> OLD.type OR NEW.txn_number <> OLD.txn_number
     OR NEW.tontine_id <> OLD.tontine_id OR NEW.round_id <> OLD.round_id
     OR NOT (NEW.member_id <=> OLD.member_id) OR NOT (NEW.contribution_id <=> OLD.contribution_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction immuable';
  END IF;
  IF OLD.status <> NEW.status AND NOT (OLD.status = 'pending' AND NEW.status IN ('validated','failed'))
     AND NOT (OLD.status = 'validated' AND NEW.status = 'reversed') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Changement de statut interdit';
  END IF;
END;
