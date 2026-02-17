# Start the Local Image Search app (activate venv and run uvicorn)
# Run from project root: .\run.ps1

Set-Location $PSScriptRoot

if (-not (Test-Path env\Scripts\python.exe)) {
    Write-Host "Venv not found. Create it first: py -3.12 -m venv env"
    Write-Host "Then: .\env\Scripts\pip.exe install -r requirements.txt"
    exit 1
}

Write-Host "Starting server at http://127.0.0.1:8000"
Write-Host "Open that URL to index images and search. Press Ctrl+C to stop."
& .\env\Scripts\python.exe -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
