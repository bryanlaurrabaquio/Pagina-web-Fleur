@echo off
REM ============================================================
REM  FLEUR BACKEND - Arranque diario
REM ============================================================
setlocal
cd /d "%~dp0"

REM Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

REM Verificar .env
if not exist ".env" (
  echo [ERROR] No existe .env. Ejecuta primero setup.bat
  pause
  exit /b 1
)

REM Instalar dependencias si faltan
if not exist "node_modules" (
  echo node_modules no encontrado. Instalando dependencias...
  call npm install
  if errorlevel 1 ( echo [ERROR] Fallo npm install & pause & exit /b 1 )
)

echo.
echo ===== Iniciando Fleur API en http://localhost:4000 =====
echo (Ctrl+C para detener)
echo.
call npm run dev
pause
