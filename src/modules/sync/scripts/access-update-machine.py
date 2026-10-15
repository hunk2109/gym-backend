import pyodbc
import sys
import json
import os
import urllib.parse
from access_common import build_access_connection_string, resolve_access_db_path

def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python access-update-machine.py <access_db_path> <encoded_json>\n")
        sys.exit(1)

    db_path = resolve_access_db_path(sys.argv[1], default_path=None, cwd=None)
    data = json.loads(urllib.parse.unquote(sys.argv[2]))
    ip = str(data.get('ip', '')).strip()
    port = int(data.get('port', 4370))
    machine_id = data.get('machineId')

    if not ip:
        sys.stderr.write("IP is required\n")
        sys.exit(1)

    if not os.path.exists(db_path):
        sys.stderr.write(f"Database not found: {db_path}\n")
        sys.exit(1)

    conn = pyodbc.connect(build_access_connection_string(db_path))
    cursor = conn.cursor()
    try:
        # Check if table is Machines or machines
        tables = [row.table_name for row in cursor.tables(tableType='TABLE')]
        target_table = None
        for t in tables:
            if t.lower() in ('machines', 'machine'):
                target_table = t
                break

        if not target_table:
            target_table = 'Machines'

        if machine_id:
            cursor.execute(f"UPDATE [{target_table}] SET [IP] = ?, [Port] = ? WHERE [ID] = ?", (ip, port, machine_id))
        else:
            cursor.execute(f"UPDATE [{target_table}] SET [IP] = ?, [Port] = ?", (ip, port))

        conn.commit()
        print(json.dumps({"success": True, "rowsAffected": cursor.rowcount, "ip": ip, "port": port}))
    except Exception as e:
        conn.rollback()
        sys.stderr.write(f"Error updating machine in Access: {e}\n")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
