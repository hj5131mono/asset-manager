# Firebase + GitHub Pages 배포 가이드

이 가이드는 자산 관리 웹앱을 Firebase와 GitHub Pages를 사용하여 배포하는 방법을 설명합니다.

## 1단계: Firebase 프로젝트 생성

### 1.1 Firebase 콘솔 접속
1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "asset-manager")
4. Google 애널리틱스는 선택사항 (필요하면 활성화)
5. "프로젝트 만들기" 클릭

### 1.2 Firebase Authentication 설정
1. 좌측 메뉴에서 "빌드" → "Authentication" 클릭
2. "시작하기" 클릭
3. "Sign-in method" 탭에서 "Google" 선택
4. "사용 설정" 토글 활성화
5. 프로젝트 지원 이메일 선택
6. "저장" 클릭

### 1.3 Firebase Realtime Database 설정
1. 좌측 메뉴에서 "빌드" → "Realtime Database" 클릭
2. "데이터베이스 만들기" 클릭
3. 위치 선택 (가까운 지역, 예: asia-southeast1)
4. 보안 규칙에서 **"테스트 모드에서 시작"** 선택 (나중에 수정 예정)
5. "사용 설정" 클릭

### 1.4 보안 규칙 설정 (중요!)
"Realtime Database" → "규칙" 탭에서 다음 규칙으로 변경:

```json
{
  "rules": {
    "assets": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "history": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

이 규칙은 로그인한 사용자만 데이터를 읽고 쓸 수 있게 합니다.

**더 강력한 보안 (두 사람만 접근 가능):**

```json
{
  "rules": {
    ".read": "auth != null && (auth.token.email == 'your-email@gmail.com' || auth.token.email == 'partner-email@gmail.com')",
    ".write": "auth != null && (auth.token.email == 'your-email@gmail.com' || auth.token.email == 'partner-email@gmail.com')"
  }
}
```

위 규칙에서 `your-email@gmail.com`과 `partner-email@gmail.com`을 실제 이메일 주소로 변경하세요.

### 1.5 Firebase 설정 가져오기
1. 프로젝트 설정 (톱니바퀴 아이콘) → "프로젝트 설정" 클릭
2. 아래로 스크롤하여 "내 앱" 섹션에서 웹 아이콘(`</>`) 클릭
3. 앱 닉네임 입력 (예: "asset-manager-web")
4. "Firebase Hosting 설정" 체크박스는 해제
5. "앱 등록" 클릭
6. `firebaseConfig` 객체 복사

### 1.6 firebase-config.js 파일 수정
복사한 설정값으로 `firebase-config.js` 파일을 수정:

```javascript
const firebaseConfig = {
    apiKey: "실제-API-KEY",
    authDomain: "프로젝트명.firebaseapp.com",
    databaseURL: "https://프로젝트명-default-rtdb.firebaseio.com",
    projectId: "프로젝트명",
    storageBucket: "프로젝트명.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 1.7 이메일 제한 설정 (선택사항)
`firebase-config.js` 파일에서 허용할 이메일 주소 추가:

```javascript
const allowedEmails = [
    'your-email@gmail.com',
    'partner-email@gmail.com'
];
```

## 2단계: GitHub 저장소 생성 및 코드 업로드

### 2.1 GitHub 저장소 생성
1. https://github.com 로그인
2. 우측 상단 "+" → "New repository" 클릭
3. Repository name 입력 (예: "asset-manager")
4. Public 선택 (GitHub Pages는 Public 저장소 필요)
5. "Create repository" 클릭

### 2.2 로컬 Git 설정 및 푸시
터미널에서 다음 명령어 실행:

```bash
cd ~/asset-manager

# Git 초기화
git init

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Asset manager with Firebase"

# GitHub 저장소 연결 (YOUR-USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR-USERNAME/asset-manager.git

# 푸시
git branch -M main
git push -u origin main
```

## 3단계: GitHub Pages 설정

### 3.1 GitHub Pages 활성화
1. GitHub 저장소 페이지에서 "Settings" 클릭
2. 좌측 메뉴에서 "Pages" 클릭
3. "Source"에서 "Deploy from a branch" 선택
4. Branch는 "main" 선택, 폴더는 "/ (root)" 선택
5. "Save" 클릭

### 3.2 배포 확인
- 몇 분 후 `https://YOUR-USERNAME.github.io/asset-manager/` 에서 접속 가능
- "Actions" 탭에서 배포 진행상황 확인 가능

## 4단계: Firebase 승인된 도메인 추가

### 4.1 도메인 승인
1. Firebase 콘솔 → "Authentication" → "Settings" 탭
2. "승인된 도메인" 섹션에서 "도메인 추가" 클릭
3. GitHub Pages URL 추가: `YOUR-USERNAME.github.io`
4. "추가" 클릭

## 5단계: 테스트

### 5.1 웹앱 접속
1. `https://YOUR-USERNAME.github.io/asset-manager/login.html` 접속
2. "Google로 로그인" 버튼 클릭
3. Google 계정으로 로그인
4. 로그인 성공 후 대시보드 페이지로 이동되는지 확인

### 5.2 기능 테스트
1. 자산 추가/수정/삭제 테스트
2. 다른 브라우저나 기기에서 같은 계정으로 로그인하여 데이터 동기화 확인
3. 예비 배우자분도 로그인하여 같은 데이터가 보이는지 확인

## 문제 해결

### 로그인 팝업이 차단되는 경우
- 브라우저 설정에서 팝업 차단 해제
- 또는 브라우저 주소창 오른쪽 팝업 아이콘 클릭하여 허용

### "unauthorized-domain" 오류
- Firebase 콘솔에서 승인된 도메인에 GitHub Pages URL이 추가되었는지 확인
- `localhost`와 `127.0.0.1`도 승인된 도메인에 있어야 로컬 테스트 가능

### 데이터가 저장되지 않는 경우
- Firebase Realtime Database 보안 규칙 확인
- 브라우저 개발자 도구(F12) → Console 탭에서 오류 메시지 확인

### 로그인은 되지만 데이터 접근 불가
- Firebase Database 보안 규칙에서 이메일 주소가 올바른지 확인
- 보안 규칙 수정 후 저장했는지 확인

## 코드 업데이트 방법

코드를 수정한 후:

```bash
cd ~/asset-manager
git add .
git commit -m "업데이트 내용 설명"
git push
```

GitHub Pages는 자동으로 새 버전을 배포합니다 (1-2분 소요).

## 보안 주의사항

1. **Firebase 설정 파일 공개**: `firebase-config.js` 파일의 API 키는 공개되어도 괜찮습니다. Firebase 보안 규칙과 인증으로 보호됩니다.

2. **보안 규칙 검토**: Firebase Database 보안 규칙을 정기적으로 검토하세요.

3. **이메일 제한**: 중요한 금융 정보이므로 허용된 이메일 주소만 접근하도록 설정하는 것을 권장합니다.

4. **HTTPS**: GitHub Pages는 자동으로 HTTPS를 제공하므로 보안 연결이 보장됩니다.

## 비용

- **Firebase**: 무료 Spark 플랜으로 충분합니다 (일일 10만 읽기, 2만 쓰기)
- **GitHub Pages**: 완전 무료

---

배포 완료 후 URL을 예비 배우자분과 공유하시면 됩니다!

문제가 발생하면 Firebase Console과 브라우저 개발자 도구의 Console 탭을 확인하세요.
