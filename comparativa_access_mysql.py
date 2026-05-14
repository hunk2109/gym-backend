import pyodbc
import mysql.connector
from datetime import datetime

# Conectar a Access
mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
access_conn_str = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

# Conectar a MySQL
mysql_config = {
    'host': 'localhost',
    'user': 'hunk2109',
    'password': 'muerete66',
    'database': 'gym_manager'
}

try:
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    mysql_conn = mysql.connector.connect(**mysql_config)
    mysql_cursor = mysql_conn.cursor()
    
    print("=" * 150)
    print("COMPARATIVA: ACCESS vs MYSQL")
    print("=" * 150)
    
    # =====================================================================
    # 1. TABLA USERS - COMPARAR USUARIOS
    # =====================================================================
    print("\n\n1️⃣  USUARIOS - COMPARATIVA")
    print("-" * 150)
    
    # Obtener usuarios de Access
    access_cursor.execute("""
        SELECT USERID, name, lastname, PAGER, email
        FROM USERINFO
        WHERE status = 0 OR status IS NULL
    """)
    access_users = access_cursor.fetchall()
    
    # Obtener usuarios de MySQL
    mysql_cursor.execute("SELECT id, name, email, phone FROM users LIMIT 100")
    mysql_users = mysql_cursor.fetchall()
    
    print(f"\n📊 RESUMEN:")
    print(f"   Access: {len(access_users)} usuarios")
    print(f"   MySQL:  {len(mysql_users)} usuarios")
    
    if len(mysql_users) == 0:
        print(f"\n   ⚠️  MySQL ESTÁ VACÍO - No hay usuarios")
    else:
        print(f"\n   Primeros usuarios en MySQL:")
        for user in mysql_users[:5]:
            print(f"      - {user[1]} ({user[2]}) - Tel: {user[3]}")
    
    print(f"\n   Primeros usuarios en Access:")
    for user in access_users[:5]:
        userid, name, lastname, phone, email = user
        full_name = f"{name} {lastname}".strip()
        print(f"      - {full_name} ({email}) - Tel: {phone}")
    
    # =====================================================================
    # 2. TABLA MEMBERS - MIEMBROS/CLIENTES
    # =====================================================================
    print("\n\n2️⃣  MIEMBROS/CLIENTES - COMPARATIVA")
    print("-" * 150)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM members")
    count_members = mysql_cursor.fetchone()[0]
    
    mysql_cursor.execute("SELECT id, name, phone, email FROM members LIMIT 10")
    mysql_members = mysql_cursor.fetchall()
    
    print(f"\n📊 RESUMEN:")
    print(f"   MySQL Members: {count_members} registros")
    
    if count_members == 0:
        print(f"\n   ⚠️  MySQL MEMBERS ESTÁ VACÍO")
    else:
        print(f"\n   Primeros miembros en MySQL:")
        for member in mysql_members:
            print(f"      - {member[1]} ({member[3]}) - Tel: {member[2]}")
    
    # =====================================================================
    # 3. TABLA ATTENDANCES - ASISTENCIA
    # =====================================================================
    print("\n\n3️⃣  ASISTENCIA - COMPARATIVA")
    print("-" * 150)
    
    # Access
    access_cursor.execute("SELECT COUNT(*) FROM CHECKINOUT")
    access_att_count = access_cursor.fetchone()[0]
    
    # MySQL
    mysql_cursor.execute("SELECT COUNT(*) FROM attendances")
    mysql_att_count = mysql_cursor.fetchone()[0]
    
    print(f"\n📊 RESUMEN:")
    print(f"   Access:  {access_att_count:,} registros de asistencia")
    print(f"   MySQL:   {mysql_att_count:,} registros de asistencia")
    
    if mysql_att_count > 0:
        mysql_cursor.execute("""
            SELECT user_id, check_in_time, type FROM attendances 
            ORDER BY check_in_time DESC LIMIT 5
        """)
        mysql_atts = mysql_cursor.fetchall()
        print(f"\n   Últimos registros en MySQL:")
        for att in mysql_atts:
            print(f"      - User {att[0]}: {att[1]} ({att[2]})")
    
    if access_att_count > 0:
        access_cursor.execute("""
            SELECT USERID, CHECKTIME, CHECKTYPE FROM CHECKINOUT 
            ORDER BY CHECKTIME DESC LIMIT 5
        """)
        access_atts = access_cursor.fetchall()
        print(f"\n   Últimos registros en Access:")
        for att in access_atts:
            tipo = "ENTRADA" if att[2] == 'I' else "SALIDA"
            print(f"      - User {att[0]}: {att[1]} ({tipo})")
    
    # =====================================================================
    # 4. TABLA MEMBERSHIPS - PLANES
    # =====================================================================
    print("\n\n4️⃣  MEMBERSHIPS/PLANES - COMPARATIVA")
    print("-" * 150)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM memberships")
    mysql_mem_count = mysql_cursor.fetchone()[0]
    
    mysql_cursor.execute("SELECT id, name, price_per_month FROM memberships LIMIT 10")
    mysql_memberships = mysql_cursor.fetchall()
    
    print(f"\n📊 RESUMEN:")
    print(f"   MySQL Memberships: {mysql_mem_count} registros")
    
    if mysql_mem_count == 0:
        print(f"\n   ⚠️  MySQL MEMBERSHIPS ESTÁ VACÍO")
    else:
        print(f"\n   Planes disponibles en MySQL:")
        for mem in mysql_memberships:
            print(f"      - {mem[1]}: RD$ {mem[2]}")
    
    # Access - Planes
    access_cursor.execute("""
        SELECT DISTINCT Plan, COUNT(*)
        FROM factura
        GROUP BY Plan
    """)
    access_plans = access_cursor.fetchall()
    
    print(f"\n   Planes en Access:")
    for plan in access_plans:
        print(f"      - {plan[0]}: {plan[1]} facturas")
    
    # =====================================================================
    # 5. TABLA PAYMENTS - PAGOS
    # =====================================================================
    print("\n\n5️⃣  PAYMENTS/PAGOS - COMPARATIVA")
    print("-" * 150)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM payments")
    mysql_pay_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM facturap")
    access_pay_count = access_cursor.fetchone()[0]
    
    print(f"\n📊 RESUMEN:")
    print(f"   Access:  {access_pay_count:,} registros de pago")
    print(f"   MySQL:   {mysql_pay_count:,} registros de pago")
    
    if mysql_pay_count > 0:
        mysql_cursor.execute("""
            SELECT id, member_id, amount, created_at FROM payments 
            ORDER BY created_at DESC LIMIT 3
        """)
        mysql_pays = mysql_cursor.fetchall()
        print(f"\n   Últimos pagos en MySQL:")
        for pay in mysql_pays:
            print(f"      - ID {pay[0]}: Member {pay[1]} - RD$ {pay[2]} ({pay[3]})")
    
    if access_pay_count > 0:
        access_cursor.execute("""
            SELECT TOP 3 Num_factura, id_cliente, Total_M, Fecha_creacion 
            FROM facturap ORDER BY Fecha_creacion DESC
        """)
        access_pays = access_cursor.fetchall()
        print(f"\n   Últimos pagos en Access:")
        for pay in access_pays:
            print(f"      - Factura {pay[0]}: Cliente {pay[1]} - RD$ {pay[2]} ({pay[3]})")
    
    # =====================================================================
    # 6. TABLA PRODUCTS - PRODUCTOS
    # =====================================================================
    print("\n\n6️⃣  PRODUCTS/PRODUCTOS - COMPARATIVA")
    print("-" * 150)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM products")
    mysql_prod_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM Productos")
    access_prod_count = access_cursor.fetchone()[0]
    
    print(f"\n📊 RESUMEN:")
    print(f"   Access:  {access_prod_count} productos")
    print(f"   MySQL:   {mysql_prod_count} productos")
    
    if mysql_prod_count > 0:
        mysql_cursor.execute("SELECT id, name, price FROM products LIMIT 5")
        mysql_prods = mysql_cursor.fetchall()
        print(f"\n   Primeros productos en MySQL:")
        for prod in mysql_prods:
            print(f"      - {prod[1]}: RD$ {prod[2]}")
    
    # =====================================================================
    # 7. RESUMEN GENERAL
    # =====================================================================
    print("\n\n" + "=" * 150)
    print("📋 RESUMEN GENERAL")
    print("=" * 150)
    
    summary = f"""
    
    USUARIOS/EMPLEADOS:
      Access:  {len(access_users):,} usuarios
      MySQL:   {len(mysql_users)} usuarios
      Estado:  {'✓ OK' if len(mysql_users) > 0 else '⚠️  VACÍO - Necesita importación'}
    
    MIEMBROS/CLIENTES:
      Access:  (Datos en table factura, ID clientes)
      MySQL:   {count_members:,} miembros
      Estado:  {'✓ OK' if count_members > 0 else '⚠️  VACÍO'}
    
    ASISTENCIA:
      Access:  {access_att_count:,} registros (CHECKINOUT)
      MySQL:   {mysql_att_count:,} registros (attendances)
      Estado:  {'✓ OK' if mysql_att_count > 0 else '⚠️  VACÍO - Necesita importación'}
    
    PLANES/MEMBERSHIPS:
      Access:  {len(access_plans)} planes diferentes
      MySQL:   {mysql_mem_count:,} planes
      Estado:  {'✓ OK' if mysql_mem_count > 0 else '⚠️  VACÍO'}
    
    PAGOS/FACTURAS:
      Access:  {access_pay_count:,} pagos (facturap)
      MySQL:   {mysql_pay_count:,} pagos (payments)
      Estado:  {'✓ OK' if mysql_pay_count > 0 else '⚠️  VACÍO'}
    
    PRODUCTOS:
      Access:  {access_prod_count} productos
      MySQL:   {mysql_prod_count} productos
      Estado:  {'✓ OK' if mysql_prod_count > 0 else '⚠️  VACÍO'}
    
    LOGS BIOMETRICOS:
      Access:  4,357 eventos de acceso (acc_monitor_log)
      MySQL:   (No hay tabla equivalente)
      Nota:    Datos exportados a LOGS_BIOMETRICOS.csv para referencia
    """
    
    print(summary)
    
    access_conn.close()
    mysql_conn.close()
    
    # Exportar resumen
    with open(r'C:\develop\gym-backend\COMPARATIVA_RESUMIDA.txt', 'w', encoding='utf-8') as f:
        f.write("COMPARATIVA: ACCESS vs MYSQL\n")
        f.write("=" * 150 + "\n")
        f.write(summary)
    
    print("\n✓ Resumen exportado a: C:\\develop\\gym-backend\\COMPARATIVA_RESUMIDA.txt")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
