@echo off
:: RobCo Persistence Audit
:: -NoExit keeps the PowerShell window open after the script finishes.
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0check-persistence.ps1"
