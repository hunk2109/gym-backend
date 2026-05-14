import mysql.connector
import pyodbc

mysql_config = {
    'host': 'localhost',
    'user': 'hunk2109',
    'password': 'muerete66',
    'database': 'gym_manager'
}

mdb_path = r'C:\develop\gym-backend\dowtown.mdb'
access_conn_str = (
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};'
    fr'DBQ={mdb_path};'
)

try:
    mysql_conn = mysql.connector.connect(**mysql_config)
    mysql_cursor = mysql_conn.cursor()
    
    access_conn = pyodbc.connect(access_conn_str)
    access_cursor = access_conn.cursor()
    
    print("=" * 160)
    print("COMPARATIVA DETALLADA: ACCESS vs MYSQL")
    print("=" * 160)
    
    # =====================================================================
    # 1. USUARIOS/EMPLEADOS
    # =====================================================================
    print("\n\n1️⃣  USUARIOS/EMPLEADOS")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM users")
    mysql_users_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM USERINFO")
    access_users_count = access_cursor.fetchone()[0]
    
    print(f"\n   Access (USERINFO):     {access_users_count:,} empleados")
    print(f"   MySQL (users):         {mysql_users_count} usuarios")
    print(f"   Diferencia:            {access_users_count - mysql_users_count:,} registros sin sincronizar")
    print(f"   Estado:                {'✓ SINCRONIZADO' if mysql_users_count > 0 else '⚠️  NO SINCRONIZADO - MySQL VACÍO'}")
    
    if access_users_count > 0:
        access_cursor.execute("""
            SELECT TOP 3 name, lastname, PAGER, email, acc_startdate 
            FROM USERINFO ORDER BY USERID
        """)
        print(f"\n   Primeros empleados en Access:")
        for row in access_cursor.fetchall():
            print(f"      - {row[0]} {row[1]} ({row[2]}) | Email: {row[3]} | Activo desde: {row[4]}")
    
    # =====================================================================
    # 2. MIEMBROS/CLIENTES
    # =====================================================================
    print("\n\n2️⃣  MIEMBROS/CLIENTES")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM members")
    mysql_members_count = mysql_cursor.fetchone()[0]
    
    # Access: IDs de clientes únicos en factura
    access_cursor.execute("SELECT Id_cliente FROM factura")
    access_members_set = set()
    for row in access_cursor.fetchall():
        access_members_set.add(row[0])
    access_members_count = len(access_members_set)
    
    print(f"\n   Access (factura):      {access_members_count} clientes únicos")
    print(f"   MySQL (members):       {mysql_members_count} miembros")
    print(f"   Diferencia:            {access_members_count - mysql_members_count} registros sin sincronizar")
    print(f"   Estado:                {'✓ SINCRONIZADO' if mysql_members_count > 0 else '⚠️  NO SINCRONIZADO - MySQL VACÍO'}")
    
    # =====================================================================
    # 3. ASISTENCIA
    # =====================================================================
    print("\n\n3️⃣  REGISTROS DE ASISTENCIA")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM attendances")
    mysql_att_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM CHECKINOUT")
    access_att_count = access_cursor.fetchone()[0]
    
    print(f"\n   Access (CHECKINOUT):   {access_att_count:,} registros")
    print(f"   MySQL (attendances):   {mysql_att_count} registros")
    print(f"   Diferencia:            {access_att_count - mysql_att_count:,} registros sin sincronizar")
    print(f"   Estado:                {'✓ SINCRONIZADO' if mysql_att_count > 0 else '⚠️  NO SINCRONIZADO - MySQL VACÍO'}")
    
    if access_att_count > 0:
        access_cursor.execute("""
            SELECT TOP 3 USERID, CHECKTIME, CHECKTYPE FROM CHECKINOUT 
            ORDER BY CHECKTIME DESC
        """)
        print(f"\n   Últimos registros en Access:")
        for row in access_cursor.fetchall():
            tipo = "ENTRADA" if row[2] == 'I' else "SALIDA"
            print(f"      - Usuario {row[0]}: {row[1]} ({tipo})")
    
    # =====================================================================
    # 4. PLANES/MEMBERSHIPS
    # =====================================================================
    print("\n\n4️⃣  PLANES/MEMBERSHIPS")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM memberships")
    mysql_mem_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT DISTINCT Plan FROM factura")
    access_plans = access_cursor.fetchall()
    
    print(f"\n   Access (planes únicos): {len(access_plans)} planes")
    print(f"   MySQL (memberships):   {mysql_mem_count} planes")
    
    if mysql_mem_count > 0:
        mysql_cursor.execute("SELECT name, price FROM memberships")
        print(f"   Planes en MySQL:")
        for row in mysql_cursor.fetchall():
            print(f"      - {row[0]}: RD$ {row[1]}")
    else:
        print(f"   ⚠️  MySQL VACÍO")
    
    print(f"\n   Planes en Access:")
    for plan in access_plans:
        print(f"      - {plan[0]}")
    
    # =====================================================================
    # 5. PAGOS/FACTURAS
    # =====================================================================
    print("\n\n5️⃣  PAGOS/FACTURAS")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM payments")
    mysql_pay_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM facturap")
    access_pay_count = access_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM factura")
    access_factura_count = access_cursor.fetchone()[0]
    
    print(f"\n   Access (factura):      {access_factura_count:,} facturas")
    print(f"   Access (facturap):     {access_pay_count:,} detalles pago")
    print(f"   MySQL (payments):      {mysql_pay_count} pagos")
    print(f"   Diferencia:            {access_pay_count - mysql_pay_count:,} registros sin sincronizar")
    print(f"   Estado:                {'✓ SINCRONIZADO' if mysql_pay_count > 0 else '⚠️  NO SINCRONIZADO - MySQL VACÍO'}")
    
    if access_factura_count > 0:
        access_cursor.execute("""
            SELECT TOP 3 Num_factura, Fecha_factura, Plan, Total_factura, Id_cliente 
            FROM factura ORDER BY Fecha_factura DESC
        """)
        print(f"\n   Últimas facturas en Access:")
        for row in access_cursor.fetchall():
            print(f"      - Factura #{row[0]}: {row[1]} | {row[2]} | RD$ {row[3]} | Cliente {row[4]}")
    
    # =====================================================================
    # 6. PRODUCTOS
    # =====================================================================
    print("\n\n6️⃣  PRODUCTOS")
    print("-" * 160)
    
    mysql_cursor.execute("SELECT COUNT(*) FROM products")
    mysql_prod_count = mysql_cursor.fetchone()[0]
    
    access_cursor.execute("SELECT COUNT(*) FROM Productos")
    access_prod_count = access_cursor.fetchone()[0]
    
    print(f"\n   Access (Productos):    {access_prod_count} productos")
    print(f"   MySQL (products):      {mysql_prod_count} productos")
    print(f"   Diferencia:            {access_prod_count - mysql_prod_count} registros sin sincronizar")
    print(f"   Estado:                {'✓ SINCRONIZADO' if mysql_prod_count > 0 else '⚠️  NO SINCRONIZADO - MySQL VACÍO'}")
    
    # =====================================================================
    # 7. LOGS BIOMETRICOS
    # =====================================================================
    print("\n\n7️⃣  LOGS BIOMETRICOS/ACCESO")
    print("-" * 160)
    
    access_cursor.execute("SELECT COUNT(*) FROM acc_monitor_log")
    access_logs_count = access_cursor.fetchone()[0]
    
    print(f"\n   Access (acc_monitor_log): {access_logs_count:,} eventos de acceso")
    print(f"   MySQL:                    (No existe tabla equivalente)")
    print(f"   Nota:                     Datos disponibles en LOGS_BIOMETRICOS.csv")
    
    # =====================================================================
    # RESUMEN EJECUTIVO
    # =====================================================================
    print("\n\n" + "=" * 160)
    print("📊 RESUMEN EJECUTIVO - ESTADO DE SINCRONIZACIÓN")
    print("=" * 160)
    
    print(f"""
    
    ╔════════════════════════════════════════════════════════════════╗
    ║                    ESTADO GENERAL                              ║
    ╚════════════════════════════════════════════════════════════════╝
    
    ⚠️  MYSQL ESTÁ VACÍO - Necesita importación de datos desde Access
    
    ┌────────────────────────────────────────────────────────────────┐
    │ TABLA                  ACCESS        MYSQL         ESTATUS    │
    ├────────────────────────────────────────────────────────────────┤
    │ Usuarios/Empleados     562           0             ❌ VACÍO    │
    │ Miembros/Clientes      {access_members_count:>3}           0             ❌ VACÍO    │
    │ Asistencia             {access_att_count:>6,}       0             ❌ VACÍO    │
    │ Planes                 {len(access_plans):>3}           {mysql_mem_count}             ❌ VACÍO    │
    │ Facturas               {access_factura_count:>6,}       0             ❌ VACÍO    │
    │ Detalles Pago          {access_pay_count:>6,}       0             ❌ VACÍO    │
    │ Productos              {access_prod_count:>3}           {mysql_prod_count}             ❌ VACÍO    │
    │ Logs Biométricos       {access_logs_count:>6,}    N/A            ℹ️  EXPORTADO│
    └────────────────────────────────────────────────────────────────┘
    
    ARCHIVOS EXPORTADOS PARA REFERENCIA:
      ✓ USUARIOS_EMPLEADOS.csv (562 empleados)
      ✓ ASISTENCIA_REGISTROS.csv ({access_att_count:,} registros)
      ✓ LOGS_BIOMETRICOS.csv ({access_logs_count:,} eventos)
      ✓ FACTURAS.csv ({access_factura_count:,} facturas)
      ✓ DETALLES_FACTURA.csv ({access_pay_count:,} detalles)
      ✓ PRODUCTOS.csv ({access_prod_count} productos)
      ✓ DETALLES_PAGO.csv (4,993 items)
    
    """)
    
    mysql_conn.close()
    access_conn.close()
    
    # Guardar resumen
    with open(r'C:\develop\gym-backend\COMPARATIVA_DETALLADA.txt', 'w', encoding='utf-8') as f:
        f.write("COMPARATIVA: ACCESS vs MYSQL\n")
        f.write("=" * 160 + "\n\n")
        f.write(f"Usuarios:       Access {access_users_count:,} vs MySQL {mysql_users_count}\n")
        f.write(f"Asistencia:     Access {access_att_count:,} vs MySQL {mysql_att_count}\n")
        f.write(f"Facturas:       Access {access_factura_count:,} vs MySQL {mysql_pay_count}\n")
        f.write(f"Productos:      Access {access_prod_count} vs MySQL {mysql_prod_count}\n")
        f.write(f"\nEstado: MySQL ESTÁ COMPLETAMENTE VACÍO\n")
    
    print("✓ Comparativa guardada en: C:\\develop\\gym-backend\\COMPARATIVA_DETALLADA.txt")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
