# 자산 관리 대시보드 - Claude Code 가이드

이 문서는 Claude Code가 이 프로젝트를 효과적으로 이해하고 작업할 수 있도록 작성되었습니다.

## 프로젝트 개요

**프로젝트명**: 자산 관리 대시보드
**타입**: 웹 애플리케이션 (SPA)
**주요 기능**: 개인/가족 자산 관리, 실시간 동기화, 시각화
**배포**: GitHub Pages
**데이터베이스**: Firebase Realtime Database
**인증**: Firebase Authentication (이메일/비밀번호)
**보안 수준**: 🔒🔒🔒 최고 (은행 수준 - 2FA, 세션 관리, 접근 제한)

### 핵심 기능
- 💰 현금/예금, 📈 주식/ETF, 💎 채권/원자재, ₿ 가상화폐 관리
- 계정(account) 기반 자산 분류 및 관리
- 소유자별 필터링 (희준/영은)
- 실시간 환율 조회 및 USD ↔ KRW 변환
- Excel/CSV 템플릿 기반 대량 업로드/다운로드
- 수익률 자동 계산 (투자원금 대비)
- Chart.js를 통한 자산 분포 및 추이 시각화
- 특정 이메일(ahnhj1996@naver.com)만 접근 가능

## 파일 구조

```
asset-manager/
├── index.html              # 메인 대시보드 (자산 요약 + 차트)
├── accounts.html           # 계좌 관리 페이지 (계좌 CRUD)
├── account-detail.html     # 계좌 상세 페이지 (자산 항목 관리)
├── login.html              # 로그인 페이지
├── signup.html             # 회원가입 리다이렉트 (비활성화)
├── signup-disabled.html    # 회원가입 비활성화 안내
├── 2fa-setup.html          # 2단계 인증 설정
├── 2fa-verify.html         # 2단계 인증 검증
├── asset-template.html     # Excel 템플릿 생성/다운로드
├── import-google-sheet.html # Google Sheets 연동 (선택)
│
├── script.js               # 메인 로직 (자산 관리, 차트, 환율)
├── auth.js                 # 인증 로직 (이메일 화이트리스트, 로그인)
├── 2fa.js                  # 2단계 인증 설정 로직 (TOTP 생성)
├── 2fa-verify.js           # 2단계 인증 검증 로직
├── session-manager.js      # 세션 타임아웃 관리 (15분)
├── firebase-config.js      # Firebase 설정
├── style.css               # 전역 스타일
│
├── README.md               # 사용자용 설명서
├── DEPLOY.md               # 배포 가이드
├── SECURITY.md             # 보안 설정 가이드 (필수 읽기)
└── CLAUDE.md               # 이 파일 (개발자/AI 가이드)
```

## 기술 스택

### 프론트엔드
- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox/Grid, 반응형 디자인
- **JavaScript (ES6+)**: Vanilla JS (프레임워크 없음)
- **Chart.js**: 파이 차트, 라인 차트

### 백엔드/인프라
- **Firebase Authentication**: Google OAuth 로그인
- **Firebase Realtime Database**: NoSQL 실시간 DB
- **GitHub Pages**: 정적 호스팅
- **ExchangeRate-API**: 무료 환율 API

## 데이터 구조

### Firebase Database 스키마

```javascript
{
  // 계좌 목록
  "accounts": [
    {
      "id": "unique-id",
      "name": "신한 주식계좌",
      "owner": "희준",
      "type": "stock",           // cash, stock, crypto, realEstate
      "institution": "신한투자증권",
      "country": "한국"
    }
  ],

  // 자산 항목 (계좌별)
  "assets": {
    "cash": [
      {
        "owner": "희준",
        "country": "한국",
        "institution": "신한은행",
        "accountType": "예금",
        "assetType": "cash",
        "liquidity": "유동",
        "name": "정기예금",
        "currency": "KRW",
        "amount": 5000000,
        "ticker": null,
        "quantity": null,
        "purchasePrice": null,
        "purchaseAmount": null,
        "note": "6개월 만기",
        "updatedAt": "2025-10-25T12:34:56.789Z"
      }
    ],
    "stock": [
      {
        "owner": "영은",
        "country": "미국",
        "institution": "미래에셋",
        "accountType": "증권",
        "assetType": "stock",
        "liquidity": "유동",
        "name": "애플",
        "ticker": "AAPL",
        "currency": "USD",
        "quantity": 10,
        "purchasePrice": 150,
        "purchaseAmount": 1500,    // USD
        "amount": 1800,             // USD (현재 평가액)
        "note": "장기보유",
        "updatedAt": "2025-10-25T12:34:56.789Z"
      }
    ]
  },

  // 자산 추이 히스토리
  "history": {
    "2025-10-25": 125000000,  // 해당 날짜의 총 자산
    "2025-10-26": 126500000
  }
}
```

