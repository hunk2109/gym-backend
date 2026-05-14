import pyodbc

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    main_tables = [
        'detallep',           # 4,993 - Detalles de pago?
        'acc_monitor_log',    # 4,357 - Logs de monitor
        'CHECKINOUT',         # 4,231 - Asistencia
        'factura',            # 3,822 - Facturas
        'facturap',           # 1,020 - Detalles factura
        'USERINFO',           # 562 - Usuarios
        'Productos',          # 43 - Productos
    ]
    
    print("=" * 120)
    print("ANALIZANDO TABLAS PRINCIPALES")
    print("=" * 120)
    
    for table_name in main_tables:
        print(f"\n\n{'='*120}")
        print(f"📊 TABLA: {table_name}")
        print(f"{'='*120}")
        
        try:
            # Contar registros
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            print(f"Total de registros: {count:,}")
            
            # Obtener columnas usando una consulta más segura
            cursor.execute(f"SELECT * FROM [{table_name}]")
            columns = [description[0] for description in cursor.description]
            print(f"Columnas ({len(columns)}): {columns}")
            
            # Leer primeros 3 registros
            cursor.execute(f"SELECT * FROM [{table_name}]")
            rows = cursor.fetchall()
            
            print(f"\nPrimeros {min(3, len(rows))} registros:")
            for i, row in enumerate(rows[:3], 1):
                print(f"\n  Registro {i}:")
                for col, val in zip(columns, row):
                    val_str = str(val)[:80] if val is not None else "NULL"
                    if len(str(val)) > 80:
                        val_str += "..."
                    print(f"    {col}: {val_str}")
                
        except Exception as e:
            print(f"  ⚠️ Error: {e}")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
