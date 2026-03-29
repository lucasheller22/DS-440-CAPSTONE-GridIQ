# Start the API from the correct folder (gridiq-backend).
# If you run uvicorn from the repo root, you get: ModuleNotFoundError: No module named 'app'

$ErrorActionPreference = "Stop"
$backend = Join-Path $PSScriptRoot "gridiq-backend"
if (-not (Test-Path $backend)) {
    Write-Error "Expected gridiq-backend next to this script. Not found: $backend"
    exit 1
}
Set-Location $backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
