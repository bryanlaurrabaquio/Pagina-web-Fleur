@echo off
REM ============================================================
REM  FLEUR BACKEND - Configuracion inicial (ejecutar una vez)
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ===== FLEUR - Configuracion inicial =====
echo.

REM 1) Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo         Descargalo en https://nodejs.org ^(version 18 o superior^) y vuelve a ejecutar.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo Node.js detectado: %%v

REM 2) Verificar .env
if not exist ".env" (
  echo [AVISO] No existe .env. Copiando desde .env.example...
  copy ".env.example" ".env" >nul
  echo         Edita .env y ajusta DATABASE_URL antes de continuar.
  pause
)

REM 3) Instalar dependencias
echo.
echo Instalando dependencias ^(npm install^)...
call npm install
if errorlevel 1 ( echo [ERROR] Fallo npm install & pause & exit /b 1 )

REM 4) Generar cliente Prisma
echo.
echo Generando cliente Prisma...
call npx prisma generate
if errorlevel 1 ( echo [ERROR] Fallo prisma generate & pause & exit /b 1 )

REM 5) Migraciones
echo.
echo Aplicando migraciones ^(prisma migrate dev^)...
call npx prisma migrate dev --name init
if errorlevel 1 (
  echo [ERROR] Fallo la migracion. Revisa que PostgreSQL este corriendo y DATABASE_URL sea correcta.
  pause
  exit /b 1
)

REM 6) Seed
echo.
echo Cargando datos de ejemplo ^(seed^)...
call npm run seed
if errorlevel 1 ( echo [AVISO] El seed fallo, pero puedes continuar. )

echo.
echo ===== Listo. Ahora ejecuta start.bat para iniciar el backend. =====
pause
