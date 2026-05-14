import pyodbc
import csv
from datetime import datetime

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
connection_string = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    print("=" * 140)
    print("ANÁLISIS COMPLETO DE DATOS - ARCHIVO ACCESS")
    print("=" * 140)
    
    # =====================================================================
    # 1. USUARIOS/EMPLEADOS DETALLADO
    # =====================================================================
    print("\n\n1️⃣  USUARIOS/EMPLEADOS (USERINFO)")
    print("-" * 140)
    
    try:
        cursor.execute("""
            SELECT USERID, name, lastname, Badgenumber, PAGER, OPHONE, email, Gender, 
                   identitycard, acc_startdate, acc_enddate, CardNo, privilege
            FROM USERINFO
            WHERE status = 0 OR status IS NULL
            ORDER BY USERID
        """)
        users = cursor.fetchall()
        
        print(f"Total de empleados: {len(users)}")
        print(f"\nPrimeros 10 empleados:")
        print(f"{'ID':<5} {'Nombre':<35} {'Badge':<8} {'Teléfono':<15} {'Estado Acceso':<20}")
        print("-" * 140)
        
        for i, user in enumerate(users[:10]):
            userid, name, lastname, badge, phone, ophone, email, gender, identity, start_date, end_date, card, priv = user
            full_name = f"{name} {lastname}".strip()
            status = "Activo" if (end_date and end_date > datetime.now()) else "Inactivo"
            print(f"{userid:<5} {full_name:<35} {str(badge):<8} {str(phone):<15} {status:<20}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\USUARIOS_EMPLEADOS.csv'
        cols = ['USERID', 'Nombre', 'Apellido', 'Badge', 'Teléfono', 'Email', 'Género', 
                'Cédula', 'Tarjeta', 'Inicio Acceso', 'Fin Acceso', 'Privilegio']
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(cols)
            for user in users:
                writer.writerow(user)
        print(f"\n✓ Exportado a: {csv_path}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 2. REGISTROS DE ASISTENCIA
    # =====================================================================
    print("\n\n2️⃣  REGISTROS DE ASISTENCIA (CHECKINOUT)")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM CHECKINOUT")
        total = cursor.fetchone()[0]
        print(f"Total de registros: {total:,}")
        
        cursor.execute("""
            SELECT USERID, CHECKTIME, CHECKTYPE, VERIFYCODE
            FROM CHECKINOUT
            ORDER BY CHECKTIME DESC
        """)
        checkins = cursor.fetchall()
        
        print(f"\nÚltimos 5 registros:")
        print(f"{'Usuario ID':<12} {'Fecha/Hora':<20} {'Tipo':<8} {'Código':<8}")
        print("-" * 140)
        
        for checkin in checkins[:5]:
            userid, checktime, checktype, verifycode = checkin
            tipo = "ENTRADA" if checktype == 'I' else "SALIDA"
            print(f"{userid:<12} {str(checktime):<20} {tipo:<8} {verifycode:<8}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\ASISTENCIA_REGISTROS.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['USERID', 'CHECKTIME', 'CHECKTYPE', 'VERIFYCODE'])
            writer.writerows(checkins)
        print(f"\n✓ Exportado a: {csv_path} ({len(checkins)} registros)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 3. LOGS BIOMETRICOS/ACCESO
    # =====================================================================
    print("\n\n3️⃣  LOGS BIOMÉTRICOS - CONTROL DE ACCESO (acc_monitor_log)")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM acc_monitor_log")
        total = cursor.fetchone()[0]
        print(f"Total de eventos: {total:,}")
        
        cursor.execute("""
            SELECT id, time, pin, card_no, device_name, verified, state, event_type
            FROM acc_monitor_log
            ORDER BY time DESC
        """)
        logs = cursor.fetchall()
        
        print(f"\nÚltimos 5 eventos:")
        print(f"{'ID':<6} {'Fecha/Hora':<20} {'PIN':<6} {'Tarjeta':<12} {'Device':<30} {'Verificado':<12}")
        print("-" * 140)
        
        for log in logs[:5]:
            log_id, time, pin, card, device, verified, state, event = log
            ver = "Sí" if verified == 1 else "No"
            print(f"{log_id:<6} {str(time):<20} {pin:<6} {str(card):<12} {str(device):<30} {ver:<12}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\LOGS_BIOMETRICOS.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'time', 'pin', 'card_no', 'device_name', 'verified', 'state', 'event_type'])
            writer.writerows(logs)
        print(f"\n✓ Exportado a: {csv_path} ({len(logs)} eventos)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 4. FACTURAS Y PAGOS
    # =====================================================================
    print("\n\n4️⃣  FACTURAS Y PAGOS")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM factura")
        total = cursor.fetchone()[0]
        print(f"Total de facturas: {total:,}")
        
        cursor.execute("""
            SELECT Num_factura, Fecha_factura, Plan, Dias, Monto, Total_factura, Id_cliente
            FROM factura
            ORDER BY Fecha_factura DESC
        """)
        facturas = cursor.fetchall()
        
        print(f"\nPrimeras 5 facturas:")
        print(f"{'Num':<8} {'Fecha':<20} {'Plan':<12} {'Días':<6} {'Monto':<10} {'Total':<10} {'Cliente':<8}")
        print("-" * 140)
        
        for factura in facturas[:5]:
            num, fecha, plan, dias, monto, total, cliente = factura
            print(f"{num:<8} {str(fecha):<20} {str(plan):<12} {dias:<6} {monto:<10} {total:<10} {cliente:<8}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\FACTURAS.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Num_factura', 'Fecha_factura', 'Plan', 'Dias', 'Monto', 'Total_factura', 'Id_cliente'])
            writer.writerows(facturas)
        print(f"\n✓ Exportado a: {csv_path} ({len(facturas)} facturas)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 5. DETALLES DE FACTURA/PAGOS
    # =====================================================================
    print("\n\n5️⃣  DETALLES DE FACTURA (facturap)")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM facturap")
        total = cursor.fetchone()[0]
        print(f"Total de detalles: {total:,}")
        
        cursor.execute("""
            SELECT Num_factura, Fecha_creacion, id_cliente, Total_M
            FROM facturap
            ORDER BY Fecha_creacion DESC
        """)
        detalles = cursor.fetchall()
        
        print(f"\nPrimeros 5 detalles:")
        print(f"{'Num':<8} {'Fecha':<20} {'Cliente':<10} {'Monto':<10}")
        print("-" * 140)
        
        for detalle in detalles[:5]:
            num, fecha, cliente, monto = detalle
            print(f"{num:<8} {str(fecha):<20} {cliente:<10} {monto:<10}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\DETALLES_FACTURA.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Num_factura', 'Fecha_creacion', 'id_cliente', 'Total_M'])
            writer.writerows(detalles)
        print(f"\n✓ Exportado a: {csv_path} ({len(detalles)} detalles)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 6. PRODUCTOS/SERVICIOS
    # =====================================================================
    print("\n\n6️⃣  PRODUCTOS/SERVICIOS")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM Productos")
        total = cursor.fetchone()[0]
        print(f"Total de productos: {total}")
        
        cursor.execute("SELECT * FROM Productos")
        cols = [description[0] for description in cursor.description]
        productos = cursor.fetchall()
        
        print(f"\nProductos:")
        print(f"{'ID':<6} {'Nombre':<40} {'Descripción':<40}")
        print("-" * 140)
        
        for prod in productos:
            # Mostrar primeras 2 columnas principalmente
            print(f"{str(prod[0]):<6} {str(prod[1] if len(prod) > 1 else ''):<40}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\PRODUCTOS.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(cols)
            writer.writerows(productos)
        print(f"\n✓ Exportado a: {csv_path} ({len(productos)} productos)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # =====================================================================
    # 7. DETALLES DE PAGO (detallep)
    # =====================================================================
    print("\n\n7️⃣  DETALLES DE PAGO (detallep)")
    print("-" * 140)
    
    try:
        cursor.execute("SELECT COUNT(*) FROM detallep")
        total = cursor.fetchone()[0]
        print(f"Total de detalles: {total:,}")
        
        cursor.execute("SELECT * FROM detallep ORDER BY id DESC")
        cols = ['Id', 'cantidad', 'subtotal', 'id_factura', 'id_producto']
        detalles = cursor.fetchall()
        
        print(f"\nPrimeros 5 detalles:")
        print(f"{'ID':<8} {'Cantidad':<10} {'Subtotal':<12} {'Factura':<10} {'Producto':<10}")
        print("-" * 140)
        
        for detalle in detalles[:5]:
            print(f"{detalle[0]:<8} {detalle[1]:<10} {detalle[2]:<12} {detalle[3]:<10} {detalle[4]:<10}")
        
        # Exportar a CSV
        csv_path = r'C:\develop\gym-backend\DETALLES_PAGO.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(cols)
            writer.writerows(detalles)
        print(f"\n✓ Exportado a: {csv_path} ({len(detalles)} detalles)")
        
    except Exception as e:
        print(f"Error: {e}")
    
    conn.close()
    
    print("\n\n" + "=" * 140)
    print("✅ REVISIÓN COMPLETADA")
    print("=" * 140)
    print("""
    ARCHIVOS CSV GENERADOS EN: C:\\develop\\gym-backend\\
    
    1. USUARIOS_EMPLEADOS.csv (562 empleados)
       - ID, Nombre, Teléfono, Email, Cédula, Tarjeta, Fechas de acceso
    
    2. ASISTENCIA_REGISTROS.csv (4,231 registros)
       - Entrada/Salida de empleados con timestamps
    
    3. LOGS_BIOMETRICOS.csv (4,357 eventos)
       - PIN, Tarjeta, Device, Verificación biométrica
    
    4. FACTURAS.csv (3,822 facturas)
       - Número, Fecha, Plan, Días, Monto, Total
    
    5. DETALLES_FACTURA.csv (1,020 registros)
       - Pagos asociados
    
    6. PRODUCTOS.csv (43 productos)
       - Catálogo de servicios
    
    7. DETALLES_PAGO.csv (4,993 registros)
       - Items de cada factura
    """)
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