### 핵심 필드 설명
- **owner**: "희준" | "영은" (소유자 필터링에 사용)
- **currency**: "KRW" | "USD" (환율 변환 기준)
- **liquidity**: "유동" | "비유동" (유동성 구분)
- **ticker**: 주식/ETF 심볼 (예: AAPL, 005930.KS)
- **quantity**: 보유 수량 (주식/암호화폐)
- **purchaseAmount**: 투자원금 (수익률 계산 기준)
- **amount**: 현재 평가금액 (실시간 업데이트)

## 주요 함수 설명

### script.js 핵심 함수

```javascript
// 초기화
initializeApp()              // 앱 전체 초기화
initCharts()                 // Chart.js 초기화
setupFirebaseListeners()     // Firebase 실시간 리스너 등록

// 데이터 관리
updateDashboard()            // 대시보드 전체 업데이트
calculateTotal()             // 총 자산 계산
calculateCategoryTotal()     // 카테고리별 합계
saveToFirebase()             // Firebase에 저장

// 필터링/정렬
filterByOwner(owner)         // 소유자 필터 ("희준"|"영은"|"all")
calculateCategoryTotalFiltered()  // 필터 적용한 합계

// 환율/변환
fetchExchangeRate(date)      // API에서 환율 조회
convertToKRW(amount, currency)  // 원화로 변환

// 수익률
calculateReturn(current, purchase, currency)  // 수익률 계산

// 파일 처리
handleExcelUpload(event)     // Excel/CSV 파일 업로드
parseExcelData(text)         // 파일 파싱
exportToExcel()              // Excel 다운로드
```

### auth.js
```javascript
initFirebase()               // Firebase 앱 초기화
auth.onAuthStateChanged()    // 로그인 상태 감지
auth.signInWithPopup()       // Google 로그인
auth.signOut()               // 로그아웃
```

## 개발 가이드

### 로컬 개발 환경 설정

```bash
# 프로젝트 클론
git clone https://github.com/hj5131mono/asset-manager
cd asset-manager

# 로컬 서버 실행 (Python 3)
python3 -m http.server 8000

# 브라우저에서 접속
# http://localhost:8000/login.html
```

### Firebase 설정 확인

`firebase-config.js` 파일이 올바르게 설정되어 있는지 확인:
- API Key
- Auth Domain
- Database URL
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID

### 보안 규칙

Firebase Realtime Database 보안 규칙:
```json
{
  "rules": {
    ".read": "auth != null && auth.token.email == 'ahnhj1996@naver.com'",
    ".write": "auth != null && auth.token.email == 'ahnhj1996@naver.com'"
  }
}
```

## 일반적인 작업 시나리오

### 1. 새로운 자산 카테고리 추가
1. `index.html`: 카드 추가 (summary-cards 섹션)
2. `script.js`: assets 객체에 새 카테고리 추가
3. `script.js`: calculateCategoryTotal에 추가
4. `script.js`: 차트 라벨/색상 추가

### 2. 새로운 필드 추가
1. `index.html`: 모달 폼에 input 추가
2. `script.js`: handleFormSubmit에서 필드 읽기
3. `script.js`: assetData 객체에 추가
4. `script.js`: editAsset에서 값 설정
5. `asset-template.html`: 템플릿 컬럼 추가

