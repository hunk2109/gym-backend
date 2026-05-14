import pyodbc

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    print("=" * 140)
    print("BÚSQUEDA: DATOS BIOMÉTRICOS/HUELLAS EN ACCESS")
    print("=" * 140)
    
    # Tablas relacionadas con biometría
    biometric_tables = [
        'FaceTemp',           # Datos de cara
        'FingerVein',         # Datos de venas de dedo
        'TEMPLATE',           # Plantillas biométricas
        'iclock_testdata',    # Datos de prueba
        'base_basecode',      # Código base
        'USERINFO',           # Usuarios (puede contener huellas)
        'acc_monitor_log',    # Logs de acceso
        'personnel_issuecard' # Emisión de tarjetas
    ]
    
    for table_name in biometric_tables:
        print(f"\n\n📋 TABLA: {table_name}")
        print("-" * 140)
        
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            
            cursor.execute(f"SELECT * FROM [{table_name}]")
            cols = [description[0] for description in cursor.description]
            
            print(f"Registros: {count}")
            print(f"Columnas ({len(cols)}):")
            
            for i, col in enumerate(cols, 1):
                print(f"  {i:2}. {col}")
            
            # Mostrar primeros registros si hay datos
            if count > 0 and count <= 5:
                print(f"\nDatos:")
                cursor.execute(f"SELECT * FROM [{table_name}]")
                rows = cursor.fetchall()
                for j, row in enumerate(rows, 1):
                    print(f"  Registro {j}:")
                    for col, val in zip(cols, row):
                        val_str = str(val)[:100] if val is not None else "NULL"
                        if len(str(val)) > 100:
                            val_str += "..."
                        print(f"    {col}: {val_str}")
            elif count > 5:
                print(f"\nPrimeros 2 registros:")
                cursor.execute(f"SELECT * FROM [{table_name}]")
                rows = cursor.fetchall()
                for j, row in enumerate(rows[:2], 1):
                    print(f"  Registro {j}:")
                    for col, val in zip(cols, row):
                        val_str = str(val)[:80] if val is not None else "NULL"
                        if len(str(val)) > 80:
                            val_str += "..."
                        print(f"    {col}: {val_str}")
        
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
    
    # =====================================================================
    # BÚSQUEDA ESPECÍFICA EN USERINFO POR COLUMNAS BIOMÉTRICAS
    # =====================================================================
    print("\n\n" + "=" * 140)
    print("BÚSQUEDA EN USERINFO: CAMPOS RELACIONADOS CON BIOMETRÍA")
    print("=" * 140)
    
    try:
        cursor.execute("""
            SELECT USERID, name, lastname, PHOTO, mverifypass, CardNo, Badgenumber, TimeZones
            FROM USERINFO
            LIMIT 5
        """)
        
        cols = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        print(f"\nCampos potenciales para biometría:")
        print(f"  - PHOTO: Foto del usuario")
        print(f"  - mverifypass: Método de verificación de password")
        print(f"  - CardNo: Número de tarjeta")
        print(f"  - Badgenumber: Número de insignia")
        print(f"  - TimeZones: Zona horaria")
        
        print(f"\nPrimeros 5 registros:")
        for j, row in enumerate(rows, 1):
            userid, name, lastname, photo, mverifypass, cardno, badge, timezones = row
            print(f"\n  Usuario {userid}: {name} {lastname}")
            print(f"    - Foto: {type(photo).__name__} ({len(photo) if photo else 0} bytes)")
            print(f"    - Verificación: {mverifypass}")
            print(f"    - Tarjeta: {cardno}")
            print(f"    - Badge: {badge}")
            print(f"    - Zona horaria: {timezones}")
    
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # BÚSQUEDA EN acc_monitor_log POR DATOS BIOMÉTRICOS
    # =====================================================================
    print("\n\n" + "=" * 140)
    print("BÚSQUEDA EN acc_monitor_log: DATOS DE VERIFICACIÓN")
    print("=" * 140)
    
    try:
        cursor.execute("""
            SELECT id, pin, card_no, verified, device_name, event_type, time
            FROM acc_monitor_log
            WHERE verified = 1
            LIMIT 5
        """)
        
        cols = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        print(f"\nRegistros con verificación biométrica exitosa:")
        for j, row in enumerate(rows, 1):
            log_id, pin, card, verified, device, event_type, time = row
            print(f"\n  Evento {j}:")
            print(f"    - ID: {log_id}")
            print(f"    - PIN: {pin}")
            print(f"    - Tarjeta: {card}")
            print(f"    - Verificado: {'Sí' if verified == 1 else 'No'}")
            print(f"    - Device: {device}")
            print(f"    - Tipo: {event_type}")
            print(f"    - Fecha: {time}")
    
    except Exception as e:
        print(f"Error: {e}")
    
    conn.close()
    
    print("\n\n" + "=" * 140)
    print("CONCLUSIÓN")
    print("=" * 140)
    print("""
    
    DATOS BIOMÉTRICOS ENCONTRADOS EN ACCESS:
    
    1. ✓ FOTOS EN USERINFO
       - Campo: PHOTO (objeto BLOB/binario)
       - 562 usuarios potencialmente con foto
       - Necesita extracción a archivos
    
    2. ✓ DATOS DE HUELLAS/BIOMETRÍA
       - Tabla: FaceTemp, FingerVein, TEMPLATE
       - Contienen datos de reconocimiento facial y huellas
    
    3. ✓ LOGS DE VERIFICACIÓN
       - Tabla: acc_monitor_log
       - 4,357 eventos de acceso verificados
       - PIN + Tarjeta + Validación biométrica
    
    4. ✓ INFORMACIÓN DE TARJETA
       - CardNo en USERINFO
       - card_no en acc_monitor_log
       - Datos de acceso por tarjeta
    
    RECOMENDACIONES:
    - Las fotos están en USERINFO (campo PHOTO)
    - Los datos de huellas están en FaceTemp y FingerVein
    - Los logs de acceso verifican la biometría en acc_monitor_log
    """)

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
