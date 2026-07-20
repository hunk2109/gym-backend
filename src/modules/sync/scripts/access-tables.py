#!/usr/bin/env python3
"""
Lista tablas disponibles en una base Access.
Uso: python access-tables.py "/ruta/a/bd.mdb"
"""

import json
import sys
import pyodbc

from access_common import build_access_connection_string, resolve_access_db_path


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Falta ruta de base de datos"}))
        sys.exit(1)

    db_path = resolve_access_db_path(sys.argv[1], default_path=None, cwd=None)

    try:
        conn = pyodbc.connect(build_access_connection_string(db_path))
        cursor = conn.cursor()

        tables = []
        for row in cursor.tables(tableType="TABLE"):
            table_name = row.table_name
            if table_name and not table_name.startswith("MSys"):
                tables.append(table_name)

        print(json.dumps(sorted(tables)))

        cursor.close()
        conn.close()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
