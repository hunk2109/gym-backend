-- Create email_configs table
CREATE TABLE IF NOT EXISTS email_configs (
  id VARCHAR(36) PRIMARY KEY,
  provider ENUM('GOOGLE', 'MICROSOFT', 'SMTP') NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(500),
  clientId VARCHAR(500),
  clientSecret VARCHAR(500),
  refreshToken TEXT,
  smtpHost VARCHAR(255),
  smtpPort INT,
  smtpUser VARCHAR(255),
  smtpPassword VARCHAR(500),
  useSSL BOOLEAN DEFAULT FALSE,
  useTLS BOOLEAN DEFAULT FALSE,
  senderName VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  isVerified BOOLEAN DEFAULT FALSE,
  verificationError TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_isActive (isActive),
  INDEX idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  triggerType ENUM('birthday', 'anniversary', 'promotion', 'manual') NOT NULL,
  subject VARCHAR(500) NOT NULL,
  htmlContent LONGTEXT NOT NULL,
  plainTextContent LONGTEXT,
  includeDiscountCode BOOLEAN DEFAULT FALSE,
  discountCodePercentage INT,
  discountCodeDaysValid INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_triggerType (triggerType),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(36) PRIMARY KEY,
  templateId VARCHAR(36),
  recipientEmail VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED') DEFAULT 'PENDING',
  errorMessage TEXT,
  sentAt TIMESTAMP,
  failedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_templateId (templateId),
  INDEX idx_recipientEmail (recipientEmail),
  FOREIGN KEY (templateId) REFERENCES email_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
