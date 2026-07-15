import pyodbc
import sys
import json
import os
import urllib.parse
from datetime import datetime

def connect_access(db_path):
    try:
        conn = pyodbc.connect(f'Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};')
        return conn
    except Exception as e:
        sys.stderr.write(f"Error connecting to Access: {e}\n")
        sys.exit(1)

def write_user(conn, user_data):
    cursor = conn.cursor()
    try:
        # Extract fields from JSON
        # we expect Badgenumber as the unique string identifier mapping to memberCode or ID
        badge_number = str(user_data.get('Badgenumber', ''))
        if not badge_number:
            raise ValueError("Badgenumber is required")
            
        first_name = user_data.get('name', '')
        last_name = user_data.get('lastname', '')
        email = user_data.get('email', '')
        
        # Date fields
        end_date_str = user_data.get('acc_enddate')
        
        # Convert date string if provided
        acc_enddate = None
        if end_date_str:
            acc_enddate = datetime.strptime(end_date_str[:10], "%Y-%m-%d")
            
        # set_valid_time = 1 if end_date is provided, else 0
        set_valid_time = 1 if acc_enddate else 0
        
        # Check if user exists based on Badgenumber
        cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (badge_number,))
        row = cursor.fetchone()
        
        if row:
            user_id = row[0]
            # Update existing user
            update_query = """
                UPDATE USERINFO 
                SET name = ?, lastname = ?, email = ?, 
                    acc_enddate = ?, set_valid_time = ?
                WHERE USERID = ?
            """
            cursor.execute(update_query, (first_name, last_name, email, acc_enddate, set_valid_time, user_id))
            action = "updated"
        else:
            # Insert new user. ZKAccess USERINFO usually needs a new unique USERID (it's often an autonumber, 
            # but sometimes pyodbc has issues with it. We'll rely on Access autonumbering if it's set up that way).
            # Usually we don't insert USERID explicitly if it's AutoNumber.
            
            insert_query = """
                INSERT INTO USERINFO (Badgenumber, name, lastname, email, acc_enddate, set_valid_time, AccGroup, privilege, status)
                VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0)
            """
            cursor.execute(insert_query, (badge_number, first_name, last_name, email, acc_enddate, set_valid_time))
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
        
    db_path = sys.argv[1]
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
