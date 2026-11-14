param([switch]$Stop, [switch]$NoBrowser, [ValidateRange(1024,65535)][int]$WebPort = 5173, [ValidateRange(1024,65535)][int]$ApiPort = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$statePath = Join-Path $runtimeRoot 'servers.json'
$appUrl = "http://localhost:$WebPort"

function Test-OwnedProcess($entry) {
    if ($entry.root -ne $projectRoot) { return $false }
    $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
    return ($null -ne $process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $entry.startedTicks)
}

$previous = @()
if (Test-Path -LiteralPath $statePath) {
    $previous = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
}

if ($Stop) {
    foreach ($entry in $previous) {
        if (Test-OwnedProcess $entry) {
            # En Windows, el ejecutable del venv puede iniciar un Python hijo.
            # Solo se detiene el hijo si pertenece al proceso registrado y ocupa
            # el puerto de esta API con el comando esperado.
            if ($entry.name -eq 'api') {
                $apiListeners = @(Get-NetTCPConnection -LocalPort $entry.port -State Listen -ErrorAction SilentlyContinue)
                $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($entry.pid)")
                foreach ($child in $children) {
                    if ($child.CommandLine -like "*-m uvicorn app.main:app --host 127.0.0.1 --port $($entry.port)*" -and $apiListeners.OwningProcess -contains $child.ProcessId) {
                        Stop-Process -Id $child.ProcessId
                    }
                }
            }
            Stop-Process -Id $entry.pid -ErrorAction SilentlyContinue
            Write-Host "Detenido: $($entry.name)"
        }
    }
    Start-Sleep -Milliseconds 300
    Write-Host 'Servidores de Pacha Pulse detenidos. No se detuvieron procesos ajenos al lanzador.'
    exit 0
}

$running = @($previous | Where-Object { Test-OwnedProcess $_ })
if ($running.Count -eq 2) {
    $WebPort = ($running | Where-Object { $_.name -eq 'web' }).port
    $appUrl = "http://localhost:$WebPort"
    Write-Host "Pacha Pulse ya esta activo: $appUrl"
    if (-not $NoBrowser) { Start-Process $appUrl }
    exit 0
}

if ($running.Count -gt 0) { throw 'Hay una instancia parcial de esta carpeta. Usa STOP_DEMO.cmd y vuelve a iniciar.' }
$portsFound = $false
for ($offset = 0; $offset -le 10; $offset++) {
    $candidateWeb = $WebPort + $offset
    $candidateApi = $ApiPort + $offset
    if ($candidateWeb -gt 65535 -or $candidateApi -gt 65535 -or $candidateWeb -eq $candidateApi) { continue }
    $occupied = @(Get-NetTCPConnection -LocalPort $candidateWeb,$candidateApi -State Listen -ErrorAction SilentlyContinue)
    if ($occupied.Count -eq 0) { $WebPort=$candidateWeb; $ApiPort=$candidateApi; $portsFound=$true; break }
}
if (-not $portsFound) { throw 'No hay un par de puertos locales libres para esta demo.' }
$appUrl = "http://localhost:$WebPort"
Write-Host "Carpeta de desarrollo: $projectRoot"
Write-Host "Puertos seleccionados: web $WebPort / API $ApiPort (otras copias permanecen intactas)."

$pythonPath = Join-Path $projectRoot 'backend\.venv\Scripts\python.exe'
$vitePath = Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $pythonPath) -or -not (Test-Path -LiteralPath $vitePath)) {
    throw 'Faltan dependencias. Sigue la instalacion descrita en README.md.'
}
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$created = @()
try {
    $api = Start-Process -FilePath $pythonPath -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', $ApiPort -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot 'api.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'api.stderr.log') -PassThru
    $created += $api
    $previousProxy = $env:API_PROXY_TARGET
    try {
        $env:API_PROXY_TARGET = "http://127.0.0.1:$ApiPort"
        $web = Start-Process -FilePath $nodePath -ArgumentList '.\node_modules\vite\bin\vite.js', '--host', '127.0.0.1', '--port', $WebPort, '--strictPort' -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot 'web.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'web.stderr.log') -PassThru
    } finally { $env:API_PROXY_TARGET = $previousProxy }
    $created += $web
    @(@{name='api'; root=$projectRoot; port=$ApiPort; pid=$api.Id; startedTicks=$api.StartTime.ToUniversalTime().Ticks.ToString()}, @{name='web'; root=$projectRoot; port=$WebPort; pid=$web.Id; startedTicks=$web.StartTime.ToUniversalTime().Ticks.ToString()}) | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    $ready = $false
    for ($attempt = 0; $attempt -lt 35; $attempt++) {
        if ($api.HasExited -or $web.HasExited) { throw 'Un servidor termino al arrancar. Consulta los logs de .local.' }
        try {
            $apiResponse = Invoke-WebRequest "http://127.0.0.1:$ApiPort/api/v1/health" -UseBasicParsing -TimeoutSec 2
            $webResponse = Invoke-WebRequest "http://127.0.0.1:$WebPort/" -UseBasicParsing -TimeoutSec 2
            if ($apiResponse.StatusCode -eq 200 -and $webResponse.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 300 }
    }
    if (-not $ready) { throw 'Los servidores no estuvieron listos a tiempo. Consulta los logs de .local.' }
    Write-Host "Pagina del proyecto: $appUrl"
    Write-Host "Demo: $appUrl/#demo"
    Write-Host 'Para detener: doble clic en STOP_DEMO.cmd.'
    if (-not $NoBrowser) { Start-Process $appUrl }
} catch {
    foreach ($process in $created) {
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue }
    }
    throw
}
