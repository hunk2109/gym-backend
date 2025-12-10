-- Eliminar las tablas relacionadas
DROP TABLE IF EXISTS group_companions;
DROP TABLE IF EXISTS group_membership_users;
DROP TABLE IF EXISTS group_memberships;

-- Crear group_memberships correctamente
CREATE TABLE group_memberships (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  membershipId VARCHAR(36) NOT NULL,
  responsibleUserId VARCHAR(36) NULL,
  maxMembers INT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (membershipId) REFERENCES memberships(id) ON DELETE CASCADE,
  FOREIGN KEY (responsibleUserId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX IDX_membershipId (membershipId),
  INDEX IDX_responsibleUserId (responsibleUserId)
);

-- Crear group_companions
CREATE TABLE group_companions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  groupMembershipId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (groupMembershipId) REFERENCES group_memberships(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY UQ_group_user (groupMembershipId, userId),
  INDEX IDX_groupMembershipId (groupMembershipId),
  INDEX IDX_userId (userId),
  INDEX IDX_status (status)
);

-- Crear group_membership_users (para compatibilidad)
CREATE TABLE group_membership_users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  groupMembershipId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (groupMembershipId) REFERENCES group_memberships(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY UQ_group_membership_user (groupMembershipId, userId),
  INDEX IDX_groupMembershipId (groupMembershipId),
  INDEX IDX_userId (userId)
);

SELECT 'Tablas recreadas exitosamente' as status;
