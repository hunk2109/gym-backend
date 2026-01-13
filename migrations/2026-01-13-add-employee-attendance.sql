-- Agregar soporte para asistencias de empleados
ALTER TABLE attendances 
ADD COLUMN employee_id VARCHAR(36) NULL,
ADD COLUMN attendance_type VARCHAR(20) DEFAULT 'member',
ADD CONSTRAINT fk_attendances_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Hacer memberId nullable ahora que soportamos empleados
ALTER TABLE attendances MODIFY COLUMN member_id VARCHAR(36) NULL;

-- Crear índice para búsquedas rápidas por empleado
CREATE INDEX idx_attendances_employee ON attendances(employee_id);
CREATE INDEX idx_attendances_type ON attendances(attendance_type);
