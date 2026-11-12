@echo off
chcp 65001 >nul
title VassaCRM Safe Deploy
cd /d "E:\Projects\VassaCRM"
echo ============================================================
echo   VassaCRM - SAFE DEPLOY
echo   Step 1: local smoke test (must pass)
echo   Step 2: Firebase deploy (only if step 1 passes)
echo ============================================================
echo.
echo [1/2] Running local smoke test...
python "E:\Projects\VassaCRM\tests\smoke_local.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  X Smoke test FAILED. Deploy aborted.
    echo    Fix the issues above, then run this again.
    pause
    exit /b 1
)
echo.
echo [2/2] Smoke test passed. Deploying to Firebase...
cd /d "E:\Projects\VassaCRM\firebase_hosting"
call "E:\Projects\Attendnce\tools\firebase\node_modules\.bin\firebase.cmd" deploy --only hosting
echo.
echo Done.
pause