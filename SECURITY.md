# 보안 설정 가이드

## ⚠️ 중요: 이 가이드를 반드시 따라 설정하세요!

자산 관리 시스템은 매우 민감한 금융 데이터를 다루므로 최고 수준의 보안이 필요합니다.

---

## 1. Firebase Database 보안 규칙 설정 (필수)

### 설정 방법
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `finance-hj-bf424`
3. 왼쪽 메뉴 → **Realtime Database** → **규칙** 탭 클릭
4. 아래 규칙을 복사해서 붙여넣기

### 보안 규칙 (엄격한 버전)

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "assets": {
      ".read": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')",
      ".write": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')"
    },

    "accounts": {
      ".read": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')",
      ".write": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')"
    },

    "history": {
      ".read": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')",
      ".write": "auth != null && (auth.token.email == 'ahnhj1996@naver.com')"
    },

    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid",

        "2fa": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && auth.uid == $uid"
        },

        "accessLog": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && auth.uid == $uid"
        }
      }
    }
  }
}
```

### 이메일 추가하는 방법
다른 이메일을 허용하려면:
```json
".read": "auth != null && (auth.token.email == 'ahnhj1996@naver.com' || auth.token.email == 'partner@example.com')",
".write": "auth != null && (auth.token.email == 'ahnhj1996@naver.com' || auth.token.email == 'partner@example.com')"
```

---

## 2. Firebase Authentication 설정

### 2-1. 이메일 인증 활성화
1. Firebase Console → **Authentication** → **Sign-in method**
2. **이메일/비밀번호** 활성화
3. **이메일 인증 필요** 옵션 활성화 (권장)

### 2-2. 승인된 도메인 확인
1. Firebase Console → **Authentication** → **Settings** → **승인된 도메인**
2. 다음 도메인이 있는지 확인:
   - `hj5131mono.github.io`
   - `localhost` (로컬 테스트용)

### 2-3. 비밀번호 정책 강화
1. Firebase Console → **Authentication** → **Settings** → **비밀번호 정책**
2. 권장 설정:
   - 최소 길이: 12자
   - 대소문자 혼합 필수
   - 숫자 포함 필수
   - 특수문자 포함 필수

---

## 3. 2단계 인증 (2FA) 활성화

이 프로젝트는 TOTP 기반 2단계 인증을 지원합니다.

### 사용자 설정 방법
1. 로그인 후 설정 페이지 접속
2. "2단계 인증 활성화" 클릭
3. QR 코드를 Google Authenticator 또는 Authy 앱으로 스캔
4. 6자리 코드 입력하여 활성화

### 지원 앱
- Google Authenticator (iOS, Android)
- Microsoft Authenticator
- Authy
- 1Password

---

## 4. 회원가입 제한

### 옵션 A: 완전 비활성화 (권장)
- `signup.html` 접근 차단
- 로그인 페이지에서 회원가입 링크 제거
- Firebase Console에서 직접 사용자 추가

### 옵션 B: 초대 코드 방식
- 관리자가 초대 코드 생성
- 초대 코드 없이는 회원가입 불가

**현재 설정:** 옵션 A (완전 비활성화)

---

## 5. 보안 기능 요약

### 구현된 보안 기능
- ✅ Firebase Database 이메일 기반 접근 제한
- ✅ 2단계 인증 (TOTP)
- ✅ 세션 타임아웃 (15분 무활동 시 자동 로그아웃)
- ✅ 접근 로그 기록 (IP, 시간, 디바이스)
- ✅ 회원가입 비활성화
- ✅ 이메일 화이트리스트 (코드 레벨)
- ✅ HTTPS 강제 (GitHub Pages 기본)
- ✅ XSS 방지 (입력값 검증)
- ✅ 비밀번호 Firebase에서 암호화 저장

### 추가 권장 사항
- 📱 로그인 알림 (이메일/SMS)
- 🔐 비밀번호 정기 변경 안내
- 📊 접근 로그 정기 검토
- 💾 데이터 정기 백업
- 🔄 Firebase 프로젝트 정기 감사

---

## 6. Firebase Console에서 사용자 추가하는 방법

회원가입이 비활성화되어 있으므로 관리자가 직접 추가해야 합니다.

1. Firebase Console → **Authentication** → **Users** 탭
2. **사용자 추가** 클릭
3. 이메일과 비밀번호 입력
4. 사용자에게 임시 비밀번호 전달
5. 첫 로그인 시 비밀번호 변경 안내

---

## 7. 보안 체크리스트

### 즉시 확인 (필수)
- [ ] Firebase Database 보안 규칙 설정 완료
- [ ] 승인된 도메인에 `hj5131mono.github.io` 추가
- [ ] 이메일 화이트리스트에 본인 이메일 추가
- [ ] 회원가입 페이지 비활성화 확인

### 정기 확인 (월 1회)
- [ ] 접근 로그 검토
- [ ] 비밀번호 변경 (3개월마다)
- [ ] Firebase 프로젝트 활동 로그 확인
- [ ] 데이터 백업 수행

### 사고 발생 시
1. 즉시 Firebase Console에서 모든 사용자 로그아웃
2. 비밀번호 재설정
3. 접근 로그 확인
4. Firebase API 키 교체 (필요시)
5. 보안 규칙 재점검

---

## 8. 문제 해결

### "Permission denied" 에러
→ Firebase 보안 규칙 확인
→ 로그인한 이메일이 화이트리스트에 있는지 확인

### 2FA 코드가 맞지 않음
→ 시스템 시간 동기화 확인
→ Google Authenticator 시간 동기화

### 로그인 후 바로 로그아웃됨
→ 브라우저 쿠키 확인
→ Firebase Session 설정 확인

---

## 9. 연락처

보안 관련 문제 발견 시:
- 즉시 Firebase Console에서 사용자 접근 차단
- GitHub Issues에 보안 이슈 등록 (민감정보 제외)

---

**마지막 업데이트**: 2025-10-28
**보안 수준**: 🔒🔒🔒 최고 (은행 수준)
