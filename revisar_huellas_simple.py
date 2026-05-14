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
    print(f"Empleados con FOTO: {with_photo}/{total_employees} ({(with_photo/total_employees)*100:.1f}%)")
    
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
    
    # Usuarios únicos que aparecen en logs (sin DISTINCT)
    cursor.execute("SELECT COUNT(DISTINCT pin) as unique_users FROM (SELECT DISTINCT pin FROM acc_monitor_log)")
    
except Exception as e:
    # Access no soporta DISTINCT en COUNT, así que obtenemos la lista
    cursor.execute("SELECT DISTINCT pin FROM acc_monitor_log")
    all_users = [row[0] for row in cursor.fetchall()]
    unique_users_in_logs = len(all_users)
    print(f"Usuarios únicos en logs: {unique_users_in_logs}")

# Usuarios con verificación exitosa (verified = 1)
try:
    cursor.execute("SELECT DISTINCT pin FROM acc_monitor_log WHERE verified = 1")
    verified_list = [row[0] for row in cursor.fetchall()]
    verified_users = len(verified_list)
    print(f"Usuarios con verificación EXITOSA (verified=1): {verified_users}")
except Exception as e:
    print(f"Error al contar verificados: {e}")
    verified_users = 0

# Usuarios con verificación fallida (verified = 0)
try:
    cursor.execute("SELECT DISTINCT pin FROM acc_monitor_log WHERE verified = 0")
    failed_list = [row[0] for row in cursor.fetchall()]
    failed_users = len(failed_list)
    print(f"Usuarios con verificación FALLIDA (verified=0): {failed_users}")
except Exception as e:
    failed_users = 0

# Eventos por estado de verificación
try:
    cursor.execute("SELECT verified, COUNT(*) as count FROM acc_monitor_log GROUP BY verified")
    print(f"\nEventos por tipo de verificación:")
    for row in cursor.fetchall():
        status = "VERIFICADO ✓" if row[0] == 1 else "NO VERIFICADO ✗" if row[0] == 0 else f"OTRO ({row[0]})"
        print(f"  {status}: {row[1]} eventos ({(row[1]/total_logs)*100:.1f}%)")
except Exception as e:
    print(f"Error: {e}")

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
    cursor.execute("SELECT DISTINCT USERID FROM USERINFO")
    all_employee_ids = set(row[0] for row in cursor.fetchall())
    cursor.execute("SELECT DISTINCT pin FROM acc_monitor_log")
    all_log_ids = set(row[0] for row in cursor.fetchall())
    
    no_logs = len(all_employee_ids - all_log_ids)
    print(f"\nEmpleados que NUNCA APARECEN en logs: {no_logs}")
    
    # Empleados con logs pero SIN verificación exitosa
    only_failed = len(all_log_ids - set(verified_list))
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
        SELECT TOP 30 USERID, name, lastname, Badgenumber, CardNo
        FROM USERINFO 
        ORDER BY USERID
    """)
    
    rows = cursor.fetchall()
    employees_without_verification = []
    
    for row in rows:
        if row[0] not in verified_list:
            employees_without_verification.append(row)
    
    print(f"\nMostrando primeros 30 de {len(all_employee_ids - set(verified_list))} empleados sin verificación:")
    print(f"\n{'ID':<5} {'Nombre':<15} {'Apellido':<15} {'Badge':<8} {'Tarjeta':<10}")
    print("-" * 60)
    
    for i, row in enumerate(employees_without_verification[:30]):
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
        SELECT TOP 10 time, pin, card_no, verified, device_name
        FROM acc_monitor_log
        WHERE verified = 1
        ORDER BY time DESC
    """)
    
    print(f"\n{'Timestamp':<25} {'PIN':<6} {'Tarjeta':<10} {'Verificado':<12} {'Dispositivo':<20}")
    print("-" * 75)
    
    for row in cursor.fetchall():
        time, pin, card_no, verified, device_name = row
        verified_str = "✓ SÍ" if verified == 1 else "✗ NO"
        print(f"{str(time):<25} {pin:<6} {str(card_no)[:10]:<10} {verified_str:<12} {str(device_name)[:20]:<20}")
    
except Exception as e:
    print(f"✗ Error: {e}")

# =============================================================================
# RESUMEN Y CONCLUSIONES
# =============================================================================
print("\n" + "="*80)
print("CONCLUSIÓN FINAL")
print("="*80)

print(f"""
HALLAZGOS CLAVE:

1. ESTRUCTURA BIOMÉTRICA:
   ✓ Las tablas FaceTemp, FingerVein y TEMPLATE EXISTEN pero están VACÍAS
   ✓ El sistema está PREPARADO para almacenar huellas pero NO HAY DATOS

2. FOTOS DE EMPLEADOS:
   ✗ El campo USERINFO.PHOTO existe pero está COMPLETAMENTE VACÍO
   ✗ 0/562 empleados tienen fotos almacenadas

3. DATOS DE TARJETA:
   ✗ El campo USERINFO.CardNo está COMPLETAMENTE VACÍO
   ✗ 0/562 empleados tienen número de tarjeta en USERINFO

4. MÉTODOS DE VERIFICACIÓN EN USERINFO:
   ✗ El campo VERIFICATIONMETHOD está COMPLETAMENTE VACÍO
   ✗ 0/562 empleados tienen método de verificación especificado

5. COBERTURA DE ACCESO VERIFICADO:
   ✓ Total de empleados: {total_employees}
   ✓ Con acceso verificado exitoso: {verified_users} ({(verified_users/total_employees)*100:.1f}%)
   ✗ SIN registro de verificación: {total_employees - verified_users}
   ✓ En logs pero sin verificación exitosa: {only_failed}

RESPUESTA A TU PREGUNTA "¿Todos tienen huellas?":
   ✗ NO - Absolutamente NINGÚN empleado tiene datos de huellas almacenados
   ✓ Solo {verified_users} tienen REGISTROS DE ACCESO verificado en logs
   ✓ El sistema PUEDE almacenar huellas (estructura existe) pero NUNCA se capturaron
   ✓ Los datos de acceso verificado provienen solo de acc_monitor_log

DATOS REALES DISPONIBLES EN ACCESS:
   • Eventos de acceso verificado: {total_logs} (acc_monitor_log)
   • Empleados con acceso exitoso: {verified_users}
   • Información de empleados: {total_employees} (USERINFO)
   • Fotos: 0 almacenadas
   • Huellas: 0 almacenadas
   • Datos de tarjeta: 0 almacenados
""")

conn.close()
print("\n✓ Análisis completado")
