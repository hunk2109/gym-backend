# Script de despliegue para SGGI Backend en Windows
# Este script compila la aplicación y la configura como un servicio en segundo plano usando PM2

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Preparando Despliegue del Backend SGGI (NestJS)      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Instalar dependencias
Write-Host "1. Instalando dependencias del proyecto..." -ForegroundColor Yellow
npm install

# 2. Construir la aplicación (TypeScript a JavaScript)
Write-Host "2. Construyendo la aplicación (Build)..." -ForegroundColor Yellow
npm run build

# 3. Instalar PM2 globalmente (Gestor de procesos de Node.js)
Write-Host "3. Instalando PM2 para ejecución en segundo plano..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup

# 4. Configurar PM2 para que inicie con Windows
Write-Host "4. Configurando PM2 para iniciar automáticamente con Windows..." -ForegroundColor Yellow
pm2-startup install

# 5. Detener el servicio si ya existía
Write-Host "5. Reiniciando servicio si ya existe..." -ForegroundColor Yellow
pm2 stop sggi-backend 2>$null
pm2 delete sggi-backend 2>$null

# 6. Iniciar la aplicación
Write-Host "6. Iniciando el backend de forma invisible..." -ForegroundColor Yellow
pm2 start dist/main.js --name "sggi-backend"

# 7. Guardar la configuración
Write-Host "7. Guardando configuración para el próximo reinicio..." -ForegroundColor Yellow
pm2 save

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " ¡DESPLIEGUE COMPLETADO CON ÉXITO!                      " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "El backend ahora se está ejecutando en segundo plano."
Write-Host "Para ver los logs (registros), puedes usar el comando: pm2 logs sggi-backend"
Write-Host "Para detenerlo temporalmente: pm2 stop sggi-backend"
Write-Host "========================================================"
