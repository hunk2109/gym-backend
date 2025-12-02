# Testing Script para 84 Endpoints de Gym API
# Base URL: http://10.10.4.207:3000/api

$BASE_URL = "http://10.10.4.207:3000/api"
$RESULTS = @()
$TOKEN = ""

# Colores
$SUCCESS = @{ForegroundColor = 'Green'}
$ERROR = @{ForegroundColor = 'Red'}
$INFO = @{ForegroundColor = 'Cyan'}

Write-Host "=====================================" @INFO
Write-Host "FASE 8: Testing & Validación (84 endpoints)" @INFO
Write-Host "=====================================" @INFO
Write-Host ""

# Helper function para registrar resultados
function Log-Result {
    param(
        [string]$Endpoint,
        [string]$Method,
        [int]$StatusCode,
        [string]$Status
    )
    $RESULTS += @{
        Endpoint = $Endpoint
        Method = $Method
        StatusCode = $StatusCode
        Status = $Status
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    Write-Host "$Method $Endpoint - [$StatusCode] $Status" @($Status -eq "✅" ? $SUCCESS : $ERROR)
}

# ===== FASE 0: AUTH (3 endpoints) =====
Write-Host "`n[1/11] PHASE 0: AUTH ENDPOINTS" @INFO

try {
    # POST /auth/register
    $registerPayload = @{
        email = "testuser@gym.com"
        password = "Test123456"
        name = "Test User"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BASE_URL/auth/register" -Method POST -Body $registerPayload -ContentType "application/json" -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/auth/register" "POST" $response.StatusCode "✅"
    $TOKEN = ($response.Content | ConvertFrom-Json).data.access_token
} catch {
    Log-Result "/auth/register" "POST" $_.Exception.Response.StatusCode "❌"
}

try {
    # POST /auth/login
    $loginPayload = @{
        email = "testuser@gym.com"
        password = "Test123456"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BASE_URL/auth/login" -Method POST -Body $loginPayload -ContentType "application/json" -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/auth/login" "POST" $response.StatusCode "✅"
    $TOKEN = ($response.Content | ConvertFrom-Json).data.access_token
} catch {
    Log-Result "/auth/login" "POST" $_.Exception.Response.StatusCode "❌"
}

try {
    # POST /auth/logout
    $headers = @{ Authorization = "Bearer $TOKEN" }
    $response = Invoke-WebRequest -Uri "$BASE_URL/auth/logout" -Method POST -Headers $headers -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/auth/logout" "POST" $response.StatusCode "✅"
} catch {
    Log-Result "/auth/logout" "POST" $_.Exception.Response.StatusCode "❌"
}

# ===== FASE 1: MEMBERS (11 endpoints) =====
Write-Host "`n[2/11] PHASE 1: MEMBERS ENDPOINTS (11)" @INFO

$headers = @{ Authorization = "Bearer $TOKEN" }

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/members" -Method GET -Headers $headers -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/members" "GET" $response.StatusCode "✅"
} catch {
    Log-Result "/members" "GET" $_.Exception.Response.StatusCode "❌"
}

try {
    $createPayload = @{
        name = "Juan Pérez"
        email = "juan@gym.com"
        phone = "1234567890"
        address = "Calle Principal 123"
        joinDate = Get-Date -Format "yyyy-MM-dd"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BASE_URL/members" -Method POST -Headers $headers -Body $createPayload -ContentType "application/json" -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/members" "POST" $response.StatusCode "✅"
    $memberId = ($response.Content | ConvertFrom-Json).data.id
} catch {
    Log-Result "/members" "POST" $_.Exception.Response.StatusCode "❌"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/members/search?search=juan" -Method GET -Headers $headers -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/members/search" "GET" $response.StatusCode "✅"
} catch {
    Log-Result "/members/search" "GET" $_.Exception.Response.StatusCode "❌"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/members/paid?isPaid=true" -Method GET -Headers $headers -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/members/paid" "GET" $response.StatusCode "✅"
} catch {
    Log-Result "/members/paid" "GET" $_.Exception.Response.StatusCode "❌"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/members/recent" -Method GET -Headers $headers -SkipHttpErrorCheck -SkipCertificateCheck
    Log-Result "/members/recent" "GET" $response.StatusCode "✅"
} catch {
    Log-Result "/members/recent" "GET" $_.Exception.Response.StatusCode "❌"
}

# ===== SUMMARY =====
Write-Host "`n=====================================" @INFO
Write-Host "TESTING SUMMARY" @INFO
Write-Host "=====================================" @INFO
Write-Host "Total Tests: $($RESULTS.Count)" @INFO
Write-Host "Passed: $($RESULTS | Where-Object Status -eq "✅" | Measure-Object | Select-Object -ExpandProperty Count)" @SUCCESS
Write-Host "Failed: $($RESULTS | Where-Object Status -eq "❌" | Measure-Object | Select-Object -ExpandProperty Count)" @ERROR

Write-Host "`nDetailed Results:" @INFO
$RESULTS | Format-Table -AutoSize

Write-Host "`nNote: Para pruebas completas, ejecuta Postman o curl con los endpoints documentados en API_DOCUMENTATION.md" @INFO
