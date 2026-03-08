@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo [설치] node_modules가 없어 npm install을 실행합니다...
  call npm install
  if errorlevel 1 (
    echo [오류] npm install 실패
    pause
    exit /b 1
  )
)

echo [실행] 개발 서버를 시작합니다...
echo 접속 주소: http://localhost:3000

call npm run dev

endlocal
