import pyodbc
import sys

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'

connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    # Método 1: Usar la tabla MSysObjects (tablas del sistema)
    print("=" * 80)
    print("TABLAS EN LA BASE DE DATOS (Incluyendo del sistema)")
    print("=" * 80)
    
    try:
        cursor.execute("""
            SELECT Name FROM MSysObjects 
            WHERE Type=1 
            ORDER BY Name
        """)
        
        tables = cursor.fetchall()
        print(f"\nTotal de tablas encontradas: {len(tables)}\n")
        
        for table in tables:
            table_name = table[0]
            print(f"\n{'='*80}")
            print(f"Tabla: {table_name}")
            print(f"{'='*80}")
            
            try:
                # Obtener columnas
                col_cursor = cursor.columns(table=table_name)
                print("Columnas:")
                col_list = []
                for col in col_cursor:
                    col_name = col.column_name
                    col_type = col.type_name
                    col_list.append(col_name)
                    print(f"  - {col_name} ({col_type})")
                
                # Contar registros
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = cursor.fetchone()[0]
                print(f"\nTotal de registros: {count}")
                
                # Mostrar primeros 3 registros
                if count > 0 and len(col_list) > 0:
                    print(f"\nPrimeros registros:")
                    cursor.execute(f"SELECT * FROM [{table_name}]")
                    rows = cursor.fetchall()
                    for i, row in enumerate(rows[:3], 1):
                        print(f"  Registro {i}: {row}")
                    if count > 3:
                        print(f"  ... ({count - 3} registros más)")
                        
            except Exception as e:
                print(f"Error al procesar tabla: {e}")
    
    except Exception as e:
        print(f"Error al acceder a MSysObjects: {e}")
        print("\nIntentando con cursor.tables()...")
        
        for row in cursor.tables(tableType='TABLE'):
            table_name = row.table_name
            if not table_name.startswith('MSys'):
                print(f"Tabla: {table_name}")
    
    conn.close()
    
except Exception as e:
    print(f"Error de conexión: {e}")
    import traceback
    traceback.print_exc()
