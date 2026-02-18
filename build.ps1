# Build script for Local Image Search Windows desktop application
# Requires: Node.js, npm, Python 3.12, PyInstaller (pip install pyinstaller)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "=== Local Image Search Build ===" -ForegroundColor Cyan

# Step 1: Build frontend
Write-Host "`n[1/4] Building frontend..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\frontend-vite"
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
} finally {
    Pop-Location
}

# Step 2: Install Electron dependencies
Write-Host "`n[2/4] Installing Electron dependencies..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\electron"
try {
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }
} finally {
    Pop-Location
}

# Step 3: Build Python backend (optional; improves packaged app)
Write-Host "`n[3/4] Building Python backend..." -ForegroundColor Yellow
$pyExe = "$ProjectRoot\dist\local-image-search-api.exe"
if (Test-Path "$ProjectRoot\env\Scripts\python.exe") {
    & "$ProjectRoot\env\Scripts\pip.exe" install pyinstaller 2>$null | Out-Null
    & "$ProjectRoot\env\Scripts\python.exe" "$ProjectRoot\build_python.py"
    if ($LASTEXITCODE -eq 0 -and (Test-Path $pyExe)) {
        Write-Host "  Python executable created. Adding to Electron package." -ForegroundColor Green
        $pyDir = "$ProjectRoot\electron\python_backend"
        New-Item -ItemType Directory -Force -Path $pyDir | Out-Null
        Copy-Item $pyExe "$pyDir\local-image-search-api.exe" -Force
    } else {
        Write-Host "  Python build skipped or failed. Packaged app will need API running separately." -ForegroundColor Gray
        $pyDir = "$ProjectRoot\electron\python_backend"
        New-Item -ItemType Directory -Force -Path $pyDir | Out-Null
        Set-Content -Path "$pyDir\.placeholder" -Value "Python backend not bundled"
    }
} else {
    Write-Host "  No venv found. Skipping Python build." -ForegroundColor Gray
}

# Step 4: Build Electron app
Write-Host "`n[4/4] Building Electron app with NSIS installer..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\electron"
try {
    npx electron-builder --win
    if ($LASTEXITCODE -ne 0) { throw "Electron build failed" }
} finally {
    Pop-Location
}

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
$installerPath = Get-ChildItem -Path "$ProjectRoot\electron\dist-electron" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installerPath) {
    Write-Host "Installer: $($installerPath.FullName)" -ForegroundColor Cyan
}
Write-Host "`nTo run without building installer: npm run electron:dev" -ForegroundColor Gray
