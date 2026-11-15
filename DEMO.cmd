@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-AgroShift.ps1" -WithDataWorker
if errorlevel 1 pause
