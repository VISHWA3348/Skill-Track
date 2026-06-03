@echo off
SETLOCAL EnableDelayedExpansion
TITLE Skill Track - Development Server
echo ==========================================
echo   Skill Track - Starting...
echo ==========================================

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection and Node.js installation.
        pause
        exit /b !ERRORLEVEL!
    )
)

:: Check if .env or .env.local exists, if not copy from .env.example
set ENV_EXISTS=0
if exist ".env" set ENV_EXISTS=1
if exist ".env.local" set ENV_EXISTS=1

if !ENV_EXISTS! equ 0 (
    if exist ".env.example" (
        echo [INFO] No .env file found. Creating .env from .env.example...
        copy .env.example .env
        echo [WARNING] Please update the GEMINI_API_KEY in the .env file!
    ) else (
        echo [WARNING] .env.example not found. Please ensure your environment variables are set.
    )
)

echo [INFO] Starting the application (Backend + Frontend)...
echo [INFO] The server will be available at http://localhost:5000
echo.
echo [HINT] Press Ctrl+C to stop the server.
echo.

:: Run the dev command
call npm run dev

if !ERRORLEVEL! neq 0 (
    echo.
    echo [ERROR] The application stopped unexpectedly (Exit Code: !ERRORLEVEL!).
    pause
)
