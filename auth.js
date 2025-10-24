// 인증 관련 JavaScript - 이메일/비밀번호 로그인

document.addEventListener('DOMContentLoaded', function() {
    initFirebase();

    // 로그인 폼 처리
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

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

    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    try {
        // Firebase 이메일/비밀번호 로그인
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('로그인 성공:', user.email);

        // 마지막 로그인 시간 업데이트
        await database.ref('users/' + user.uid).update({
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        });

        successMessage.textContent = '로그인 성공! 이동합니다...';
        successMessage.style.display = 'block';

        // index.html로 이동
        setTimeout(() => {
            window.location.replace('index.html');
        }, 1000);

    } catch (error) {
        console.error('로그인 오류:', error);
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