### 3. 차트 커스터마이징
1. `script.js`: initCharts() 함수 수정
2. Chart.js 옵션 변경 (색상, 레이블, 타입 등)
3. `style.css`: chart-container 스타일 조정

### 4. 환율 API 변경
1. `script.js`: fetchExchangeRate() 함수 수정
2. API URL 및 응답 파싱 로직 변경
3. exchangeRates 객체 구조 조정 (필요시)

### 5. 접근 권한 이메일 추가
1. `script.js` (31-46줄): allowedEmails 배열에 이메일 추가
2. Firebase 보안 규칙 업데이트 (필요시)

## 디버깅 팁

### 브라우저 콘솔 로그
- `[INIT]`: 초기화 과정
- `[AUTH]`: 인증 관련
- `[FIREBASE]`: Firebase 데이터 수신
- `[SAVE]`: 데이터 저장
- `[DATE]`: 기준일자 변경
- `[EXCHANGE]`: 환율 조회
- `[FILTER]`: 필터 적용
- `[UPLOAD]`: 파일 업로드

### 일반적인 문제

**로그인 안 됨**
→ firebase-config.js 설정 확인
→ Firebase Console에서 도메인 승인

**데이터 저장/로드 안 됨**
→ Firebase Database 보안 규칙 확인
→ 브라우저 콘솔에서 에러 확인

**차트 표시 안 됨**
→ Chart.js CDN 로드 확인
→ 인터넷 연결 확인

**환율 조회 실패**
→ ExchangeRate-API 응답 확인
→ 기본값(1350) 사용됨

**Excel 업로드 안 됨**
→ 템플릿 형식 준수 확인
→ 탭 구분자(\t) 사용 확인

## 배포 프로세스

### GitHub Pages 배포
```bash
# 변경사항 커밋
git add .
git commit -m "작업 내용"

# GitHub에 푸시
git push origin main

# GitHub Pages는 자동으로 배포됨
# https://hj5131mono.github.io/asset-manager/
```

### 배포 전 체크리스트
- [ ] firebase-config.js 설정 확인
- [ ] 승인된 도메인 추가 (Firebase Console)
- [ ] 로컬 테스트 완료
- [ ] 콘솔 에러 없는지 확인
- [ ] 모바일 반응형 테스트

## 코딩 컨벤션

### JavaScript
- 함수명: camelCase (예: `updateDashboard`)
- 상수: UPPER_SNAKE_CASE (예: `ALLOWED_EMAILS`)
- async/await 사용 (Promise보다 선호)
- console.log에 접두사 사용 (`[CATEGORY] 메시지`)

### HTML
- 의미 있는 ID/class 이름
- 버튼에 onclick 사용 (간단한 액션)
- form에는 addEventListener 사용

### CSS
- Flexbox/Grid 활용
- 반응형: @media (max-width: 768px)
- 색상 변수 사용 권장

## 향후 개선 아이디어

- [ ] 실시간 주가/코인 시세 연동 (Yahoo Finance API)
- [ ] 계좌별 상세 분석 (수익률 차트, 구성 비중)
- [ ] 월별/연도별 통계 및 리포트
- [ ] 목표 자산 설정 및 달성률
- [ ] 알림 기능 (목표 달성, 급등/급락)
- [ ] 다크 모드
- [ ] PWA 지원 (오프라인, 홈 화면 추가)
- [ ] 백업/복원 기능
- [ ] 다국어 지원 (영어, 일본어)

## 보안 아키텍처 (중요!)

### 🔒 구현된 보안 기능

#### 1. 다중 레이어 보안
```
사용자 → 이메일 화이트리스트 → Firebase Auth → 2FA → 세션 검증 → Firebase Rules → 데이터
```

#### 2. 인증 계층
- **1계층**: 이메일 화이트리스트 (auth.js, script.js)
  - `ALLOWED_EMAILS` 배열로 관리
  - 로그인 시도 전 체크
  - 권한 없는 이메일 차단

- **2계층**: Firebase Authentication
  - 이메일/비밀번호 방식
  - Firebase에서 비밀번호 암호화 저장
  - Too-many-requests 자동 차단

