@echo off
chcp 65001 > nul
title AlphaQuant Stock Screener Launcher

echo ========================================================
echo   🚀 AlphaQuant 주식 분석 및 스크리너 웹앱 실행기
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 백엔드 REST API 서버 시작 중... (Port 5000)
start "AlphaQuant API Server" cmd /c "cd server && node server.js"

echo [2/2] 프론트엔드 웹앱 시작 중... (Port 5173)
start "AlphaQuant Frontend" cmd /c "cd frontend && npm.cmd run dev"

timeout /t 3 > nul

echo.
echo ✅ 브라우저를 엽니다: http://localhost:5173
start http://localhost:5173

echo.
echo ========================================================
echo   웹앱이 백그라운드에서 구동 중입니다.
echo   종료하려면 실행된 2개의 터미널 창을 닫아주세요.
echo ========================================================
exit
