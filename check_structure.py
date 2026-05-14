import mysql.connector
import pyodbc

mysql_config = {
    'host': 'localhost',
    'user': 'hunk2109',
    'password': 'muerete66',
    'database': 'gym_manager'
}

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
access_conn_str = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    mysql_conn = mysql.connector.connect(**mysql_config)
    mysql_cursor = mysql_conn.cursor()
    
    print("=" * 150)
    print("ESTRUCTURA DE TABLAS MYSQL")
    print("=" * 150)
    
    # Tablas principales
    tables_to_check = [
        'users', 'members', 'attendances', 'memberships', 
        'payments', 'products', 'employees', 'gym_settings'
    ]
    
    for table_name in tables_to_check:
        print(f"\n\n📋 TABLA: {table_name}")
        print("-" * 150)
        
        try:
            mysql_cursor.execute(f"DESCRIBE {table_name}")
            columns = mysql_cursor.fetchall()
            
            mysql_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = mysql_cursor.fetchone()[0]
            
            print(f"Registros: {count}")
            print(f"\nColumnas:")
            for col in columns:
                col_name, col_type, nullable, key, default, extra = col
                print(f"  - {col_name}: {col_type} {nullable}")
                
        except mysql.connector.Error as e:
            print(f"  ⚠️  Tabla no existe: {e.msg}")
    
    mysql_conn.close()
    
    # Ahora comparar con Access
    print("\n\n" + "=" * 150)
    print("ESTRUCTURA DE TABLAS ACCESS")
    print("=" * 150)
    
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    access_tables = {
        'USERINFO': 'Empleados',
        'CHECKINOUT': 'Asistencia',
        'factura': 'Facturas',
        'facturap': 'Detalles Pago',
        'Productos': 'Productos',
        'acc_monitor_log': 'Logs Biométricos'
    }
    
    for table_name, desc in access_tables.items():
        print(f"\n\n📋 TABLA: {table_name} ({desc})")
        print("-" * 150)
        
        try:
            access_cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = access_cursor.fetchone()[0]
            
            access_cursor.execute(f"SELECT * FROM [{table_name}]")
            cols = [description[0] for description in access_cursor.description]
            
            print(f"Registros: {count:,}")
            print(f"Columnas ({len(cols)}):")
            for col in cols[:15]:  # Mostrar primeras 15
                print(f"  - {col}")
            if len(cols) > 15:
                print(f"  ... y {len(cols) - 15} más")
                
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
    
    access_conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
