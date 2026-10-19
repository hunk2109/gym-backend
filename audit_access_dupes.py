import pyodbc, sys
sys.path.insert(0, 'src/modules/sync/scripts')
from access_common import build_access_connection_string

conn = pyodbc.connect(build_access_connection_string(r'C:\Users\htaveras\Downloads\dowtown.mdb'))
cur = conn.cursor()
cur.execute("SELECT Badgenumber, COUNT(*) as c FROM USERINFO WHERE Badgenumber IS NOT NULL GROUP BY Badgenumber HAVING COUNT(*) > 1")
rows = cur.fetchall()
print(f"Total duplicate Badgenumbers in Access: {len(rows)}")
for r in rows:
    badge = r[0]
    count = r[1]
    cur.execute("SELECT USERID, Badgenumber, name, lastname, email, PAGER, acc_startdate, acc_enddate FROM USERINFO WHERE Badgenumber = ?", (badge,))
    dupes = cur.fetchall()
    print(f"\n--- Badge: {badge} (Count: {count}) ---")
    for d in dupes:
        print("  ", d)
