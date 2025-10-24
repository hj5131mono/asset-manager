// Firebase 설정

const firebaseConfig = {
    apiKey: "AIzaSyALbFU6JJKw3BgencdVyghjrYG0qArYqjM",
    authDomain: "finance-hj-bf424.firebaseapp.com",
    databaseURL: "https://finance-hj-bf424-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "finance-hj-bf424",
    storageBucket: "finance-hj-bf424.firebasestorage.app",
    messagingSenderId: "884261679463",
    appId: "1:884261679463:web:8a35ed25546619336b7fc2"
};

// Firebase 초기화
let app, auth, database;

function initFirebase() {
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        database = firebase.database();
        console.log('Firebase 초기화 성공');
        return true;
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        return false;
    }
}

// 인증된 사용자만 접근 가능하도록 설정
function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                // 허용된 이메일인지 확인 (옵션)
                const allowedEmails = [
                    // 여기에 허용할 이메일 주소를 추가하세요
                    // 'your-email@gmail.com',
                    // 'partner-email@gmail.com'
                ];

                // 이메일 제한을 원하지 않으면 아래 if 블록을 주석 처리하세요
                if (allowedEmails.length > 0 && !allowedEmails.includes(user.email)) {
                    alert('접근 권한이 없습니다.');
                    auth.signOut();
                    reject('Unauthorized');
                    return;
                }

                resolve(user);
            } else {
                reject('Not authenticated');
            }
        });
    });
}
