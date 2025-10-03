# Delivery Agent Email Extractor - PowerShell Script
# For Windows 11 Command Line Environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Delivery Agent Email Extractor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Available options:" -ForegroundColor Yellow
Write-Host "1. Extract all emails (CSV, JSON, TXT)" -ForegroundColor White
Write-Host "2. Extract only active agents" -ForegroundColor White
Write-Host "3. Extract only verified agents" -ForegroundColor White
Write-Host "4. Extract with full details" -ForegroundColor White
Write-Host "5. Custom format (CSV only)" -ForegroundColor White
Write-Host "6. Custom format (JSON only)" -ForegroundColor White
Write-Host "7. Custom format (TXT only)" -ForegroundColor White
Write-Host "8. Custom output filename" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-8)"

switch ($choice) {
    "1" {
        Write-Host "Extracting all delivery agent emails..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=all
    }
    "2" {
        Write-Host "Extracting active delivery agent emails..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=all --active-only
    }
    "3" {
        Write-Host "Extracting verified delivery agent emails..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=all --verified-only
    }
    "4" {
        Write-Host "Extracting delivery agent emails with full details..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=all --include-details
    }
    "5" {
        Write-Host "Extracting delivery agent emails to CSV..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=csv
    }
    "6" {
        Write-Host "Extracting delivery agent emails to JSON..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=json
    }
    "7" {
        Write-Host "Extracting delivery agent emails to TXT..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=txt
    }
    "8" {
        $filename = Read-Host "Enter custom filename (without extension)"
        $format = Read-Host "Enter format (csv/json/txt/all)"
        Write-Host "Extracting delivery agent emails with custom filename..." -ForegroundColor Green
        node extract-delivery-agent-emails.js --format=$format --output=$filename
    }
    default {
        Write-Host "Invalid choice. Running default extraction..." -ForegroundColor Yellow
        node extract-delivery-agent-emails.js --format=all
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
