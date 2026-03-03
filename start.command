#!/bin/zsh

cd /Users/min/Desktop/consulting || exit 1

if [ ! -d node_modules ]; then
  echo "[설치] node_modules가 없어 npm install을 실행합니다..."
  npm install || exit 1
fi

echo "[실행] 개발 서버를 시작합니다..."
echo "접속 주소: http://localhost:3000"

npm run dev
