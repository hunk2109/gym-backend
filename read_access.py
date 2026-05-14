import pyodbc
import json
import os

# Ruta del archivo MDB
mdb_path = r'C:\develop\gym-backend\dowtown.mdb'

# Crear la cadena de conexión para MDB
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    # Conectar a la base de datos
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    # Obtener lista de tablas
    print("=" * 80)
    print("TABLAS EN LA BASE DE DATOS ACCESS")
    print("=" * 80)
    
    tables = []
    for row in cursor.tables():
        table_name = row.table_name
        if not table_name.startswith('MSys'):  # Excluir tablas del sistema
            tables.append(table_name)
            print(f"\nTabla: {table_name}")
            
            # Obtener estructura de la tabla
            try:
                col_cursor = cursor.columns(table=table_name)
                print("  Columnas:")
                for col in col_cursor:
                    col_name = col.column_name
                    col_type = col.type_name
                    print(f"    - {col_name} ({col_type})")
                
                # Obtener cantidad de registros
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = cursor.fetchone()[0]
                print(f"  Registros: {count}")
                
                # Mostrar primeros registros (máximo 5)
                if count > 0:
                    print(f"  Primeros registros:")
                    cursor.execute(f"SELECT * FROM [{table_name}] LIMIT 5")
                    rows = cursor.fetchall()
                    for i, row in enumerate(rows, 1):
                        print(f"    {i}. {row}")
            except Exception as e:
                print(f"  Error al leer tabla: {e}")
    
    conn.close()
    print("\n" + "=" * 80)
    print(f"Total de tablas: {len(tables)}")
    
except Exception as e:
    print(f"Error de conexión: {e}")
    print("\nAsegúrate de que Microsoft Access está instalado o usa un driver compatible.")
