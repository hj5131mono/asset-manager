// 2FA 인증 확인

let currentUser = null;
let secret = null;

document.addEventListener('DOMContentLoaded', function() {
    initFirebase();

    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.replace('login.html');
            return;
        }

        currentUser = user;

        // 2FA 정보 가져오기
        try {
            const snapshot = await database.ref('users/' + user.uid + '/2fa').once('value');
            const data = snapshot.val();

            if (!data || !data.enabled) {
                // 2FA가 활성화되지 않음
                window.location.replace('index.html');
                return;
            }

            secret = data.secret;
            console.log('[2FA] 2단계 인증 확인 페이지 로드');

        } catch (error) {
            console.error('[2FA] 정보 로드 오류:', error);
            alert('2단계 인증 정보를 불러오는데 실패했습니다.');
        }
    });

    document.getElementById('verifyForm').addEventListener('submit', verifyCode);
});

// 코드 검증
async function verifyCode(e) {
    e.preventDefault();

    const code = document.getElementById('code').value;
    const verifyBtn = document.getElementById('verifyBtn');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.style.display = 'none';
    verifyBtn.disabled = true;
    verifyBtn.textContent = '확인 중...';

    // TOTP 검증
    if (verifyTOTP(secret, code)) {
        // 세션에 2FA 완료 표시
        sessionStorage.setItem('2fa_verified', 'true');
        sessionStorage.setItem('2fa_verified_at', Date.now());

        console.log('[2FA] 인증 성공');

        // 접근 로그
        await database.ref('users/' + currentUser.uid + '/accessLog').push({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            action: '2fa_verified',
            userAgent: navigator.userAgent
        });

        window.location.replace('index.html');
    } else {
        errorMessage.textContent = '인증 코드가 올바르지 않습니다. 다시 시도하세요.';
        errorMessage.style.display = 'block';
        verifyBtn.disabled = false;
        verifyBtn.textContent = '확인';
        document.getElementById('code').value = '';
    }
}

// TOTP 검증
function verifyTOTP(secret, code) {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;

    // 시간 오차를 고려하여 앞뒤 30초씩 체크
    for (let i = -1; i <= 1; i++) {
        const counter = Math.floor((epoch + (i * timeStep)) / timeStep);
        const expectedCode = generateTOTP(secret, counter);
        if (code === expectedCode) {
            return true;
        }
    }

    return false;
}

// TOTP 생성
function generateTOTP(secret, counter) {
    const key = base32Decode(secret);

    const shaObj = new jsSHA("SHA-1", "BYTES");
    shaObj.setHMACKey(key, "BYTES");
    shaObj.update(intToBytes(counter));
    const hmac = shaObj.getHMAC("BYTES");

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return String(otp).padStart(6, '0');
}

// Base32 디코딩
function base32Decode(input) {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let result = [];

    input = input.toUpperCase().replace(/=+$/, '');

    for (let i = 0; i < input.length; i++) {
        const val = base32chars.indexOf(input[i]);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i + 8 <= bits.length; i += 8) {
        result.push(parseInt(bits.substr(i, 8), 2));
    }

    return result;
}

// Integer to bytes
function intToBytes(num) {
    const bytes = [];
    for (let i = 7; i >= 0; i--) {
        bytes[i] = num & 0xff;
        num = num >> 8;
    }
    return bytes;
}
