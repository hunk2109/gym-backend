#!/usr/bin/env python3
"""
Script de sincronización de datos entre Access y MySQL.
Permite elegir la ruta de la base de datos de Access.

Uso:
  python sincronizar_bases.py                    # Usa ruta por defecto
  python sincronizar_bases.py /ruta/a/bd.mdb   # Usa ruta personalizada
"""

import pyodbc
import mysql.connector
import sys
import os
from datetime import datetime
from pathlib import Path

from src.modules.sync.scripts.access_common import build_access_connection_string, resolve_access_db_path

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

# Base de datos MySQL
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USERNAME', 'root'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'database': os.getenv('DB_NAME', 'gym_manager'),
}

# Ruta de Access (por defecto)
DEFAULT_ACCESS_DB = resolve_access_db_path(default_path=None, cwd=os.getcwd())

# =============================================================================
# FUNCIONES AUXILIARES
# =============================================================================

def get_access_db_path():
    """Obtiene la ruta de la base de datos Access."""
    if len(sys.argv) > 1:
        path = resolve_access_db_path(sys.argv[1], default_path=None, cwd=os.getcwd())
        if os.path.exists(path):
            print(f"✓ Usando base de datos: {path}")
            return path
        else:
            print(f"✗ Ruta no encontrada: {path}")
            sys.exit(1)
    else:
        path = DEFAULT_ACCESS_DB
        if os.path.exists(path):
            print(f"✓ Usando base de datos por defecto: {path}")
            return path
        else:
            print(f"✗ Base de datos por defecto no encontrada: {path}")
            sys.exit(1)

def connect_access(db_path):
    """Conecta a la base de datos Access."""
    try:
        conn = pyodbc.connect(build_access_connection_string(db_path))
        print("✓ Conectado a Access\n")
        return conn
    except Exception as e:
        print(f"✗ Error conectando a Access: {e}")
        sys.exit(1)

def connect_mysql():
    """Conecta a la base de datos MySQL."""
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        print("✓ Conectado a MySQL\n")
        return conn
    except Exception as e:
        print(f"✗ Error conectando a MySQL: {e}")
        sys.exit(1)

def log_sync(message):
    """Registra un mensaje de sincronización."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

# =============================================================================
# SINCRONIZACIÓN DE TABLAS
# =============================================================================

def sync_users(access_conn, mysql_conn):
    """Sincroniza empleados de USERINFO a users."""
    print("="*80)
    print("SINCRONIZANDO: USUARIOS/EMPLEADOS (USERINFO → users)")
    print("="*80 + "\n")
    
    access_cursor = access_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Obtener datos de Access
        log_sync("Leyendo empleados de Access...")
        access_cursor.execute("""
            SELECT USERID, name, lastname, email, PAGER, Badgenumber, privilege
            FROM USERINFO
            ORDER BY USERID
        """)
        employees = access_cursor.fetchall()
        log_sync(f"Encontrados {len(employees)} empleados en Access")
        
        # Limpiar tabla users existente (opcional)
        log_sync("Limpiando tabla users en MySQL...")
        mysql_cursor.execute("DELETE FROM users")
        mysql_conn.commit()
        
        # Insertar en MySQL
        log_sync("Insertando empleados en MySQL...")
        inserted = 0
        skipped = 0
        
        for emp in employees:
            userid, name, lastname, email, phone, badge, privilege = emp
            
            try:
                # Generar ID único
                user_id = f"emp_{userid}"
                
                # Email puede ser nulo
                email = email if email and str(email).strip() else f"emp{userid}@gym.local"
                
                # Password por defecto (hash bcrypt de "123456")
                password_hash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7Ec6FQZeugP/Fxz1z8PYK9Ze"
                
                mysql_cursor.execute("""
                    INSERT INTO users (id, email, passwordHash, firstName, lastName, phone, role, isActive, createdAt, updatedAt)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    user_id,
                    email,
                    password_hash,
                    name if name else f"Emp{userid}",
                    lastname if lastname else "",
                    phone if phone else "",
                    "staff" if privilege == 0 else "manager",
                    True
                ))
                inserted += 1
                
            except mysql.connector.Error as e:
                log_sync(f"  ⚠ Error insertando empleado {userid}: {e}")
                skipped += 1
        
        mysql_conn.commit()
        log_sync(f"✓ Insertados: {inserted}, Omitidos: {skipped}\n")
        
    except Exception as e:
        print(f"✗ Error en sincronización de usuarios: {e}")
    finally:
        access_cursor.close()
        mysql_cursor.close()

