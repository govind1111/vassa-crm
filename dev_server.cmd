@echo off
chcp 65001 >nul
title VassaCRM Local Dev Server
cd /d "E:\Projects\VassaCRM\preview"
echo ============================================================
echo   VassaCRM - LOCAL PREVIEW (no deploy)
echo ============================================================
echo   CRM (mock backend): http://localhost:8765/index.html
echo   Press Ctrl+C to stop.
echo ============================================================
python -m http.server 8765
pause