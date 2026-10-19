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


def clean_digits(val):
    if not val:
        return ""
    return "".join(c for c in str(val) if c.isdigit())


def clean_str(val):
    if not val:
        return ""
    return str(val).strip().lower()


def find_access_user(cursor, badge_number=None, access_user_id=None, legacy_badge_number=None, name=None, lastname=None, phone=None, document_id=None, email=None):
    # 1. Buscar por access_user_id (USERID directo)
    if access_user_id is not None:
        try:
            uid = int(access_user_id)
            cursor.execute("SELECT USERID, Badgenumber FROM USERINFO WHERE USERID = ?", (uid,))
            row = cursor.fetchone()
            if row:
                return (row[0], row[1])
        except (ValueError, TypeError):
            pass

    # 2. Buscar por Email real (si no está vacío y no es dummy @gym.local)
    if email and '@' in email and not str(email).strip().lower().endswith('@gym.local'):
        clean_email = str(email).strip().lower()
        cursor.execute("SELECT USERID, Badgenumber FROM USERINFO WHERE LCASE(email) = ?", (clean_email,))
        row = cursor.fetchone()
        if row:
            return (row[0], row[1])

    # 3. Buscar por Badgenumber exacto
    if badge_number:
        str_badge = str(badge_number).strip()
        cursor.execute("SELECT USERID, Badgenumber FROM USERINFO WHERE Badgenumber = ?", (str_badge,))
        row = cursor.fetchone()
        if row:
            return (row[0], row[1])

    # 4. Buscar por legacy_badge_number o formato MEM_000xxx
    if legacy_badge_number:
        cursor.execute("SELECT USERID, Badgenumber FROM USERINFO WHERE Badgenumber = ?", (str(legacy_badge_number).strip(),))
        row = cursor.fetchone()
        if row:
            return (row[0], row[1])

    if badge_number:
        digits_only = clean_digits(badge_number)
        if digits_only:
            legacy_code = f"MEM_{digits_only.zfill(6)}"
            cursor.execute("SELECT USERID, Badgenumber FROM USERINFO WHERE Badgenumber = ?", (legacy_code,))
            row = cursor.fetchone()
            if row:
                return (row[0], row[1])

    # 5. Buscar por Cédula / Documento (identitycard)
    clean_doc = clean_digits(document_id)
    if len(clean_doc) >= 6:
        cursor.execute("SELECT USERID, Badgenumber, identitycard FROM USERINFO WHERE identitycard IS NOT NULL")
        for r in cursor.fetchall():
            stored_doc = clean_digits(r[2])
            if stored_doc and stored_doc == clean_doc:
                return (r[0], r[1])

    # 6. Buscar por Teléfono (PAGER)
    clean_ph = clean_digits(phone)
    if len(clean_ph) >= 7:
        cursor.execute("SELECT USERID, Badgenumber, PAGER FROM USERINFO WHERE PAGER IS NOT NULL")
        for r in cursor.fetchall():
            stored_ph = clean_digits(r[2])
            if stored_ph and (clean_ph in stored_ph or stored_ph in clean_ph):
                return (r[0], r[1])

    # 7. Buscar por Nombre y Apellido exactos (ignorando espacios extras y mayúsculas/minúsculas)
    c_name = clean_str(name)
    c_last = clean_str(lastname)
    if c_name and c_last:
        cursor.execute("SELECT USERID, Badgenumber, name, lastname FROM USERINFO WHERE name IS NOT NULL AND lastname IS NOT NULL")
        for r in cursor.fetchall():
            db_name = clean_str(r[2])
            db_last = clean_str(r[3])
            if db_name == c_name and db_last == c_last:
                return (r[0], r[1])

    # 8. Fallback: Buscar por Badgenumber normalizado/rellenado asegurando coincidencia o sin conflicto
    if badge_number:
        str_badge = str(badge_number).strip()
        if str_badge.isdigit():
            normalized = str(int(str_badge))
            padded = str_badge.zfill(6)
            candidates = [c for c in [normalized, padded] if c != str_badge]
            for cand in candidates:
                cursor.execute("SELECT USERID, Badgenumber, name, lastname FROM USERINFO WHERE Badgenumber = ?", (cand,))
                row = cursor.fetchone()
                if row:
                    # Validar que si tiene nombre no pertenezca a otra persona diferente
                    row_name = clean_str(row[2])
                    row_last = clean_str(row[3])
                    if c_name and row_name and c_name not in row_name and row_name not in c_name:
                        # Pertenece a otra persona distinta, no sobreescribir
                        continue
                    return (row[0], row[1])

    return (None, None)


def get_next_available_badge(cursor):
    # Buscar el último Badgenumber asignado secuencialmente en Access (< 900 para excluir cédulas/códigos especiales)
    cursor.execute("SELECT TOP 1 Badgenumber FROM USERINFO WHERE VAL(Badgenumber) > 0 AND VAL(Badgenumber) < 900 ORDER BY USERID DESC")
    row = cursor.fetchone()
    last_badge = 0
    if row and row[0]:
        try:
            last_badge = int(str(row[0]).strip())
        except (ValueError, TypeError):
            last_badge = 0

    if last_badge == 0:
        cursor.execute("SELECT MAX(VAL(Badgenumber)) FROM USERINFO WHERE VAL(Badgenumber) < 900")
        max_badge_row = cursor.fetchone()
        last_badge = int(max_badge_row[0]) if (max_badge_row and max_badge_row[0]) else 1

    next_num = last_badge + 1
    # Asegurar que el Badgenumber no esté ocupado
    while True:
        cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (str(next_num),))
        if not cursor.fetchone():
            break
        next_num += 1

    return str(next_num)