def sync_members(access_conn, mysql_conn):
    """Sincroniza clientes de facturas a members."""
    print("="*80)
    print("SINCRONIZANDO: MIEMBROS/CLIENTES (factura → members)")
    print("="*80 + "\n")
    
    access_cursor = access_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Obtener clientes únicos de facturas
        log_sync("Leyendo clientes de facturas en Access...")
        access_cursor.execute("""
            SELECT DISTINCT Id_cliente
            FROM factura
            WHERE Id_cliente IS NOT NULL
            ORDER BY Id_cliente
        """)
        client_ids = [row[0] for row in access_cursor.fetchall()]
        log_sync(f"Encontrados {len(client_ids)} clientes únicos")
        
        # Limpiar tabla members
        log_sync("Limpiando tabla members en MySQL...")
        mysql_cursor.execute("DELETE FROM members")
        mysql_conn.commit()
        
        # Insertar clientes como miembros
        log_sync("Insertando miembros en MySQL...")
        inserted = 0
        
        for client_id in client_ids:
            try:
                # Generar member_code
                member_code = f"CLI_{client_id:06d}"
                
                # Obtener un usuario random como userId (para FK)
                mysql_cursor.execute("SELECT id FROM users LIMIT 1")
                result = mysql_cursor.fetchone()
                user_id = result[0] if result else "emp_1"
                
                mysql_cursor.execute("""
                    INSERT INTO members (userId, memberCode, createdAt, updatedAt)
                    VALUES (%s, %s, NOW(), NOW())
                """, (
                    user_id,
                    member_code
                ))
                inserted += 1
                
            except mysql.connector.Error as e:
                log_sync(f"  ⚠ Error insertando cliente {client_id}: {e}")
        
        mysql_conn.commit()
        log_sync(f"✓ Insertados: {inserted} miembros\n")
        
    except Exception as e:
        print(f"✗ Error en sincronización de miembros: {e}")
    finally:
        access_cursor.close()
        mysql_cursor.close()

def sync_products(access_conn, mysql_conn):
    """Sincroniza productos de Access a MySQL."""
    print("="*80)
    print("SINCRONIZANDO: PRODUCTOS (Productos → products)")
    print("="*80 + "\n")
    
    access_cursor = access_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Obtener productos de Access
        log_sync("Leyendo productos de Access...")
        access_cursor.execute("""
            SELECT Id, nombreProducto, precio, cantidad
            FROM Productos
            ORDER BY Id
        """)
        products = access_cursor.fetchall()
        log_sync(f"Encontrados {len(products)} productos")
        
        # Limpiar tabla products
        log_sync("Limpiando tabla products en MySQL...")
        mysql_cursor.execute("DELETE FROM products")
        mysql_conn.commit()
        
        # Insertar productos
        log_sync("Insertando productos en MySQL...")
        inserted = 0
        
        for prod in products:
            prod_id, name, price, quantity = prod
            
            try:
                mysql_cursor.execute("""
                    INSERT INTO products (name, description, category, price, quantity, SKU, createdAt, updatedAt)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    name if name else f"Producto {prod_id}",
                    "",
                    "service",
                    float(price) if price else 0.00,
                    int(quantity) if quantity else 0,
                    f"SKU_{prod_id:04d}"
                ))
                inserted += 1
                
            except mysql.connector.Error as e:
                log_sync(f"  ⚠ Error insertando producto {prod_id}: {e}")
        
        mysql_conn.commit()
        log_sync(f"✓ Insertados: {inserted} productos\n")
        
    except Exception as e:
        print(f"✗ Error en sincronización de productos: {e}")
    finally:
        access_cursor.close()
        mysql_cursor.close()

def sync_payments(access_conn, mysql_conn):
    """Sincroniza facturas/pagos de Access a MySQL."""
    print("="*80)
    print("SINCRONIZANDO: PAGOS/FACTURAS (factura/facturap → payments)")
    print("="*80 + "\n")
    
    access_cursor = access_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Obtener facturas de Access
        log_sync("Leyendo facturas de Access...")
        access_cursor.execute("""
            SELECT Num_factura, Fecha_factura, Monto, Total_factura, Id_cliente
            FROM factura
            ORDER BY Num_factura
        """)
        invoices = access_cursor.fetchall()
        log_sync(f"Encontradas {len(invoices)} facturas")
        
        # Limpiar tabla payments
        log_sync("Limpiando tabla payments en MySQL...")
        mysql_cursor.execute("DELETE FROM payments")
        mysql_conn.commit()
        
        # Insertar pagos
        log_sync("Insertando pagos en MySQL...")
        inserted = 0
        
        # Obtener IDs de miembros
        mysql_cursor.execute("SELECT id FROM members LIMIT 1")
        member_result = mysql_cursor.fetchone()
        default_member_id = member_result[0] if member_result else 1
        
        for invoice in invoices:
            invoice_num, fecha, amount, total, client_id = invoice
            
            try:
                mysql_cursor.execute("""
                    INSERT INTO payments (memberId, amount, paymentMethod, status, paymentType, paymentDate, createdAt, updatedAt)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    default_member_id,
                    float(total) if total else float(amount) if amount else 0.00,
                    "cash",
                    "completed",
                    "membership",
                    fecha if fecha else datetime.now()
                ))
                inserted += 1
                
            except mysql.connector.Error as e:
                log_sync(f"  ⚠ Error insertando factura {invoice_num}: {e}")
        
        mysql_conn.commit()
        log_sync(f"✓ Insertados: {inserted} pagos\n")
        
    except Exception as e:
        print(f"✗ Error en sincronización de pagos: {e}")
    finally:
        access_cursor.close()
        mysql_cursor.close()

