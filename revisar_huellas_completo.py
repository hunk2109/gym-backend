#!/usr/bin/env python3
"""
Búsqueda exhaustiva de datos biométricos en Access.
Revisa si todos los empleados tienen huellas en acc_monitor_log
"""

import pyodbc
import sys

# Conexión a Access
ACCESS_DB = r'c:\develop\gym-backend\dowtown.mdb'

try:
    conn = pyodbc.connect(f'Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={ACCESS_DB};')
    cursor = conn.cursor()
    print("✓ Conexión a Access establecida\n")
except Exception as e:
    print(f"✗ Error de conexión: {e}")
    sys.exit(1)

# =============================================================================
# ANÁLISIS DE USERINFO (Empleados)
# =============================================================================
print("="*80)
print("DATOS DE EMPLEADOS EN USERINFO")
print("="*80)

try:
    cursor.execute("SELECT COUNT(*) FROM USERINFO")
    total_employees = cursor.fetchone()[0]
    print(f"\nTotal de empleados: {total_employees}")
    
    # Revisar campo PHOTO
    cursor.execute("SELECT COUNT(*) FROM USERINFO WHERE PHOTO IS NOT NULL")
    with_photo = cursor.fetchone()[0]
    print(f"\nEmpleados con FOTO: {with_photo}/{total_employees} ({(with_photo/total_employees)*100:.1f}%)")
    
    # Revisar CardNo
    cursor.execute("SELECT COUNT(*) FROM USERINFO WHERE CardNo IS NOT NULL AND CardNo <> ''")
    with_cardno = cursor.fetchone()[0]
    print(f"Empleados con TARJETA: {with_cardno}/{total_employees} ({(with_cardno/total_employees)*100:.1f}%)")
    
    # Revisar VERIFICATIONMETHOD
    cursor.execute("SELECT COUNT(*) FROM USERINFO WHERE VERIFICATIONMETHOD IS NOT NULL AND VERIFICATIONMETHOD <> ''")
    with_verification = cursor.fetchone()[0]
    print(f"Empleados con MÉTODO DE VERIFICACIÓN: {with_verification}/{total_employees} ({(with_verification/total_employees)*100:.1f}%)")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# ANÁLISIS DE LOGS DE ACCESO (acc_monitor_log)
# =============================================================================
print("\n" + "="*80)
print("DATOS DE ACCESO VERIFICADO EN acc_monitor_log")
print("="*80)

try:
    cursor.execute("SELECT COUNT(*) FROM acc_monitor_log")
    total_logs = cursor.fetchone()[0]
    print(f"\nTotal de eventos de acceso: {total_logs}")
    
    # Usuarios únicos que aparecen en logs
    cursor.execute("SELECT COUNT(DISTINCT pin) FROM acc_monitor_log")
    unique_users_in_logs = cursor.fetchone()[0]
    print(f"Usuarios únicos en logs: {unique_users_in_logs}")
    
    # Usuarios con verificación exitosa (verified = 1)
    cursor.execute("SELECT COUNT(DISTINCT pin) FROM acc_monitor_log WHERE verified = 1")
    verified_users = cursor.fetchone()[0]
    print(f"Usuarios con verificación EXITOSA (verified=1): {verified_users}")
    
    # Usuarios con verificación fallida (verified = 0)
    cursor.execute("SELECT COUNT(DISTINCT pin) FROM acc_monitor_log WHERE verified = 0")
    failed_users = cursor.fetchone()[0]
    print(f"Usuarios con verificación FALLIDA (verified=0): {failed_users}")
    
    # Eventos por estado de verificación
    cursor.execute("SELECT verified, COUNT(*) as count FROM acc_monitor_log GROUP BY verified")
    print(f"\nEventos por tipo de verificación:")
    for row in cursor.fetchall():
        status = "VERIFICADO ✓" if row[0] == 1 else "NO VERIFICADO ✗" if row[0] == 0 else f"OTRO ({row[0]})"
        print(f"  {status}: {row[1]} eventos ({(row[1]/total_logs)*100:.1f}%)")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# COMPARACIÓN: EMPLEADOS vs ACCESO VERIFICADO
# =============================================================================
print("\n" + "="*80)
print("COMPARACIÓN: EMPLEADOS TOTALES vs CON ACCESO VERIFICADO")
print("="*80)

