// 2단계 인증 (TOTP) 구현

let currentUser = null;
let secret = null;

document.addEventListener('DOMContentLoaded', async function() {
    initFirebase();

    // 로그인 확인
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.replace('login.html');
            return;
        }

        currentUser = user;
        await setup2FA();
    });

    // 인증 폼 제출
    document.getElementById('verifyForm').addEventListener('submit', verify2FA);
});

// 2FA 설정
async function setup2FA() {
    try {
        // 이미 2FA가 활성화되어 있는지 확인
        const snapshot = await database.ref('users/' + currentUser.uid + '/2fa').once('value');
        const data = snapshot.val();

        if (data && data.enabled) {
            alert('이미 2단계 인증이 활성화되어 있습니다.');
            window.location.replace('index.html');
            return;
        }

        // Secret 키 생성
        secret = generateSecret();

        // QR 코드 생성
        const otpauthUrl = `otpauth://totp/자산관리:${currentUser.email}?secret=${secret}&issuer=자산관리`;

        new QRCode(document.getElementById('qrcode'), {
            text: otpauthUrl,
            width: 200,
            height: 200
        });

        // Secret 키 표시
        document.getElementById('secretKey').textContent = formatSecret(secret);

        console.log('[2FA] 2단계 인증 설정 시작');
    } catch (error) {
        console.error('[2FA] 설정 오류:', error);
        alert('2단계 인증 설정 중 오류가 발생했습니다.');
    }
}

// Secret 키 생성 (32자리 Base32)
function generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const array = new Uint8Array(20);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < array.length; i++) {
        secret += chars[array[i] % chars.length];
    }

    return secret;
}

// Secret 키 포맷 (4자리씩 띄어쓰기)
function formatSecret(secret) {
    return secret.match(/.{1,4}/g).join(' ');
}

// TOTP 생성 (RFC 6238)
function generateTOTP(secret) {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30; // 30초마다 갱신
    const counter = Math.floor(epoch / timeStep);

    // Base32 디코딩
    const key = base32Decode(secret);

    // HMAC-SHA1
    const shaObj = new jsSHA("SHA-1", "BYTES");
    shaObj.setHMACKey(key, "BYTES");
    shaObj.update(intToBytes(counter));
    const hmac = shaObj.getHMAC("BYTES");

    // Dynamic truncation
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

// 2FA 인증
async function verify2FA(e) {
    e.preventDefault();

    const code = document.getElementById('verifyCode').value;
    const expectedCode = generateTOTP(secret);

    console.log('[2FA] 입력 코드:', code, '예상 코드:', expectedCode);

    // 시간 오차를 고려하여 앞뒤 30초씩 체크
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;

    let isValid = false;
    for (let i = -1; i <= 1; i++) {
        const counter = Math.floor((epoch + (i * timeStep)) / timeStep);
        const checkCode = generateTOTPWithCounter(secret, counter);
        if (code === checkCode) {
            isValid = true;
            break;
        }
    }

    if (isValid) {
        try {
            // Firebase에 2FA 정보 저장
            await database.ref('users/' + currentUser.uid + '/2fa').set({
                enabled: true,
                secret: secret,
                enabledAt: firebase.database.ServerValue.TIMESTAMP
            });

            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('backBtn').style.display = 'inline-block';

            console.log('[2FA] 2단계 인증 활성화 성공');

            setTimeout(() => {
                window.location.replace('index.html');
            }, 2000);

        } catch (error) {
            console.error('[2FA] 저장 오류:', error);
            alert('2단계 인증 활성화 중 오류가 발생했습니다.');
        }
    } else {
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('verifyCode').value = '';
    }
}

// Counter 기반 TOTP 생성
function generateTOTPWithCounter(secret, counter) {
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