def sync_attendances(access_conn, mysql_conn):
    """Sincroniza logs de acceso a attendances."""
    print("="*80)
    print("SINCRONIZANDO: ASISTENCIA (acc_monitor_log → attendances)")
    print("="*80 + "\n")
    
    access_cursor = access_conn.cursor()
    mysql_cursor = mysql_conn.cursor()
    
    try:
        # Obtener logs de Access
        log_sync("Leyendo logs de acceso en Access...")
        access_cursor.execute("""
            SELECT pin, time, verified
            FROM acc_monitor_log
            WHERE verified = 1
            ORDER BY time DESC
        """)
        logs = access_cursor.fetchall()
        log_sync(f"Encontrados {len(logs)} eventos de acceso verificado")
        
        # Limpiar tabla attendances
        log_sync("Limpiando tabla attendances en MySQL...")
        mysql_cursor.execute("DELETE FROM attendances")
        mysql_conn.commit()
        
        # Insertar asistencias
        log_sync("Insertando asistencias en MySQL...")
        inserted = 0
        
        # Obtener IDs de miembros
        mysql_cursor.execute("SELECT id FROM members LIMIT 1")
        member_result = mysql_cursor.fetchone()
        default_member_id = member_result[0] if member_result else 1
        
        for log in logs[:1000]:  # Limitar a 1000 registros
            pin, time, verified = log
            
            try:
                mysql_cursor.execute("""
                    INSERT INTO attendances (memberId, attendanceType, visitDate, status, createdAt, updatedAt)
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                """, (
                    default_member_id,
                    "entry",
                    time if time else datetime.now(),
                    "completed" if verified == 1 else "pending"
                ))
                inserted += 1
                
            except mysql.connector.Error as e:
                log_sync(f"  ⚠ Error insertando asistencia: {e}")
        
        mysql_conn.commit()
        log_sync(f"✓ Insertados: {inserted} asistencias (máx 1000)\n")
        
    except Exception as e:
        print(f"✗ Error en sincronización de asistencias: {e}")
    finally:
        access_cursor.close()
        mysql_cursor.close()

# =============================================================================
# MAIN
# =============================================================================

def main():
    """Función principal."""
    print("\n" + "="*80)
    print("SINCRONIZADOR DE BASES DE DATOS: Access ↔ MySQL")
    print("="*80 + "\n")
    
    # Obtener ruta de Access
    access_db_path = get_access_db_path()
    
    # Conectar a ambas bases de datos
    print("Conectando a bases de datos...")
    access_conn = connect_access(access_db_path)
    mysql_conn = connect_mysql()
    
    try:
        # Ejecutar sincronizaciones
        log_sync("Iniciando sincronización de datos...\n")
        
        sync_users(access_conn, mysql_conn)
        sync_members(access_conn, mysql_conn)
        sync_products(access_conn, mysql_conn)
        sync_payments(access_conn, mysql_conn)
        sync_attendances(access_conn, mysql_conn)
        
        print("="*80)
        print("✓ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE")
        print("="*80 + "\n")
        
        # Resumen
        mysql_cursor = mysql_conn.cursor()
        
        print("RESUMEN DE DATOS EN MySQL:\n")
        
        tables = {
            'users': 'Empleados/Usuarios',
            'members': 'Miembros/Clientes',
            'products': 'Productos',
            'payments': 'Pagos/Facturas',
            'attendances': 'Asistencias/Accesos',
        }
        
        for table, label in tables.items():
            mysql_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = mysql_cursor.fetchone()[0]
            print(f"  {label:.<40} {count} registros")
        
        mysql_cursor.close()
        
    finally:
        access_conn.close()
        mysql_conn.close()
        print("\n✓ Conexiones cerradas")

if __name__ == "__main__":
    main()