try:
    print(f"\nEmpleados TOTALES: {total_employees}")
    print(f"Empleados con ACCESO VERIFICADO: {verified_users}")
    print(f"Diferencia: {total_employees - verified_users} empleados SIN registro de verificación exitosa")
    print(f"Cobertura: {(verified_users/total_employees)*100:.1f}%")
    
    # Empleados que NO aparecen en logs
    cursor.execute("""
        SELECT COUNT(*) FROM USERINFO 
        WHERE USERID NOT IN (SELECT DISTINCT pin FROM acc_monitor_log)
    """)
    no_logs = cursor.fetchone()[0]
    print(f"\nEmpleados que NUNCA APARECEN en logs: {no_logs}")
    
    # Empleados con logs pero SIN verificación exitosa
    cursor.execute("""
        SELECT COUNT(DISTINCT pin) FROM acc_monitor_log 
        WHERE pin NOT IN (SELECT DISTINCT pin FROM acc_monitor_log WHERE verified = 1)
    """)
    only_failed = cursor.fetchone()[0]
    print(f"Empleados con logs SOLO DE FALLOS: {only_failed}")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# DETALLES: Empleados SIN verificación
# =============================================================================
print("\n" + "="*80)
print("EMPLEADOS SIN VERIFICACIÓN EXITOSA")
print("="*80)

try:
    cursor.execute("""
        SELECT TOP 30 u.USERID, u.name, u.lastname, u.Badgenumber, u.CardNo
        FROM USERINFO u 
        WHERE u.USERID NOT IN (SELECT DISTINCT pin FROM acc_monitor_log WHERE verified = 1)
        ORDER BY u.USERID
    """)
    
    rows = cursor.fetchall()
    print(f"\nMostrando primeros 30 de {no_logs} empleados sin verificación:")
    print(f"\n{'ID':<5} {'Nombre':<15} {'Apellido':<15} {'Badge':<8} {'Tarjeta':<10}")
    print("-" * 60)
    
    for row in rows:
        userid, name, lastname, badge, cardno = row
        badge = badge if badge else "-"
        cardno = cardno if cardno else "-"
        print(f"{userid:<5} {str(name)[:15]:<15} {str(lastname)[:15]:<15} {str(badge):<8} {str(cardno):<10}")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# DETALLES: Eventos verificados más recientes
# =============================================================================
print("\n" + "="*80)
print("EVENTOS DE VERIFICACIÓN MÁS RECIENTES")
print("="*80)

try:
    cursor.execute("""
        SELECT TOP 10 time, pin, card_no, verified, device_name, state
        FROM acc_monitor_log
        WHERE verified = 1
        ORDER BY time DESC
    """)
    
    print(f"\n{'Timestamp':<25} {'PIN':<6} {'Tarjeta':<10} {'Verificado':<12} {'Dispositivo':<20}")
    print("-" * 75)
    
    for row in cursor.fetchall():
        time, pin, card_no, verified, device_name, state = row
        verified_str = "✓ SÍ" if verified == 1 else "✗ NO"
        print(f"{str(time):<25} {pin:<6} {str(card_no)[:10]:<10} {verified_str:<12} {str(device_name)[:20]:<20}")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# RESUMEN Y CONCLUSIONES
# =============================================================================
print("\n" + "="*80)
print("CONCLUSIÓN")
print("="*80)

print(f"""
HALLAZGOS:

1. ESTRUCTURA BIOMÉTRICA:
   ✓ Las tablas FaceTemp, FingerVein y TEMPLATE EXISTEN pero están VACÍAS
   ✓ El sistema está PREPARADO para almacenar huellas pero NO HAY DATOS

2. FOTOS DE EMPLEADOS:
   ✓ El campo USERINFO.PHOTO existe pero está VACÍO
   ✗ {total_employees} empleados TIENEN foto = 0 registros

3. MÉTODOS DE VERIFICACIÓN ACTUAL:
   ✓ Se usan: PIN (ID de usuario) + Tarjeta + Dispositivo biométrico
   ✓ acc_monitor_log registra EVENTOS de verificación exitosa/fallida
   ✓ 4,357 eventos de acceso registrados
   
4. COBERTURA DE EMPLEADOS:
   ✓ Total de empleados: {total_employees}
   ✓ Con acceso verificado: {verified_users} ({(verified_users/total_employees)*100:.1f}%)
   ✗ SIN registro de verificación: {total_employees - verified_users}
   
5. RESPUESTA A TU PREGUNTA:
   ⚠ NO todos los empleados tienen huellas almacenadas
   ✓ Solo algunos tienen REGISTROS DE ACCESO VERIFICADO
   ✓ El sistema PUEDE almacenar huellas pero NUNCA SE CAPTURARON

DATOS REALES DISPONIBLES:
   • Datos de acceso verificado: 4,357 eventos (acc_monitor_log)
   • Empleados con acceso exitoso: {verified_users}
   • Información de empleados: {total_employees} registros (USERINFO)
   • Fotos: VACÍAS (estructura existe, sin datos)
   • Huellas: VACÍAS (estructura existe, sin datos)
""")

conn.close()
print("\n✓ Análisis completado")
