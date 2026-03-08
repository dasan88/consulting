@echo off
setlocal

cd /d "%~dp0"

title Consulting Dashboard - Windows Quick Start

echo ==========================================
echo   상담 기록 관리 웹앱 Windows 실행
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않거나 PATH가 잡히지 않았습니다.
  echo.
  echo 먼저 Node.js LTS를 설치한 뒤 다시 실행하세요.
  echo 다운로드: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [오류] npm을 찾을 수 없습니다.
  echo Node.js 설치 후 새 터미널에서 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [설치] 처음 실행이라 의존성을 설치합니다...
  call npm install
  if errorlevel 1 (
    echo.
    echo [오류] npm install 실패
    pause
    exit /b 1
  )
)

echo.
echo [실행] 개발 서버를 시작합니다...
echo 접속 주소: http://localhost:3000
echo 종료하려면 이 창에서 Ctrl + C 를 누르세요.
echo.

call npm run dev

endlocal
