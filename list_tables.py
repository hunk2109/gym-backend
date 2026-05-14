import pyodbc

db_path = r"c:\develop\gym-backend\dowtown.mdb"

try:
    conn = pyodbc.connect(f'Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};')
    cursor = conn.cursor()
    
    print("=== TABLAS EN ACCESS ===\n")
    for table_info in cursor.tables(tableType='TABLE'):
        table_name = table_info[2]
        print(table_name)
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
