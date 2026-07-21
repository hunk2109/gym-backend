import pyodbc
import sys
import json
import os
import urllib.parse
from datetime import datetime

from access_common import build_access_connection_string, resolve_access_db_path


def connect_access(db_path):
    try:
        conn = pyodbc.connect(build_access_connection_string(db_path))
        return conn
    except Exception as e:
        sys.stderr.write(f"Error connecting to Access: {e}\n")
        sys.exit(1)


def find_access_userid(cursor, badge_number, access_user_id=None, legacy_badge_number=None):
    cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (badge_number,))
    row = cursor.fetchone()
    if row:
        return row[0]

    if legacy_badge_number:
        cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (legacy_badge_number,))
        row = cursor.fetchone()
        if row:
            return row[0]

    if badge_number.isdigit():
        normalized = str(int(badge_number))
        if normalized != badge_number:
            cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (normalized,))
            row = cursor.fetchone()
            if row:
                return row[0]

        padded = badge_number.zfill(6)
        if padded != badge_number:
            cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (padded,))
            row = cursor.fetchone()
            if row:
                return row[0]

    if access_user_id is not None:
        cursor.execute("SELECT USERID FROM USERINFO WHERE USERID = ?", (access_user_id,))
        row_by_userid = cursor.fetchone()
        if row_by_userid:
            return row_by_userid[0]

    return None


def write_user(conn, user_data):
    cursor = conn.cursor()
    try:
        # Extract fields from JSON
        # we expect Badgenumber as the unique string identifier mapping to memberCode or ID
        action_type = user_data.get('action', 'upsert')
        badge_number = str(user_data.get('Badgenumber', '') or '')

        if action_type != 'delete' and not badge_number:
            raise ValueError("Badgenumber is required")
            
        first_name = user_data.get('name', '')
        last_name = user_data.get('lastname', '')
        email = user_data.get('email', '')

        # Date fields
        start_date_str = user_data.get('acc_startdate')
        end_date_str = user_data.get('acc_enddate')
        access_user_id = user_data.get('USERID') or user_data.get('userId')
        legacy_badge_number = user_data.get('legacyBadgenumber')
        
        # Convert date strings if provided
        acc_startdate = None
        acc_enddate = None
        if start_date_str:
            acc_startdate = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
        if end_date_str:
            acc_enddate = datetime.strptime(end_date_str[:10], "%Y-%m-%d")

        if access_user_id is not None:
            try:
                access_user_id = int(access_user_id)
            except (ValueError, TypeError):
                access_user_id = None
            
        # set_valid_time = 1 if end_date is provided, else 0
        set_valid_time = 1 if acc_enddate else 0

        user_id = find_access_userid(cursor, badge_number, access_user_id, legacy_badge_number)
        
        if action_type == 'delete':
            if user_id is not None:
                cursor.execute("DELETE FROM USERINFO WHERE USERID = ?", (user_id,))
                action = "deleted"
            else:
                action = "not_found"
        else:
            if user_id is not None:
                # Update existing user
                update_query = """
                    UPDATE USERINFO 
                    SET Badgenumber = ?, name = ?, lastname = ?, email = ?, 
                        acc_startdate = ?, acc_enddate = ?, set_valid_time = ?
                    WHERE USERID = ?
                """
                cursor.execute(update_query, (badge_number, first_name, last_name, email, acc_startdate, acc_enddate, set_valid_time, user_id))
                action = "updated"
            else:
                if access_user_id is not None:
                    insert_query = """
                        INSERT INTO USERINFO (USERID, Badgenumber, name, lastname, email, acc_startdate, acc_enddate, set_valid_time, AccGroup, privilege, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)
                    """
                    cursor.execute(insert_query, (access_user_id, badge_number, first_name, last_name, email, acc_startdate, acc_enddate, set_valid_time))
                else:
                    insert_query = """
                        INSERT INTO USERINFO (Badgenumber, name, lastname, email, acc_startdate, acc_enddate, set_valid_time, AccGroup, privilege, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0)
                    """
                    cursor.execute(insert_query, (badge_number, first_name, last_name, email, acc_startdate, acc_enddate, set_valid_time))
                action = "inserted"
            
        conn.commit()
        return {"success": True, "action": action, "badgeNumber": badge_number}
        
    except Exception as e:
        conn.rollback()
        sys.stderr.write(f"Error writing user: {e}\n")
        raise e
    finally:
        cursor.close()

def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python access-write.py <access_db_path> <json_data_or_->\n")
        sys.exit(1)
        
    db_path = resolve_access_db_path(sys.argv[1], default_path=None, cwd=None)
    json_data_str = sys.argv[2]
    
    if json_data_str == '-':
        json_data_str = sys.stdin.read()
    else:
        json_data_str = urllib.parse.unquote(json_data_str)
    
    if not os.path.exists(db_path):
        sys.stderr.write(f"Database not found: {db_path}\n")
        sys.exit(1)
        
    try:
        user_data = json.loads(json_data_str)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Invalid JSON data: {e}\n")
        sys.exit(1)
        
    conn = connect_access(db_path)
    
    try:
        result = write_user(conn, user_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
