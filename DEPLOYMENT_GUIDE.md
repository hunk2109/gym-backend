═══════════════════════════════════════════════════════════════════

🚀 GUÍA DE DEPLOYMENT - SISTEMA RBAC GYM MANAGER

═══════════════════════════════════════════════════════════════════

PREPARACIÓN PRE-DEPLOYMENT:

═══════════════════════════════════════════════════════════════════

1. VERIFICACIONES DE SEGURIDAD:

   □ Cambiar JWT_SECRET en .env (no usar 'muerete66')
   □ Cambiar credenciales de BD
   □ Habilitar HTTPS/SSL
   □ Configurar CORS específicamente (no *)
   □ Activar rate limiting en endpoints de login
   □ Configurar backups automáticos de BD
   □ Revisar logs para datos sensibles
   □ Verificar que contraseñas están hasheadas

2. VERIFICACIONES TÉCNICAS:

   □ npm run lint - Sin errores
   □ npm run test:e2e - Todos los tests pasan
   □ npm run build - Sin warnings
   □ flutter analyze - Sin problemas

3. DOCUMENTACIÓN:

   □ Compartir RBAC_SYSTEM_COMPLETE.txt con equipo
   □ Capacitar a administradores en gestión de roles
   □ Documentar procedimientos de emergencia
   □ Crear backup de configuración

═══════════════════════════════════════════════════════════════════

PASO A PASO - BACKEND:

═══════════════════════════════════════════════════════════════════

1. Preparar Entorno:

   ```bash
   cd gym-backend
   
   # Verificar Node version
   node --version  # Debe ser 18+
   
   # Instalar dependencias
   npm install
   
   # Verificar no hay vulnerabilidades
   npm audit
   ```

2. Configurar Producción:

   ```bash
   # Crear .env.production
   cat > .env.production << EOF
   # Base de datos
   DB_HOST=production-db-host
   DB_PORT=3306
   DB_USERNAME=prod_user
   DB_PASSWORD=STRONG_PASSWORD_HERE
   DB_NAME=gym_manager_prod
   
   # JWT
   JWT_SECRET=GENERATE_LONG_RANDOM_STRING_HERE
   
   # Node
   NODE_ENV=production
   EOF
   ```

3. Compilar:

   ```bash
   npm run build
   ```

4. Ejecutar Tests Final:

   ```bash
   npm run test:e2e
   ```

5. Desplegar:

   ```bash
   # Opción 1: Docker
   docker build -t gym-backend:v2.0 .
   docker push gym-backend:v2.0
   docker run -d \
     --env-file .env.production \
     -p 3000:3000 \
     gym-backend:v2.0
   
   # Opción 2: PM2
   npm run build
   pm2 start dist/main.js --name "gym-backend"
   
   # Opción 3: Servidor tradicional
   npm run build
   nohup node dist/main.js &
   ```

═══════════════════════════════════════════════════════════════════

PASO A PASO - FRONTEND:

═══════════════════════════════════════════════════════════════════

1. Configurar URL del Backend:

   Actualizar en sggi/lib/constants/app_constants.dart:

   ```dart
   static const String apiBaseUrl = 'https://api.production.com/api';
   ```

2. Build para Android:

   ```bash
   cd sggi
   flutter build apk --release
   # Salida: build/app/outputs/flutter-apk/app-release.apk
   ```

3. Build para iOS:

   ```bash
   flutter build ios --release
   # Salida: build/ios/iphoneos/
   ```

4. Subir a Store:

   - Android: Google Play Store
   - iOS: Apple App Store

═══════════════════════════════════════════════════════════════════

VERIFICACIÓN POST-DEPLOYMENT:

═══════════════════════════════════════════════════════════════════

1. Tests Funcionales:

   □ Admin puede asignar roles
   □ Encargado NO puede asignar roles
   □ Cajero puede registrar ventas
   □ Cliente solo ve su información
   □ Logout limpia sesión
   □ Token expira después de 24h

2. Tests de Seguridad:

   □ Sin token → 401
   □ Token inválido → 401
   □ Rol sin permiso → 403
   □ Passwords NO aparecen en responses
   □ Costos NO aparecen para CLIENTE
   □ Intentos fallidos se registran

3. Performance:

   □ Endpoints responden < 1s
   □ Filtrado de respuestas < 100ms
   □ Sin memory leaks en Frontend

