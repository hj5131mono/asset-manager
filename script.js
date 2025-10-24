// 데이터 구조 - Firebase에서 로드됨
let assets = {
    cash: [],
    stock: [],
    crypto: [],
    realEstate: []
};

// 차트 객체
let pieChart = null;
let trendChart = null;

// 현재 사용자
let currentUser = null;

// 초기화 완료 플래그
let initialized = false;

// 페이지 로드 시 단 한 번만 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('[INIT] 페이지 로드');

    // Firebase 초기화
    if (!initFirebase()) {
        alert('Firebase 설정이 필요합니다.');
        return;
    }

    console.log('[INIT] Firebase 초기화 완료');

    // 인증 상태 확인 - 단 한 번만 처리
    const unsubscribe = auth.onAuthStateChanged(user => {
        console.log('[AUTH] 인증 상태 변경:', user ? user.email : '로그인 안 됨');

        if (!user) {
            console.log('[AUTH] 로그인 필요 - login.html로 이동');
            window.location.replace('login.html');
            return;
        }

        // 이미 초기화되었으면 무시
        if (initialized) {
            console.log('[AUTH] 이미 초기화됨 - 스킵');
            return;
        }

        initialized = true;
        currentUser = user;
        console.log('[INIT] 앱 초기화 시작');

        // UI 초기화
        initializeApp();

        // 리스너는 한 번만 등록했으므로 해제하지 않음
    });
});

// 앱 초기화
function initializeApp() {
    console.log('[APP] 사용자 정보 표시');
    displayUserInfo(currentUser);

    console.log('[APP] 차트 초기화');
    initCharts();

    console.log('[APP] Firebase 데이터 리스너 등록');
    setupFirebaseListeners();

    console.log('[APP] 폼 이벤트 등록');
    document.getElementById('assetForm').addEventListener('submit', handleFormSubmit);

    console.log('[APP] 초기화 완료!');
}

// 사용자 정보 표시
function displayUserInfo(user) {
    const userName = document.getElementById('userName');
    const userPhoto = document.getElementById('userPhoto');

    if (userName) {
        userName.textContent = user.displayName || user.email;
    }

    if (userPhoto && user.photoURL) {
        userPhoto.src = user.photoURL;
        userPhoto.style.display = 'block';
    }
}

// Firebase 리스너 설정
function setupFirebaseListeners() {
    // 자산 데이터 리스너
    database.ref('assets').on('value', (snapshot) => {
        console.log('[FIREBASE] assets 데이터 수신');
        const data = snapshot.val();

        if (data) {
            assets = data;
        } else {
            assets = {
                cash: [],
                stock: [],
                crypto: [],
                realEstate: []
            };
        }

        updateDashboard();

        // 활성 탭 새로고침
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabIndex = Array.from(document.querySelectorAll('.tab')).indexOf(activeTab);
            const categories = ['cash', 'stock', 'crypto', 'realEstate'];
            if (categories[tabIndex]) {
                showTabContent(categories[tabIndex]);
            }
        }
    });

    // 히스토리 데이터 리스너
    database.ref('history').on('value', () => {
        console.log('[FIREBASE] history 데이터 수신');
        updateCharts();
    });
}

// 대시보드 업데이트
function updateDashboard() {
    const totals = {
        cash: calculateCategoryTotal('cash'),
        stock: calculateCategoryTotal('stock'),
        crypto: calculateCategoryTotal('crypto'),
        realEstate: calculateCategoryTotal('realEstate')
    };

    document.getElementById('cashTotal').textContent = formatMoney(totals.cash);
    document.getElementById('stockTotal').textContent = formatMoney(totals.stock);
    document.getElementById('cryptoTotal').textContent = formatMoney(totals.crypto);
    document.getElementById('realEstateTotal').textContent = formatMoney(totals.realEstate);

    const total = calculateTotal();
    document.getElementById('totalAssets').textContent = formatMoney(total);

    updateCharts();
}

// 카테고리별 합계 계산
function calculateCategoryTotal(category) {
    return assets[category].reduce((sum, item) => sum + item.amount, 0);
}

// 전체 합계 계산
function calculateTotal() {
    return Object.keys(assets).reduce((sum, category) => {
        return sum + calculateCategoryTotal(category);
    }, 0);
}

// 금액 포맷
function formatMoney(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

// 차트 초기화
function initCharts() {
    const pieCtx = document.getElementById('assetPieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['현금/예금', '주식/펀드', '암호화폐', '부동산/기타'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#4CAF50',
                    '#2196F3',
                    '#FF9800',
                    '#9C27B0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    const trendCtx = document.getElementById('assetTrendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '총 자산',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 10000).toFixed(0) + '만원';
                        }
                    }
                }
            }
        }
    });
}

