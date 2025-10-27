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

### 📊 대시보드의 핵심 취지

이 프로젝트는 단순한 자산 기록 도구가 아닌, **올바른 의사결정을 지원하는 분석 대시보드**입니다.

**4가지 핵심 목표:**

1. **자산 현황 파악**
   - 현재 총 자산이 얼마인가?
   - 각 자산 항목의 가치는?
   - 수익률은 어떤가?

2. **자산 증감 추이 파악**
   - 시간에 따라 자산이 어떻게 변화하는가?
   - 어느 시점에 증가/감소했는가?
   - 장기적인 성장 추세는?

3. **자산 항목별 분배 파악 (다각적 분석)**
   - **자산 유형별**: 현금/주식/채권/가상화폐
   - **국가별**: 한국/미국/기타 - 지역 분산 투자 확인
   - **통화별**: KRW/USD - 환율 리스크 파악
   - **소유자별**: 희준/영은 - 개인별 자산 관리
   - **금융사별**: 어느 기관에 자산이 집중되어 있는가?

4. **자산 성질별 분배 파악**
   - **수익성**: 고수익(주식, 가상화폐) vs 저수익(예금, 채권)
   - **유동성**: 즉시 현금화 가능한가? (유동 자산 비율)
   - **안전성**: 원금 보장 여부 (안전 자산 비율)
   - **위험도**: 전체 포트폴리오의 리스크 수준

**→ 이 정보들이 의미있고 직관적으로 보여져야 합니다.**

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

## 대시보드 개선 로드맵 (우선순위)

### 🎯 Phase 1: 다각적 분석 강화 (최우선)

**목표**: 자산을 여러 관점에서 분석할 수 있도록

#### 1.1 추가 차트 구현
- [ ] **국가별 분포 차트** (도넛 차트)
  - 한국, 미국, 기타로 분류
  - 비율과 금액 표시
  - 지역 분산 투자 현황 파악

- [ ] **통화별 분포 차트** (막대 차트)
  - KRW, USD 비중
  - 환율 리스크 노출도 파악
  - 환율 변동 시뮬레이션 기능

- [ ] **금융사별 분포 차트** (막대 차트)
  - 어느 기관에 자산이 집중되어 있는가?
  - 기관 리스크 분산 확인

#### 1.2 핵심 지표 카드 개선
현재: 총 자산만 표시
개선: 4개 핵심 지표 카드
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 총 자산      │ 전월 대비    │ 평균 수익률  │ 유동자산 비율│
│ 1.5억원      │ +3.2% ↑     │ +12.5%      │ 45%         │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 🎯 Phase 2: 자산 성질별 분류 시스템

**목표**: 수익성, 유동성, 안전성 관점에서 포트폴리오 분석

#### 2.1 자산 속성 추가
각 자산에 다음 필드 추가:
```javascript
assetProperties: {
  profitability: 'high',  // 수익성: high/medium/low
  liquidity: 'high',      // 유동성: high/medium/low
  safety: 'high',         // 안전성: high/medium/low
  riskLevel: 5            // 위험도: 1-10
}
```

#### 2.2 자동 분류 규칙
- **현금/예금**: 안전성↑ 유동성↑ 수익성↓
- **주식**: 수익성↑ 유동성↔ 안전성↓
- **채권**: 안전성↑ 수익성↓ 유동성↔
- **가상화폐**: 수익성↑ 유동성↑ 안전성↓

#### 2.3 성질별 분석 차트
- [ ] **레이더 차트** (포트폴리오 균형도)
  - 수익성, 유동성, 안전성을 한눈에
  - 이상적인 균형선과 비교

- [ ] **리스크 분포 차트**
  - 위험도별 자산 비중
  - 고위험/중위험/저위험 비율

### 🎯 Phase 3: 추이 분석 강화

**목표**: 시간대별 자산 변화를 다양한 관점에서 분석

#### 3.1 다중 시간축
현재: 일별만 지원
개선: 4가지 시간축 제공
- [ ] **일별**: 최근 30일 (현재 제공)
- [ ] **주별**: 최근 12주
- [ ] **월별**: 최근 12개월
- [ ] **연별**: 전체 기간

#### 3.2 스택 영역 차트
- [ ] 자산 유형별 추이를 쌓아서 표시
- 각 유형의 증감 추이 시각화
- 전체 대비 비율 변화 파악

#### 3.3 증감 분석
- [ ] 전월 대비 증감 금액 및 비율
- [ ] 전년 동월 대비 증감
- [ ] 증감 원인 자동 분석 (신규 입금, 수익, 손실 등)

### 🎯 Phase 4: 의사결정 인사이트 엔진

**목표**: AI 기반 포트폴리오 분석 및 조언

#### 4.1 자동 인사이트 생성
```javascript
generateInsights() {
  return [
    "✓ 현금 비율 30% - 권장 범위(20-30%) 내",
    "⚠ 해외 자산 비율 15% - 분산 투자 권장 (목표: 30%)",
    "✓ 유동성 자산 비율 45% - 양호",
    "⚠ 한국 자산 집중도 85% - 지역 분산 필요",
    "✓ 평균 수익률 12.5% - 시장 평균 상회"
  ];
}
```

#### 4.2 위험 경고
- [ ] 특정 자산/국가/통화 집중도 경고
- [ ] 유동성 부족 경고
- [ ] 환율 리스크 경고
- [ ] 수익률 하락 경고

#### 4.3 목표 설정 및 추적
- [ ] 목표 자산 금액 설정
- [ ] 자산 배분 목표 설정 (예: 주식 40%, 채권 30%, 현금 30%)
- [ ] 목표 대비 현황 시각화
- [ ] 목표 달성률 및 예상 달성 시기

### 🎯 Phase 5: 기타 개선사항

- [ ] 실시간 주가/코인 시세 연동 (Yahoo Finance API)
- [ ] 계좌별 상세 분석 페이지
- [ ] 월별/연도별 리포트 자동 생성 (PDF 다운로드)
- [ ] 알림 기능 (목표 달성, 급등/급락)
- [ ] 다크 모드
- [ ] PWA 지원 (오프라인, 홈 화면 추가)
- [ ] 자동 백업/복원 기능
- [ ] 다국어 지원 (영어, 일본어)

---

## 현재 대시보드 vs 목표 대시보드

### 현재 (v2.0)
```
- 총 자산 금액
- 자산 유형별 금액 (4개)
- 파이 차트 1개 (유형별)
- 라인 차트 1개 (일별 추이)
- 소유자 필터링
```

### 목표 (v3.0)
```
┌─────────────────────────────────────────────┐
│ 핵심 지표 4개 (총자산, 증감, 수익률, 유동성)  │
└─────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┐
│ 유형별    │ 국가별    │ 통화별    │ 금융사별  │
│ 파이      │ 도넛      │ 막대      │ 막대      │
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────────────────────────────┐
│ 성질별 분석 (레이더 차트)                    │
│ 수익성 / 유동성 / 안전성                     │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 추이 분석 (다중 시간축)                      │
│ [일별] [주별] [월별] [연별]                  │
│ 스택 영역 차트 (유형별 추이)                 │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 💡 의사결정 인사이트 (5-10개)                │
│ - 포트폴리오 균형 평가                       │
│ - 리스크 경고                                 │
│ - 개선 제안                                   │
└─────────────────────────────────────────────┘
```

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
