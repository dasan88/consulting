#!/bin/zsh

cd /Users/min/Desktop/consulting || exit 1

if [ ! -d node_modules ]; then
  echo "[설치] node_modules가 없어 npm install을 실행합니다..."
  npm install || exit 1
fi

echo "[재시작] 기존 개발 서버를 확인합니다..."
# 이전에 떠 있던 next dev 세션을 먼저 정리
pkill -f "next dev" 2>/dev/null || true
sleep 1

PIDS=$(lsof -ti tcp:3000-3010)

if [ -n "$PIDS" ]; then
  echo "[중지] 3000~3010 포트 프로세스 종료: $PIDS"
  kill $PIDS 2>/dev/null
  sleep 1

  STILL_RUNNING=$(lsof -ti tcp:3000-3010)
  if [ -n "$STILL_RUNNING" ]; then
    echo "[강제중지] 남아있는 프로세스를 강제 종료합니다: $STILL_RUNNING"
    kill -9 $STILL_RUNNING 2>/dev/null
  fi
else
  echo "[중지] 실행 중인 3000~3010 포트 서버가 없습니다."
fi

# 손상된 개발 캐시로 인한 모듈 누락 오류 방지
rm -rf .next

echo "[실행] 개발 서버를 시작합니다..."
echo "접속 주소: http://localhost:3000"
npm run dev
