@echo off
title NPC Maker Pro - Compilador de instalador
echo ============================================
echo   NPC Maker Pro - Generando instalador .exe
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado.
    echo Descargalo gratis desde: https://nodejs.org/  ^(version LTS^)
    echo Luego vuelve a ejecutar este archivo.
    pause
    exit /b 1
)

echo [1/3] Instalando dependencias ^(solo la primera vez, puede tardar unos minutos^)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)

echo.
echo [2/3] Compilando la aplicacion...
call npm run react-build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion de la app.
    pause
    exit /b 1
)

echo.
echo [3/3] Generando instaladores .exe para Windows x64 y x86...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la generacion del instalador.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   LISTO! Se generaron 4 archivos en dist\:
echo     - NPC-Maker-Pro-Setup-x64.exe      (instalador, PCs 64-bit)
echo     - NPC-Maker-Pro-Setup-ia32.exe     (instalador, PCs 32-bit)
echo     - NPC-Maker-Pro-Portable-x64.exe   (portable, PCs 64-bit)
echo     - NPC-Maker-Pro-Portable-ia32.exe  (portable, PCs 32-bit)
echo ============================================
echo.
explorer dist
pause
