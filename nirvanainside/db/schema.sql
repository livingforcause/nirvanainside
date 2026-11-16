-- Nirvana Inside — MySQL / MariaDB schema.
-- The server creates these tables automatically on first start; this file is for reference
-- or for running by hand in phpMyAdmin. Each row keeps the full record as JSON in `data`;
-- the other columns are copies used for sorting, filtering and reporting.

CREATE TABLE IF NOT EXISTS ni_settings (
  k          VARCHAR(64)  NOT NULL PRIMARY KEY,
  v          TEXT         NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ni_vendors (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  business   VARCHAR(200) NOT NULL DEFAULT '',
  kind       VARCHAR(30)  NOT NULL DEFAULT '',
  data       LONGTEXT     NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ni_listings (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  type       VARCHAR(20)  NOT NULL DEFAULT '',
  status     VARCHAR(20)  NOT NULL DEFAULT '',
  title      VARCHAR(200) NOT NULL DEFAULT '',
  vendor_id  VARCHAR(40)  NULL,
  data       LONGTEXT     NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_type_status (type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ni_enquiries (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  ref        VARCHAR(32)  NOT NULL,
  created_at DATETIME     NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT '',
  status     VARCHAR(20)  NOT NULL DEFAULT '',
  customer   VARCHAR(120) NOT NULL DEFAULT '',
  phone      VARCHAR(24)  NOT NULL DEFAULT '',
  vendor_id  VARCHAR(40)  NULL,
  data       LONGTEXT     NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ref (ref),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
