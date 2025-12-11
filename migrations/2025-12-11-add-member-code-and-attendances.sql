-- Agregar columna memberCode a la tabla members
ALTER TABLE members
ADD COLUMN memberCode VARCHAR(20) UNIQUE NULL AFTER userId;

-- Crear tabla de asistencias
CREATE TABLE attendances (
  id VARCHAR(36) PRIMARY KEY,
  memberId VARCHAR(36) NOT NULL,
  visitDate DATETIME NOT NULL,
  notes VARCHAR(500) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_visit (memberId, visitDate),
  INDEX idx_visit_date (visitDate)
);

-- Agregar indices
CREATE INDEX idx_member_code ON members(memberCode);
