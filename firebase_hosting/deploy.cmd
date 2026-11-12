@echo off
chcp 65001 >nul
title VassaCRM Safe Deploy
cd /d "E:\Projects\VassaCRM"
echo ============================================================
echo   VassaCRM - SAFE DEPLOY
echo   Step 1: copy latest Index.html into firebase_hosting\public
echo   Step 2: Firebase deploy
echo ============================================================
echo.
echo [1/2] Copying frontend...
copy /Y "E:\Projects\VassaCRM\Index.html" "E:\Projects\VassaCRM\firebase_hosting\public\index.html" >nul
echo       OK
echo.
echo [2/2] Deploying to Firebase...
cd /d "E:\Projects\VassaCRM\firebase_hosting"
call "E:\Projects\Attendnce\tools\firebase\node_modules\.bin\firebase.cmd" deploy --only hosting
echo.
echo Done.
pause