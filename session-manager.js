// 세션 타임아웃 관리

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15분 (밀리초)
const WARNING_TIME = 13 * 60 * 1000;    // 13분 (2분 전 경고)

let lastActivity = Date.now();
let timeoutWarningShown = false;
let logoutTimer = null;
let warningTimer = null;

// 활동 감지 이벤트
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

// 세션 관리 초기화
function initSessionManagement() {
    console.log('[SESSION] 세션 관리 시작 (타임아웃: 15분)');

    // 활동 감지
    activityEvents.forEach(event => {
        document.addEventListener(event, resetSessionTimer, true);
    });

    // 초기 타이머 설정
    resetSessionTimer();

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        clearSessionTimers();
    });
}

// 세션 타이머 리셋
function resetSessionTimer() {
    lastActivity = Date.now();
    timeoutWarningShown = false;

    // 기존 타이머 제거
    clearSessionTimers();

    // 새 타이머 설정
    warningTimer = setTimeout(showTimeoutWarning, WARNING_TIME);
    logoutTimer = setTimeout(autoLogout, SESSION_TIMEOUT);
}

// 타이머 제거
function clearSessionTimers() {
    if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
    }
    if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
    }
}

// 타임아웃 경고 표시
function showTimeoutWarning() {
    if (timeoutWarningShown) return;
    timeoutWarningShown = true;

    const remainingTime = Math.ceil((SESSION_TIMEOUT - (Date.now() - lastActivity)) / 1000);

    if (remainingTime > 0) {
        const confirmed = confirm(
            `🕐 보안을 위해 ${remainingTime}초 후 자동으로 로그아웃됩니다.\n\n계속 사용하시겠습니까?`
        );

        if (confirmed) {
            resetSessionTimer();
        } else {
            autoLogout();
        }
    }
}

// 자동 로그아웃
async function autoLogout() {
    console.log('[SESSION] 세션 타임아웃 - 자동 로그아웃');

    // 로그 기록
    if (auth && auth.currentUser) {
        try {
            await database.ref('users/' + auth.currentUser.uid + '/accessLog').push({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                action: 'auto_logout',
                reason: 'session_timeout',
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.error('[SESSION] 로그 기록 실패:', error);
        }
    }

    // 세션 데이터 삭제
    sessionStorage.clear();

    // 로그아웃
    if (auth) {
        await auth.signOut();
    }

    alert('보안을 위해 자동으로 로그아웃되었습니다.\n다시 로그인해주세요.');
    window.location.replace('login.html');
}

// 수동 로그아웃 시 세션 정리
async function logoutWithSession() {
    console.log('[SESSION] 수동 로그아웃');

    clearSessionTimers();

    // 로그 기록
    if (auth && auth.currentUser) {
        try {
            await database.ref('users/' + auth.currentUser.uid + '/accessLog').push({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                action: 'manual_logout',
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.error('[SESSION] 로그 기록 실패:', error);
        }
    }

    // 세션 데이터 삭제
    sessionStorage.clear();
    localStorage.clear();

    // 로그아웃
    await auth.signOut();
    window.location.replace('login.html');
}

// 페이지 로드 시 자동 초기화
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(user => {
        if (user) {
            initSessionManagement();
        } else {
            clearSessionTimers();
        }
    });
}

// 현재 세션 상태 확인
function getSessionStatus() {
    const elapsed = Date.now() - lastActivity;
    const remaining = SESSION_TIMEOUT - elapsed;

    return {
        lastActivity: new Date(lastActivity),
        elapsedSeconds: Math.floor(elapsed / 1000),
        remainingSeconds: Math.max(0, Math.floor(remaining / 1000)),
        isActive: remaining > 0
    };
}

// 디버깅용: 세션 상태 출력
function logSessionStatus() {
    const status = getSessionStatus();
    console.log('[SESSION] 상태:', {
        마지막활동: status.lastActivity.toLocaleTimeString(),
        경과시간: `${status.elapsedSeconds}초`,
        남은시간: `${status.remainingSeconds}초`,
        활성: status.isActive
    });
}
