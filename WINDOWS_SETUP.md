# Windows 실행 가이드

## 1. 준비

필수 설치:

- `Node.js LTS`

확인 방법:

```bat
node -v
npm -v
```

둘 다 버전이 나오면 준비 완료입니다.

## 2. 프로젝트 받기

방법 1. Git 사용

```bat
git clone git@github.com:dasan88/consulting.git
cd consulting
```

방법 2. GitHub에서 ZIP 다운로드 후 압축 해제

압축을 풀었다면 해당 폴더를 터미널에서 열면 됩니다.

## 3. 가장 쉬운 실행 방법

프로젝트 폴더에서 아래 파일을 더블클릭하거나 터미널에서 실행:

```bat
run_windows.bat
```

동작:

- `node_modules`가 없으면 자동으로 `npm install`
- 이후 `npm run dev` 실행
- 접속 주소는 `http://localhost:3000`

가장 단순한 방식으로, 윈도우에서는 이 파일 하나만 기억하면 됩니다.

## 4. 서버 재시작

포트가 이미 사용 중이거나 서버가 꼬였을 때:

```bat
restart.bat
```

동작:

- `3000~3010` 포트 사용 프로세스 종료
- `.next` 캐시 삭제
- 개발 서버 재실행

## 5. 직접 명령어로 실행하는 방법

```bat
npm install
npm run dev
```

## 6. 접속 주소

브라우저에서:

```text
http://localhost:3000
```

## 7. 자주 생기는 문제

### `npm` 명령어가 안 보일 때

원인:

- Node.js가 설치되지 않았거나 PATH가 안 잡힘

해결:

- Node.js 재설치
- 새 터미널 다시 열기

### 포트 사용 중 오류

해결:

- `restart.bat` 실행

### 맥에서 입력한 데이터가 윈도우에 안 보일 때

원인:

- 현재 앱은 브라우저 `localStorage` 저장 방식

해결:

- 엑셀 다운로드 후 윈도우에서 다시 업로드
- 또는 샘플 데이터 생성 기능 사용

## 8. 권장 실행 순서

처음 1회:

```bat
run_windows.bat
```

이후 평소:

```bat
run_windows.bat
```

문제 생기면:

```bat
restart.bat
```
