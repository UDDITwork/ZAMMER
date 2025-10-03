@echo off
echo ========================================
echo   Delivery Agent Email Extractor
echo ========================================
echo.

REM Change to the backend directory
cd /d "%~dp0"

echo Available options:
echo 1. Extract all emails (CSV, JSON, TXT)
echo 2. Extract only active agents
echo 3. Extract only verified agents
echo 4. Extract with full details
echo 5. Custom format (CSV only)
echo 6. Custom format (JSON only)
echo 7. Custom format (TXT only)
echo.

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    echo Extracting all delivery agent emails...
    node extract-delivery-agent-emails.js --format=all
) else if "%choice%"=="2" (
    echo Extracting active delivery agent emails...
    node extract-delivery-agent-emails.js --format=all --active-only
) else if "%choice%"=="3" (
    echo Extracting verified delivery agent emails...
    node extract-delivery-agent-emails.js --format=all --verified-only
) else if "%choice%"=="4" (
    echo Extracting delivery agent emails with full details...
    node extract-delivery-agent-emails.js --format=all --include-details
) else if "%choice%"=="5" (
    echo Extracting delivery agent emails to CSV...
    node extract-delivery-agent-emails.js --format=csv
) else if "%choice%"=="6" (
    echo Extracting delivery agent emails to JSON...
    node extract-delivery-agent-emails.js --format=json
) else if "%choice%"=="7" (
    echo Extracting delivery agent emails to TXT...
    node extract-delivery-agent-emails.js --format=txt
) else (
    echo Invalid choice. Running default extraction...
    node extract-delivery-agent-emails.js --format=all
)

echo.
echo Press any key to exit...
pause >nul
