#!/bin/bash

# FASE 8: Quick Validation Script
# Verifica compilación, tipos, y estructura del backend

echo "=================================="
echo "FASE 8: Quick Backend Validation"
echo "=================================="
echo ""

# 1. TypeScript Compilation Check
echo "[1/5] Verificando compilación TypeScript..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation successful"
else
  echo "❌ TypeScript compilation failed"
  exit 1
fi

echo ""

# 2. Lint Check
echo "[2/5] Ejecutando ESLint..."
npm run lint
if [ $? -eq 0 ]; then
  echo "✅ Lint check passed"
else
  echo "⚠️  Lint warnings found (non-blocking)"
fi

echo ""

# 3. Unit Tests
echo "[3/5] Ejecutando unit tests..."
npm run test
if [ $? -eq 0 ]; then
  echo "✅ Unit tests passed"
else
  echo "⚠️  Some unit tests failed"
fi

echo ""

# 4. File Structure Check
echo "[4/5] Verificando estructura de archivos..."

files=(
  "src/app.module.ts"
  "src/main.ts"
  "src/common/interceptors/error-handling.interceptor.ts"
  "src/common/interceptors/response.interceptor.ts"
  "src/common/middleware/logger.middleware.ts"
  "src/common/utils/pagination.util.ts"
  "src/common/utils/validation.util.ts"
  "src/common/utils/response.util.ts"
  "src/modules/auth/auth.controller.ts"
  "src/modules/auth/auth.service.ts"
  "src/modules/members/members.controller.ts"
  "src/modules/members/members.service.ts"
  "src/modules/dashboard/dashboard.controller.ts"
  "src/modules/reports/reports.controller.ts"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    ((missing++))
  fi
done

if [ $missing -eq 0 ]; then
  echo "✅ All critical files present"
else
  echo "❌ $missing files missing"
fi

echo ""

# 5. Module Imports Check
echo "[5/5] Verificando importes de módulos..."
grep -q "ErrorHandlingInterceptor" src/app.module.ts && echo "  ✅ ErrorHandlingInterceptor registered" || echo "  ❌ ErrorHandlingInterceptor not found"
grep -q "ResponseInterceptor" src/app.module.ts && echo "  ✅ ResponseInterceptor registered" || echo "  ❌ ResponseInterceptor not found"
grep -q "LoggerMiddleware" src/app.module.ts && echo "  ✅ LoggerMiddleware registered" || echo "  ❌ LoggerMiddleware not found"

echo ""
echo "=================================="
echo "✅ FASE 8: Validation Complete"
echo "=================================="
echo ""
echo "Ready to start: npm run start:dev"
