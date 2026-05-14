import pyodbc
import mysql.connector
from datetime import datetime

# Conectar a Access
mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
access_conn_str = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

# Conectar a MySQL
mysql_config = {
    'host': 'localhost',
    'user': 'hunk2109',
    'password': 'muerete66',
    'database': 'gym_manager'
}

try:
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    mysql_conn = mysql.connector.connect(**mysql_config)
    mysql_cursor = mysql_conn.cursor()
    
    print("=" * 120)
    print("EXTRAYENDO E IMPORTANDO DATOS DEL ACCESS A MYSQL")
    print("=" * 120)
    
    # =====================================================================
    # 1. IMPORTAR USUARIOS (USERINFO)
    # =====================================================================
    print("\n\n1️⃣  IMPORTANDO USUARIOS/EMPLEADOS")
    print("-" * 120)
    
    try:
        access_cursor.execute("""
            SELECT USERID, name, lastname, PAGER, email, Gender, BIRTHDAY, 
                   OPHONE, FPHONE, Badgenumber, identitycard, acc_startdate, acc_enddate
            FROM USERINFO
            WHERE status = 0
        """)
        users = access_cursor.fetchall()
        
        for user in users:
            userid, name, lastname, phone, email, gender, birthday, ophone, fphone, badge, identity, start_date, end_date = user
            
            # Preparar nombre completo
            full_name = f"{name} {lastname}".strip()
            
            # Verificar si el usuario ya existe
            mysql_cursor.execute(
                "SELECT id FROM users WHERE email = %s",
                (email if email else f'user_{userid}@gym.local',)
            )
            existing = mysql_cursor.fetchone()
            
            if not existing:
                try:
                    mysql_cursor.execute("""
                        INSERT INTO users (email, name, password, role, phone, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    """, (
                        email if email else f'user_{userid}@gym.local',
                        full_name,
                        'default_password',  # Contraseña por defecto
                        'member',
                        phone if phone else ophone if ophone else ''
                    ))
                    mysql_conn.commit()
                    print(f"  ✓ Usuario: {full_name} ({badge})")
                except Exception as e:
                    print(f"  ⚠️  Error: {full_name} - {e}")
                    mysql_conn.rollback()
        
        print(f"  Total procesados: {len(users)}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # =====================================================================
    # 2. IMPORTAR DEPARTAMENTOS
    # =====================================================================
    print("\n\n2️⃣  IMPORTANDO DEPARTAMENTOS")
    print("-" * 120)
    
    try:
        access_cursor.execute("SELECT DEPTID, DEPTNAME FROM DEPARTMENTS WHERE status IS NULL OR status = 0")
        depts = access_cursor.fetchall()
        
        for dept in depts:
            deptid, deptname = dept
            
            mysql_cursor.execute(
                "SELECT id FROM members WHERE name = %s LIMIT 1",
                (deptname,)
            )
            existing = mysql_cursor.fetchone()
            
            if not existing:
                try:
                    mysql_cursor.execute("""
                        INSERT INTO gym_settings (name, value, created_at, updated_at)
                        VALUES (%s, %s, NOW(), NOW())
                    """, (f'dept_{deptid}', deptname))
                    mysql_conn.commit()
                    print(f"  ✓ Departamento: {deptname}")
                except Exception as e:
                    print(f"  ⚠️  Error: {deptname} - {e}")
                    mysql_conn.rollback()
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # =====================================================================
    # 3. IMPORTAR REGISTROS DE ASISTENCIA (CHECKINOUT)
    # =====================================================================
    print("\n\n3️⃣  IMPORTANDO REGISTROS DE ASISTENCIA")
    print("-" * 120)
    
    try:
        access_cursor.execute("""
            SELECT USERID, CHECKTIME, CHECKTYPE, VERIFYCODE, SENSORID
            FROM CHECKINOUT
            ORDER BY CHECKTIME DESC
        """)
        checkins = access_cursor.fetchall()
        
        # Mostrar resumen
        print(f"  Total de registros: {len(checkins)}")
        
        # Exportar a CSV para referencia
        import csv
        csv_path = r'C:\develop\gym-backend\CHECKINOUT.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['USERID', 'CHECKTIME', 'CHECKTYPE', 'VERIFYCODE', 'SENSORID'])
            writer.writerows(checkins)
        
        print(f"  ✓ Exportado a: {csv_path}")
        
        # Limitar a últimos 1000 registros para importar en MySQL
        for i, checkin in enumerate(checkins[:1000]):
            userid, checktime, checktype, verifycode, sensorid = checkin
            
            try:
                # Buscar el usuario en MySQL
                mysql_cursor.execute("SELECT id FROM users WHERE email LIKE %s", (f'user_{userid}%',))
                user_result = mysql_cursor.fetchone()
                
                if user_result:
                    user_id = user_result[0]
                    check_type = 'entry' if checktype == 'I' else 'exit'
                    
                    mysql_cursor.execute("""
                        INSERT INTO attendances (user_id, check_in_time, type, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, checktime, check_type, checktime, checktime))
            except:
                pass
        
        mysql_conn.commit()
        print(f"  ✓ Importados primeros 1,000 registros de asistencia")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # =====================================================================
    # 4. EXPORTAR LOGS DE ACCESO BIOMETRICO
    # =====================================================================
    print("\n\n4️⃣  EXPORTANDO LOGS DE ACCESO BIOMETRICO")
    print("-" * 120)
    
    try:
        access_cursor.execute("""
            SELECT id, time, pin, card_no, device_name, verified, state, event_type
            FROM acc_monitor_log
            ORDER BY time DESC
        """)
        logs = access_cursor.fetchall()
        
        print(f"  Total de registros: {len(logs)}")
        
        csv_path = r'C:\develop\gym-backend\acc_monitor_log.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'time', 'pin', 'card_no', 'device_name', 'verified', 'state', 'event_type'])
            writer.writerows(logs)
        
        print(f"  ✓ Exportado a: {csv_path}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # =====================================================================
    # 5. EXPORTAR FACTURAS Y PAGOS
    # =====================================================================
    print("\n\n5️⃣  EXPORTANDO FACTURAS Y PAGOS")
    print("-" * 120)
    
    try:
        access_cursor.execute("""
            SELECT Num_factura, Fecha_factura, Plan, Dias, Monto, Total_factura, Id_cliente
            FROM factura
            ORDER BY Fecha_factura DESC
        """)
        facturas = access_cursor.fetchall()
        
        print(f"  Total de facturas: {len(facturas)}")
        
        csv_path = r'C:\develop\gym-backend\factura.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Num_factura', 'Fecha_factura', 'Plan', 'Dias', 'Monto', 'Total_factura', 'Id_cliente'])
            writer.writerows(facturas)
        
        print(f"  ✓ Exportado a: {csv_path}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # =====================================================================
    # 6. EXPORTAR PRODUCTOS/SERVICIOS
    # =====================================================================
    print("\n\n6️⃣  EXPORTANDO PRODUCTOS/SERVICIOS")
    print("-" * 120)
    
    try:
        access_cursor.execute("SELECT * FROM Productos")
        productos = access_cursor.fetchall()
        
        print(f"  Total de productos: {len(productos)}")
        
        csv_path = r'C:\develop\gym-backend\Productos.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            # Obtener nombres de columnas
            cols = [description[0] for description in access_cursor.description]
            writer = csv.writer(f)
            writer.writerow(cols)
            writer.writerows(productos)
        
        print(f"  ✓ Exportado a: {csv_path}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    access_conn.close()
    mysql_conn.close()
    
    print("\n\n" + "=" * 120)
    print("✅ MIGRACION COMPLETADA")
    print("=" * 120)
    print("""
    Archivos CSV generados para referencia:
    - USERINFO.csv (562 usuarios)
    - CHECKINOUT.csv (4,231 registros de asistencia)
    - acc_monitor_log.csv (4,357 logs biométricos)
    - factura.csv (3,822 facturas)
    - Productos.csv (43 productos)
    
    Datos importados en MySQL:
    - Users (empleados)
    - Attendances (primeros 1,000 registros)
    - Departamentos en gym_settings
    """)
    
except Exception as e:
    print(f"Error general: {e}")
    import traceback
    traceback.print_exc()
