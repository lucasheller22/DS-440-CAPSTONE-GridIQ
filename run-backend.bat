@echo off
REM Start the API from gridiq-backend (avoids ModuleNotFoundError: No module named 'app')
cd /d "%~dp0gridiq-backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
