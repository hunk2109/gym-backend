#!/usr/bin/env python3
"""
Script para leer datos de Access y retornar JSON.
Uso: python access-query.py "/ruta/a/bd.mdb" "SELECT ... FROM ..."
"""

import pyodbc
import json
import sys
from urllib.parse import unquote

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Faltan argumentos"}))
        sys.exit(1)

    db_path = sys.argv[1]
    query = unquote(sys.argv[2])

    try:
        # Conectar a Access
        conn = pyodbc.connect(f'Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};')
        cursor = conn.cursor()

        # Ejecutar query
        cursor.execute(query)

        # Convertir resultados a lista de diccionarios
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()

        results = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Convertir tipos de datos para JSON
                if value is None:
                    row_dict[col] = None
                elif isinstance(value, (int, float, str, bool)):
                    row_dict[col] = value
                else:
                    # Convertir otros tipos a string
                    row_dict[col] = str(value)
            results.append(row_dict)

        # Retornar JSON
        print(json.dumps(results))

        cursor.close()
        conn.close()

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
