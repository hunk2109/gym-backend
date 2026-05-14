import pyodbc
import csv
from datetime import datetime

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    print("=" * 100)
    print("EXTRAYENDO DATOS PRINCIPALES DEL SISTEMA DE CONTROL DE ACCESO")
    print("=" * 100)
    
    # 1. USERINFO - Usuarios/Empleados
    print("\n\n1. TABLA: USERINFO (Empleados/Usuarios)")
    print("-" * 100)
    try:
        cursor.execute("SELECT * FROM USERINFO")
        columns = [description[0] for description in cursor.description]
        print(f"Columnas: {columns}")
        
        rows = cursor.fetchall()
        print(f"Total de registros: {len(rows)}")
        
        if len(rows) > 0:
            print("\nPrimeros 5 registros:")
            for i, row in enumerate(rows[:5], 1):
                print(f"  {i}. {row}")
            
            # Guardar a CSV
            csv_path = r'C:\develop\gym-backend\USERINFO.csv'
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                writer.writerows(rows)
            print(f"\n✓ Exportado a {csv_path}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 2. DEPARTMENTS - Departamentos
    print("\n\n2. TABLA: DEPARTMENTS (Departamentos)")
    print("-" * 100)
    try:
        cursor.execute("SELECT * FROM DEPARTMENTS")
        columns = [description[0] for description in cursor.description]
        print(f"Columnas: {columns}")
        
        rows = cursor.fetchall()
        print(f"Total de registros: {len(rows)}")
        
        if len(rows) > 0:
            print("\nRegistros:")
            for i, row in enumerate(rows[:10], 1):
                print(f"  {i}. {row}")
            
            csv_path = r'C:\develop\gym-backend\DEPARTMENTS.csv'
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                writer.writerows(rows)
            print(f"\n✓ Exportado a {csv_path}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 3. CHECKINOUT - Registros de asistencia
    print("\n\n3. TABLA: CHECKINOUT (Registros de Asistencia)")
    print("-" * 100)
    try:
        cursor.execute("SELECT * FROM CHECKINOUT LIMIT 5")
        columns = [description[0] for description in cursor.description]
        print(f"Columnas: {columns}")
        
        cursor.execute("SELECT COUNT(*) FROM CHECKINOUT")
        count = cursor.fetchone()[0]
        print(f"Total de registros: {count}")
        
        if count > 0:
            cursor.execute("SELECT TOP 5 * FROM CHECKINOUT")
            rows = cursor.fetchall()
            print("\nÚltimos 5 registros:")
            for i, row in enumerate(rows, 1):
                print(f"  {i}. {row}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 4. auth_user - Usuarios de autenticación
    print("\n\n4. TABLA: auth_user (Usuarios del Sistema)")
    print("-" * 100)
    try:
        cursor.execute("SELECT * FROM auth_user")
        columns = [description[0] for description in cursor.description]
        print(f"Columnas: {columns}")
        
        rows = cursor.fetchall()
        print(f"Total de registros: {len(rows)}")
        
        if len(rows) > 0:
            print("\nRegistros:")
            for i, row in enumerate(rows[:10], 1):
                print(f"  {i}. {row}")
            
            csv_path = r'C:\develop\gym-backend\auth_user.csv'
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                writer.writerows(rows)
            print(f"\n✓ Exportado a {csv_path}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 5. SHIFT - Turnos
    print("\n\n5. TABLA: SHIFT (Turnos)")
    print("-" * 100)
    try:
        cursor.execute("SELECT * FROM SHIFT")
        columns = [description[0] for description in cursor.description]
        print(f"Columnas: {columns}")
        
        rows = cursor.fetchall()
        print(f"Total de registros: {len(rows)}")
        
        if len(rows) > 0:
            print("\nRegistros:")
            for i, row in enumerate(rows[:10], 1):
                print(f"  {i}. {row}")
    except Exception as e:
        print(f"Error: {e}")
    
    conn.close()
    
    print("\n\n" + "=" * 100)
    print("ARCHIVOS EXPORTADOS")
    print("=" * 100)
    print("✓ C:\\develop\\gym-backend\\USERINFO.csv")
    print("✓ C:\\develop\\gym-backend\\DEPARTMENTS.csv")
    print("✓ C:\\develop\\gym-backend\\auth_user.csv")
    
except Exception as e:
    print(f"Error general: {e}")
    import traceback
    traceback.print_exc()