═══════════════════════════════════════════════════════════════════

MONITOREO EN PRODUCCIÓN:

═══════════════════════════════════════════════════════════════════

Logs a revisar regularmente:

```bash
# Ver logs en tiempo real
tail -f /var/log/gym-backend.log

# Buscar intentos no autorizados
grep "UNAUTHORIZED ATTEMPT" /var/log/gym-backend.log

# Buscar acciones sensibles
grep "SENSITIVE ACTION" /var/log/gym-backend.log
```

Alertas recomendadas:

  • Más de 5 intentos fallidos del mismo usuario
  • Cambio de roles a usuario
  • Eliminación de datos importantes
  • Acceso a reportes financieros

═══════════════════════════════════════════════════════════════════

PROCEDIMIENTOS DE EMERGENCIA:

═══════════════════════════════════════════════════════════════════

1. Si una cuenta está comprometida:

   ```bash
   # Cambiar contraseña del usuario
   UPDATE users SET passwordHash = bcrypt('new_password') 
   WHERE id = 'user_id';
   
   # Revocar sus sesiones (cambiar JWT_SECRET si es grave)
   ```

2. Si alguien obtiene acceso no autorizado:

   ```bash
   # Cambiar JWT_SECRET inmediatamente
   # Notificar a todos los usuarios
   # Revisar logs de actividades
   # Identificar acciones realizadas
   ```

3. Si la BD se corrompe:

   ```bash
   # Restaurar desde backup
   mysql gym_manager_prod < backup_latest.sql
   ```

═══════════════════════════════════════════════════════════════════

MANTENIMIENTO REGULAR:

═══════════════════════════════════════════════════════════════════

Diariamente:
  □ Revisar logs de intentos fallidos
  □ Verificar salud del servicio (health check)
  □ Backup de BD

Semanalmente:
  □ Revisar usuarios nuevos
  □ Validar cambios de roles
  □ Revisar actividades sospechosas

Mensualmente:
  □ Auditoría de permisos
  □ Revisión de accesos
  □ Análisis de logs
  □ Validar que datos sensibles no se exponen

═══════════════════════════════════════════════════════════════════

ESCALABILIDAD:

═══════════════════════════════════════════════════════════════════

Si el sistema crece:

1. BD:
   □ Crear índices en columnas de role y user
   □ Considerar replicación de BD
   □ Implementar caching (Redis)

2. Backend:
   □ Usar load balancer (nginx, HAProxy)
   □ Desplegar múltiples instancias
   □ Cache de ResponseFilterService

3. Frontend:
   □ Usar CDN para assets
   □ Implementar lazy loading
   □ Comprimir imágenes

═══════════════════════════════════════════════════════════════════

VERSIONAMIENTO:

═══════════════════════════════════════════════════════════════════

Versión Actual: 2.0 (RBAC Completado)

Cambios futuros:
  - 2.1: Sesiones persistentes
  - 2.2: 2FA
  - 2.3: Rate limiting avanzado
  - 3.0: OAuth 2.0 integration

═══════════════════════════════════════════════════════════════════

CONTACTO DE SOPORTE:

═══════════════════════════════════════════════════════════════════

Dudas técnicas:
  → Revisar RBAC_SYSTEM_COMPLETE.txt
  → Revisar QUICK_VALIDATION.md
  → Consultar código en src/modules/auth/

Problemas en producción:
  → Revisar logs
  → Ejecutar health checks
  → Contactar al equipo de desarrollo

═══════════════════════════════════════════════════════════════════

CHECKLIST DE DEPLOYMENT FINAL:

═══════════════════════════════════════════════════════════════════

PRE-DEPLOYMENT:
  □ Todos los tests pasan
  □ No hay warnings en build
  □ .env.production configurado
  □ Backup de BD tomado
  □ Certificados SSL/TLS actualizados

DEPLOYMENT:
  □ Backend subido a servidor
  □ Frontend subido a stores
  □ URLs actualizadas
  □ Configuración de CORS verificada

POST-DEPLOYMENT:
  □ Health checks pasando
  □ Tests funcionales OK
  □ Logs sin errores
  □ Monitoreo activo
  □ Equipo notificado

═══════════════════════════════════════════════════════════════════

Estado: ✅ LISTO PARA DESPLEGAR A PRODUCCIÓN

═══════════════════════════════════════════════════════════════════
