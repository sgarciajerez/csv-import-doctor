$ErrorActionPreference = "Stop"

$appRoot = Split-Path -Parent $PSScriptRoot
$profilePath = Join-Path $appRoot "playwright/.auth/shopify-normal-chrome"
$shopifyUrl = "https://admin.shopify.com/store/csv-import-doctor-dev-okolejxc/apps/csv-import-doctor-3/app"
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $chromePath) {
  throw "No encuentro Google Chrome. Abre Chrome manualmente y usa el perfil dedicado en: $profilePath"
}

New-Item -ItemType Directory -Force -Path $profilePath | Out-Null
Start-Process -FilePath $chromePath -ArgumentList @("--user-data-dir=$profilePath", "--disable-background-mode", $shopifyUrl)
Write-Host "Chrome normal abierto con un perfil aislado. Inicia sesión en Shopify y, cuando cargue la app, cierra esa ventana antes de ejecutar: npm run auth:shopify"
