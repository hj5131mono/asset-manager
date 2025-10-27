// 인증 관련 JavaScript - 이메일/비밀번호 로그인

document.addEventListener('DOMContentLoaded', function() {
    initFirebase();

    // 로그인 폼 처리
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// 허용된 이메일 목록 (화이트리스트)
const ALLOWED_EMAILS = [
    'ahnhj1996@naver.com'
    // 다른 이메일을 추가하려면 여기에 추가:
    // 'partner@example.com'
];

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // 이메일 화이트리스트 체크 (로그인 시도 전)
    if (!ALLOWED_EMAILS.includes(email)) {
        errorMessage.textContent = '접근 권한이 없는 이메일입니다. 관리자에게 문의하세요.';
        errorMessage.style.display = 'block';
        console.warn('[SECURITY] 허용되지 않은 이메일 로그인 시도:', email);
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    try {
        // Firebase 이메일/비밀번호 로그인
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('[AUTH] 로그인 성공:', user.email);

        // 접근 로그 기록
        await database.ref('users/' + user.uid + '/accessLog').push({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            action: 'login',
            userAgent: navigator.userAgent,
            ip: 'client-side' // 실제 IP는 서버에서만 가능
        });

        // 마지막 로그인 시간 업데이트
        await database.ref('users/' + user.uid).update({
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            email: user.email
        });

        // 2FA 활성화 여부 확인
        const tfaSnapshot = await database.ref('users/' + user.uid + '/2fa').once('value');
        const tfaData = tfaSnapshot.val();

        if (tfaData && tfaData.enabled) {
            // 2FA 인증 페이지로 이동
            successMessage.textContent = '로그인 성공! 2단계 인증으로 이동합니다...';
            successMessage.style.display = 'block';

            setTimeout(() => {
                window.location.replace('2fa-verify.html');
            }, 1000);
        } else {
            // 2FA 미설정 시 바로 메인으로
            successMessage.textContent = '로그인 성공! 이동합니다...';
            successMessage.style.display = 'block';

            setTimeout(() => {
                window.location.replace('index.html');
            }, 1000);
        }

    } catch (error) {
        console.error('[AUTH] 로그인 오류:', error);
        loginBtn.disabled = false;
        loginBtn.textContent = '로그인';

        let errorMsg = '로그인에 실패했습니다.';
        if (error.code === 'auth/user-not-found') {
            errorMsg = '존재하지 않는 계정입니다.';
        } else if (error.code === 'auth/wrong-password') {
            errorMsg = '비밀번호가 올바르지 않습니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = '유효하지 않은 이메일 형식입니다.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg = '너무 많은 로그인 시도입니다. 잠시 후 다시 시도하세요.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
        }

        errorMessage.textContent = errorMsg;
        errorMessage.style.display = 'block';
    }
}

// 로그아웃
async function logout() {
    try {
        await auth.signOut();
        window.location.replace('login.html');
    } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃에 실패했습니다.');
    }
}
