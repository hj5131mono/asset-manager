// 인증 관련 JavaScript

// 리다이렉트 중복 방지 플래그
let isRedirecting = false;

// 페이지 로드시 Firebase 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (!initFirebase()) {
        showError('Firebase 초기화에 실패했습니다. firebase-config.js 파일을 확인하세요.');
        return;
    }

    // 이미 로그인되어 있는지 확인
    auth.onAuthStateChanged(user => {
        if (user && !isRedirecting) {
            // 이미 로그인되어 있으면 메인 페이지로 이동
            isRedirecting = true;
            window.location.replace('index.html');
        }
    });

    // 구글 로그인 버튼 이벤트
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', loginWithGoogle);
    }
});

// 구글 로그인
async function loginWithGoogle() {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');

    try {
        loading.style.display = 'block';
        errorMessage.style.display = 'none';

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        console.log('로그인 성공:', user.email);

        // 사용자 정보를 데이터베이스에 저장 (첫 로그인시)
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
            // 마지막 로그인 시간 업데이트
            await userRef.update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        }

        // 메인 페이지로 이동
        window.location.href = 'index.html';

    } catch (error) {
        console.error('로그인 오류:', error);
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
        window.location.href = 'login.html';
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