// 차트 업데이트
function updateCharts() {
    if (!pieChart || !trendChart) return;

    // 파이 차트 업데이트
    pieChart.data.datasets[0].data = [
        calculateCategoryTotal('cash'),
        calculateCategoryTotal('stock'),
        calculateCategoryTotal('crypto'),
        calculateCategoryTotal('realEstate')
    ];
    pieChart.update();

    // 추이 차트 업데이트
    database.ref('history').once('value').then((snapshot) => {
        const history = snapshot.val() || {};
        const dates = Object.keys(history).sort().slice(-30);
        const values = dates.map(date => history[date]);

        trendChart.data.labels = dates.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        trendChart.data.datasets[0].data = values;
        trendChart.update();
    });
}

// 탭 전환
function showTab(category) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    if (typeof event !== 'undefined' && event.target) {
        event.target.classList.add('active');
    } else {
        const firstTab = document.querySelector('.tab');
        if (firstTab) firstTab.classList.add('active');
    }

    showTabContent(category);
}

// 탭 내용 표시
function showTabContent(category) {
    const content = document.getElementById('detailsContent');
    const items = assets[category];

    if (items.length === 0) {
        content.innerHTML = '<div class="empty-state">등록된 자산이 없습니다.</div>';
        return;
    }

    let html = '<ul class="asset-list">';
    items.forEach((item, index) => {
        html += `
            <li class="asset-item">
                <div class="asset-info">
                    <strong>${item.name}</strong>
                    ${item.note ? `<div class="note">${item.note}</div>` : ''}
                </div>
                <div class="asset-amount">${formatMoney(item.amount)}</div>
                <div class="asset-actions">
                    <button class="edit-btn" onclick="editAsset('${category}', ${index})">수정</button>
                    <button class="delete-btn" onclick="deleteAsset('${category}', ${index})">삭제</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';

    content.innerHTML = html;
}

// 모달 표시
function showModal(type) {
    const titles = {
        cash: '현금/예금',
        stock: '주식/펀드',
        crypto: '암호화폐',
        realEstate: '부동산/기타'
    };

    document.getElementById('modalTitle').textContent = titles[type] + ' 추가';
    document.getElementById('assetType').value = type;
    document.getElementById('editIndex').value = '';
    document.getElementById('assetForm').reset();
    document.getElementById('assetModal').style.display = 'block';
}

// 모달 닫기
function closeModal() {
    document.getElementById('assetModal').style.display = 'none';
}

// 자산 수정
function editAsset(category, index) {
    const item = assets[category][index];
    const titles = {
        cash: '현금/예금',
        stock: '주식/펀드',
        crypto: '암호화폐',
        realEstate: '부동산/기타'
    };

    document.getElementById('modalTitle').textContent = titles[category] + ' 수정';
    document.getElementById('assetType').value = category;
    document.getElementById('editIndex').value = index;
    document.getElementById('assetName').value = item.name;
    document.getElementById('assetAmount').value = item.amount;
    document.getElementById('assetNote').value = item.note || '';
    document.getElementById('assetModal').style.display = 'block';
}

// 자산 삭제
async function deleteAsset(category, index) {
    if (confirm('정말 삭제하시겠습니까?')) {
        assets[category].splice(index, 1);
        await saveToFirebase();
    }
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();

    const category = document.getElementById('assetType').value;
    const editIndex = document.getElementById('editIndex').value;
    const name = document.getElementById('assetName').value;
    const amount = parseFloat(document.getElementById('assetAmount').value);
    const note = document.getElementById('assetNote').value;

    const assetData = { name, amount, note };

    if (editIndex === '') {
        assets[category].push(assetData);
    } else {
        assets[category][editIndex] = assetData;
    }

    await saveToFirebase();
    closeModal();

    const tabs = document.querySelectorAll('.tab');
    const categoryIndex = ['cash', 'stock', 'crypto', 'realEstate'].indexOf(category);
    tabs[categoryIndex].click();
}

// Firebase에 저장
async function saveToFirebase() {
    try {
        await database.ref('assets').set(assets);

        const today = new Date().toISOString().split('T')[0];
        const total = calculateTotal();
        await database.ref('history/' + today).set(total);

        console.log('[SAVE] 데이터 저장 완료');
    } catch (error) {
        console.error('[SAVE] 저장 실패:', error);
        alert('데이터 저장에 실패했습니다.');
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

// 모달 외부 클릭시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('assetModal');
    if (event.target == modal) {
        closeModal();
    }
}
