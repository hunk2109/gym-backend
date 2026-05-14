import pyodbc

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    print("=" * 120)
    print("ANALIZANDO TABLAS PRINCIPALES - CONTEO DE REGISTROS")
    print("=" * 120)
    
    # Obtener todas las tablas
    tables = []
    for row in cursor.tables(tableType='TABLE'):
        table_name = row.table_name
        if not table_name.startswith('MSys'):
            tables.append(table_name)
    
    # Contar registros en cada tabla
    table_counts = []
    for table_name in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            if count > 0:
                table_counts.append((table_name, count))
        except:
            pass
    
    # Ordenar por cantidad de registros
    table_counts.sort(key=lambda x: x[1], reverse=True)
    
    print("\nTABLAS CON DATOS (Top 20):\n")
    print(f"{'#':<3} {'Tabla':<40} {'Registros':>12}")
    print("-" * 120)
    
    for i, (table_name, count) in enumerate(table_counts[:20], 1):
        print(f"{i:<3} {table_name:<40} {count:>12,}")
    
    print("\n" + "=" * 120)
    print("MOSTRANDO DETALLES DE LAS 10 TABLAS PRINCIPALES")
    print("=" * 120)
    
    # Mostrar detalles de las 10 tablas principales
    for table_name, count in table_counts[:10]:
        print(f"\n\n📊 TABLA: {table_name}")
        print(f"{'─' * 120}")
        print(f"Total de registros: {count:,}")
        
        try:
            # Obtener columnas
            cursor.execute(f"SELECT * FROM [{table_name}] LIMIT 1")
            columns = [description[0] for description in cursor.description]
            print(f"Columnas ({len(columns)}): {', '.join(columns[:10])}")
            if len(columns) > 10:
                print(f"         ... y {len(columns) - 10} más")
            
            # Mostrar primeros registros
            cursor.execute(f"SELECT TOP 3 * FROM [{table_name}]")
            rows = cursor.fetchall()
            
            print(f"\nPrimeros registros:")
            for i, row in enumerate(rows, 1):
                # Mostrar valores principales
                row_str = str(row)[:150]
                if len(str(row)) > 150:
                    row_str += "..."
                print(f"  {i}. {row_str}")
                
        except Exception as e:
            print(f"  Error: {e}")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
