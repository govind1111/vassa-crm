@echo off
chcp 65001 >nul
title VassaCRM Safe Deploy
cd /d "E:\Projects\VassaCRM"
echo ============================================================
echo   VassaCRM - SAFE DEPLOY
echo ============================================================
echo.
echo [1/2] Firebase deploy...
cd /d "E:\Projects\VassaCRM\firebase_hosting"
call "E:\Projects\Attendnce\tools\firebase\node_modules\.bin\firebase.cmd" deploy --only hosting
echo.
echo Done.
pause