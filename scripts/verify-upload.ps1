# PowerShell script to verify upload

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Verifying Upload Results" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

node verify-upload.js

Write-Host ""
Read-Host "Press Enter to exit"
