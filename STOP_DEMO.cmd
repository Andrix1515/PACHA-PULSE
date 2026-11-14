@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-AgroShift.ps1" -Stop
if errorlevel 1 pause