- **3계층**: 2단계 인증 (TOTP)
  - Google Authenticator 호환
  - RFC 6238 표준 구현
  - 30초 간격 코드 생성
  - ±30초 시간 오차 허용
  - 1시간마다 재인증

- **4계층**: 세션 관리
  - 15분 무활동 시 자동 로그아웃
  - 13분에 경고 메시지
  - 활동 감지 (마우스, 키보드, 터치)
  - 세션 데이터 자동 정리

#### 3. 데이터 접근 제어

**Firebase Realtime Database 보안 규칙 (필수 설정)**:
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "assets": {
      ".read": "auth != null && auth.token.email == 'ahnhj1996@naver.com'",
      ".write": "auth != null && auth.token.email == 'ahnhj1996@naver.com'"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

#### 4. 접근 로그
모든 중요 행동이 Firebase에 기록됨:
- 로그인/로그아웃
- 2FA 인증
- 자동 타임아웃
- UserAgent 정보

위치: `users/{uid}/accessLog/`

#### 5. 회원가입 제한
- `signup.html` → 비활성화 페이지로 리다이렉트
- 관리자가 Firebase Console에서 수동으로 사용자 추가
- 초대된 사용자만 접근 가능

### 🚨 보안 체크리스트

**배포 전 필수 확인:**
- [ ] Firebase Database 보안 규칙 설정 완료 (SECURITY.md 참고)
- [ ] `auth.js`의 `ALLOWED_EMAILS`에 본인 이메일 추가
- [ ] `script.js`의 `allowedEmails`에 본인 이메일 추가
- [ ] Firebase Console에서 승인된 도메인 추가
- [ ] 회원가입 페이지 비활성화 확인
- [ ] 2FA 설정 페이지 접근 가능 확인

**정기 확인 (월 1회):**
- [ ] 접근 로그 검토 (`users/{uid}/accessLog`)
- [ ] 비밀번호 변경 (3개월마다)
- [ ] Firebase 프로젝트 활동 확인
- [ ] 세션 타임아웃 동작 테스트

### ⚠️ 알려진 제한사항

1. **Firebase API 키 노출**
   - GitHub에 API 키가 공개됨
   - 하지만 Firebase 보안 규칙으로 보호됨
   - API 키 자체는 공개되어도 안전 (Firebase 공식 입장)

2. **IP 주소 로깅 불가**
   - 클라이언트 측에서는 실제 IP 확인 불가
   - UserAgent만 로깅됨

3. **브라우저 의존성**
   - sessionStorage/localStorage 사용
   - 쿠키 차단 시 세션 관리 안 됨

### 🔐 2FA 사용 가이드

**설정 방법:**
1. 로그인 후 `2fa-setup.html` 접속
2. Google Authenticator 앱 설치
3. QR 코드 스캔 또는 수동 입력
4. 6자리 코드 입력하여 활성화

**지원 앱:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password

**비활성화:**
- Firebase Console → Database → `users/{uid}/2fa` 삭제
- 또는 관리자에게 요청

### 🛡️ 보안 사고 대응

**계정 탈취 의심 시:**
1. 즉시 Firebase Console 접속
2. Authentication → 해당 사용자 선택 → "사용자 비활성화"
3. Database → `users/{uid}/accessLog` 확인
4. 비밀번호 재설정
5. 2FA 재설정

**데이터 유출 의심 시:**
1. Database 보안 규칙 재확인
2. 모든 사용자 강제 로그아웃
3. 접근 로그 분석
4. 필요시 Firebase 프로젝트 재생성

## 참고 링크

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firebase 보안 규칙](https://firebase.google.com/docs/database/security)
- [Chart.js 문서](https://www.chartjs.org/docs/latest/)
- [ExchangeRate-API](https://www.exchangerate-api.com/)
- [GitHub Pages 가이드](https://docs.github.com/en/pages)
- [RFC 6238 (TOTP 표준)](https://tools.ietf.org/html/rfc6238)

---

**작성일**: 2025-10-28
**버전**: 2.0
**최종 업데이트**: 보안 강화 완료 (2FA, 세션 관리, 접근 제한)
**보안 수준**: 🔒🔒🔒 최고 (은행 수준)
