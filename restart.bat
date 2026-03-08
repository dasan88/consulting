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

echo [재시작] 기존 개발 서버를 확인합니다...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":300[0-9] .*LISTENING"') do (
  echo [중지] 포트 점유 프로세스 종료: %%p
  taskkill /PID %%p /F >nul 2>&1
)

if exist .next (
  echo [정리] .next 캐시를 삭제합니다...
  rmdir /s /q .next
)

echo [실행] 개발 서버를 시작합니다...
echo 접속 주소: http://localhost:3000

call npm run dev

endlocal