def write_user(conn, user_data):
    cursor = conn.cursor()
    try:
        action_type = user_data.get('action', 'upsert')
        badge_number = str(user_data.get('Badgenumber', '') or '').strip()

        first_name = (user_data.get('name', '') or '').strip()
        last_name = (user_data.get('lastname', '') or '').strip()
        email = (user_data.get('email', '') or '').strip()
        phone = (user_data.get('phone') or user_data.get('PAGER') or '').strip()
        document_id = (user_data.get('documentId') or user_data.get('identitycard') or '').strip()

        # Date fields
        start_date_str = user_data.get('acc_startdate')
        end_date_str = user_data.get('acc_enddate')
        access_user_id = user_data.get('USERID') or user_data.get('userId')
        legacy_badge_number = user_data.get('legacyBadgenumber')

        acc_startdate = None
        acc_enddate = None
        if start_date_str:
            acc_startdate = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
        if end_date_str:
            acc_enddate = datetime.strptime(end_date_str[:10], "%Y-%m-%d")

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        old_block_date = datetime(2000, 1, 1)

        if acc_enddate is None:
            acc_enddate = old_block_date

        if acc_startdate is None:
            acc_startdate = old_block_date if acc_enddate < today else today

        set_valid_time = 1

        # Buscar usuario existente por ID, Email, Badge, Cédula, Teléfono o Nombre+Apellido
        user_id, existing_badge = find_access_user(
            cursor,
            badge_number=badge_number,
            access_user_id=access_user_id,
            legacy_badge_number=legacy_badge_number,
            name=first_name,
            lastname=last_name,
            phone=phone,
            document_id=document_id,
            email=email,
        )

        if action_type == 'delete':
            if user_id is not None:
                cursor.execute("DELETE FROM USERINFO WHERE USERID = ?", (user_id,))
                action = "deleted"
            else:
                action = "not_found"
            conn.commit()
            return {"success": True, "action": action, "USERID": user_id, "badgeNumber": badge_number}

        # UPSERT
        if user_id is not None:
            # Usuario existente encontrado -> ACTUALIZAR sin duplicar
            # Si el usuario ya tiene un Badgenumber válido, conservarlo si no se envió uno nuevo explícito
            final_badge = badge_number or (str(existing_badge).strip() if existing_badge else str(user_id))

            # Seguridad: Verificar que final_badge no pertenezca a OTRO usuario en Access
            if final_badge:
                cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ? AND USERID <> ?", (final_badge, user_id))
                conflict_row = cursor.fetchone()
                if conflict_row:
                    # El Badgenumber solicitado pertenece a otra persona en Access.
                    # Conservar el badge existente de este usuario para no duplicar ni causar colisión.
                    final_badge = str(existing_badge).strip() if existing_badge else str(user_id)

            update_query = """
                UPDATE USERINFO 
                SET Badgenumber = ?, name = ?, lastname = ?, email = ?, 
                    PAGER = ?, identitycard = ?, acc_startdate = ?, acc_enddate = ?, set_valid_time = ?
                WHERE USERID = ?
            """
            cursor.execute(
                update_query,
                (final_badge, first_name, last_name, email, phone or None, document_id or None, acc_startdate, acc_enddate, set_valid_time, user_id),
            )
            action = "updated"
            final_user_id = user_id
        else:
            # Usuario nuevo -> INSERTAR
            # Si no vino badge_number o ya está en uso por otro, asignar el siguiente consecutivo de Access
            if not badge_number:
                badge_number = get_next_available_badge(cursor)
            else:
                cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (badge_number,))
                if cursor.fetchone():
                    badge_number = get_next_available_badge(cursor)

            final_badge = badge_number

            insert_query = """
                INSERT INTO USERINFO (Badgenumber, name, lastname, email, PAGER, identitycard, acc_startdate, acc_enddate, set_valid_time, AccGroup, privilege, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)
            """
            cursor.execute(
                insert_query,
                (final_badge, first_name, last_name, email, phone or None, document_id or None, acc_startdate, acc_enddate, set_valid_time),
            )

            # Obtener el USERID asignado por Access (AutoNumber)
            try:
                cursor.execute("SELECT @@IDENTITY")
                row_id = cursor.fetchone()
                final_user_id = row_id[0] if (row_id and row_id[0]) else None
            except Exception:
                cursor.execute("SELECT USERID FROM USERINFO WHERE Badgenumber = ?", (final_badge,))
                row_id = cursor.fetchone()
                final_user_id = row_id[0] if (row_id and row_id[0]) else None

            action = "inserted"

        conn.commit()
        return {
            "success": True,
            "action": action,
            "badgeNumber": final_badge,
            "USERID": final_user_id,
        }

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
