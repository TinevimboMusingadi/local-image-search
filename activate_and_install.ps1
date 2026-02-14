# Activate Python 3.12 venv and install requirements
# Run from project root: .\activate_and_install.ps1

Set-Location $PSScriptRoot

if (-not (Test-Path env)) {
    Write-Host "Creating venv with Python 3.12..."
    py -3.12 -m venv env
}

Write-Host "Activating venv..."
. .\env\Scripts\Activate.ps1

Write-Host "Python: $(python --version)"
Write-Host "Installing requirements..."
pip install -r requirements.txt

Write-Host "Done. To activate in a new shell, run: .\env\Scripts\Activate.ps1"
