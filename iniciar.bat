@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Verificando Docker...
echo ============================================
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo O Docker Desktop nao esta rodando.
    echo Abra o Docker Desktop no menu iniciar, espere o icone ficar verde
    echo e rode este arquivo de novo.
    echo.
    pause
    exit /b 1
)

echo Docker OK.
echo.
echo ============================================
echo   Rodando migrations do banco...
echo ============================================
call npm run migrate

echo.
echo ============================================
echo   Abrindo backend e frontend...
echo ============================================
start "Backend (porta 3000)" cmd /k "npm run dev:backend"
start "Frontend (porta 5173)" cmd /k "npm run dev:frontend"

echo Aguardando os servidores subirem...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo ============================================
echo   Tudo pronto!
echo   O navegador deve abrir sozinho em http://localhost:5173
echo   Login: admin@perezimoveis.com / ChangeMe123!
echo.
echo   Para PARAR o sistema: feche as duas janelas pretas
echo   (Backend e Frontend) que abriram.
echo ============================================
pause
