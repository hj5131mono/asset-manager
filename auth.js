// 인증 관련 JavaScript - login.html 전용

// 페이지 로드시 Firebase 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('[LOGIN] 로그인 페이지 로드');

    if (!initFirebase()) {
        showError('Firebase 초기화에 실패했습니다. firebase-config.js 파일을 확인하세요.');
        return;
    }

    console.log('[LOGIN] Firebase 초기화 완료');

    // 구글 로그인 버튼 이벤트만 등록 (자동 리다이렉트 제거)
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', loginWithGoogle);
        console.log('[LOGIN] 로그인 버튼 이벤트 등록 완료');
    }
});

// 구글 로그인
async function loginWithGoogle() {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');

    console.log('[LOGIN] 구글 로그인 시도');

    try {
        loading.style.display = 'block';
        errorMessage.style.display = 'none';

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        console.log('[LOGIN] 로그인 성공:', user.email);

        // 사용자 정보를 데이터베이스에 저장
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            await userRef.set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        } else {
            await userRef.update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        }

        console.log('[LOGIN] 사용자 정보 저장 완료, index.html로 이동');

        // 메인 페이지로 이동
        window.location.replace('index.html');

    } catch (error) {
        console.error('[LOGIN] 로그인 오류:', error);
        loading.style.display = 'none';

        let errorMsg = '로그인에 실패했습니다.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMsg = '로그인 팝업이 닫혔습니다.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMsg = '팝업이 차단되었습니다. 브라우저 설정을 확인하세요.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMsg = 'Firebase 설정에서 이 도메인을 허용해야 합니다.';
        }

        showError(errorMsg);
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

// 에러 메시지 표시
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// 현재 사용자 정보 가져오기
function getCurrentUser() {
    return auth.currentUser;
}

// 사용자 인증 상태 확인
function isAuthenticated() {
    return auth.currentUser !== null;
}
