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

// Firebase 리스너
let assetsListener = null;
let historyListener = null;

// 리다이렉트 중복 방지 플래그 (메인 페이지용)
let mainPageRedirecting = false;
let mainPageInitialized = false;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded - 페이지 로드 시작');

    // Firebase 초기화
    if (!initFirebase()) {
        alert('Firebase 설정이 필요합니다. firebase-config.js를 확인하세요.');
        return;
    }
    console.log('[DEBUG] Firebase 초기화 완료');

    // 인증 상태 확인 (리스너 방식으로 변경)
    auth.onAuthStateChanged(user => {
        console.log('[DEBUG] onAuthStateChanged 호출됨, user:', user ? user.email : 'null');

        if (user) {
            // 로그인 상태
            if (!mainPageInitialized) {
                console.log('[DEBUG] 초기화 시작');
                mainPageInitialized = true;
                currentUser = user;
                displayUserInfo(currentUser);

                // Firebase에서 데이터 로드
                loadDataFromFirebase();

                // 차트 초기화
                initCharts();

                // 폼 제출 이벤트
                document.getElementById('assetForm').addEventListener('submit', handleFormSubmit);
                console.log('[DEBUG] 초기화 완료');
            } else {
                console.log('[DEBUG] 이미 초기화됨 - 중복 실행 방지');
            }
        } else {
            // 로그인 안 됨 - login.html로 이동
            console.log('[DEBUG] 로그인 안 됨, 리다이렉트 시도');
            console.log('[DEBUG] 리다이렉트 임시 비활성화 - 디버깅용');
            // 임시로 리다이렉트 비활성화
            // if (!mainPageRedirecting) {
            //     mainPageRedirecting = true;
            //     console.log('[DEBUG] login.html로 리다이렉트');
            //     window.location.replace('login.html');
            // } else {
            //     console.log('[DEBUG] 이미 리다이렉트 중 - 중복 방지');
            // }
        }
    });
});

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

// Firebase에서 데이터 로드
function loadDataFromFirebase() {
    console.log('[DEBUG] loadDataFromFirebase 호출');
    if (!currentUser) {
        console.log('[DEBUG] currentUser 없음, 종료');
        return;
    }

    // 이미 리스너가 등록되어 있으면 중복 등록 방지
    if (assetsListener || historyListener) {
        console.log('[DEBUG] 리스너 이미 등록됨, 중복 방지');
        return;
    }

    console.log('[DEBUG] Firebase 리스너 등록 시작');
    const assetsRef = database.ref('assets');
    const historyRef = database.ref('history');

    // 자산 데이터 실시간 리스너
    assetsListener = assetsRef.on('value', (snapshot) => {
        console.log('[DEBUG] assets 데이터 업데이트됨');
        const data = snapshot.val();
        if (data) {
            assets = data;
        } else {
            // 데이터가 없으면 초기 구조 생성
            assets = {
                cash: [],
                stock: [],
                crypto: [],
                realEstate: []
            };
        }
        updateDashboard();

        // 현재 활성 탭 새로고침
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const category = ['cash', 'stock', 'crypto', 'realEstate'][
                Array.from(document.querySelectorAll('.tab')).indexOf(activeTab)
            ];
            if (category) {
                showTabContent(category);
            }
        }
    });

    // 자산 추이 데이터 리스너
    historyListener = historyRef.on('value', (snapshot) => {
        updateCharts();
    });
}

// Firebase에 데이터 저장
async function saveDataToFirebase() {
    if (!currentUser) return;

    try {
        // 자산 데이터 저장
        await database.ref('assets').set(assets);

        // 자산 추이 저장 (날짜별)
        const today = new Date().toISOString().split('T')[0];
        const total = calculateTotal();
        await database.ref('history/' + today).set(total);

        console.log('데이터 저장 완료');
    } catch (error) {
        console.error('데이터 저장 오류:', error);
        alert('데이터 저장에 실패했습니다.');
    }
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
    // 이미 차트가 존재하면 초기화하지 않음
    if (pieChart || trendChart) {
        return;
    }

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

    // 추이 차트 업데이트 - Firebase에서 히스토리 가져오기
    database.ref('history').once('value').then((snapshot) => {
        const history = snapshot.val() || {};
        const dates = Object.keys(history).sort().slice(-30); // 최근 30일
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
    // 탭 버튼 활성화
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    // event가 있는 경우에만 (클릭한 경우)
    if (typeof event !== 'undefined' && event.target) {
        event.target.classList.add('active');
    } else {
        // 프로그래밍 방식 호출 - 첫 번째 탭 활성화
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
        await saveDataToFirebase();
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
        // 새로 추가
        assets[category].push(assetData);
    } else {
        // 수정
        assets[category][editIndex] = assetData;
    }

    await saveDataToFirebase();
    closeModal();

    // 해당 탭으로 이동
    const tabs = document.querySelectorAll('.tab');
    const categoryIndex = ['cash', 'stock', 'crypto', 'realEstate'].indexOf(category);
    tabs[categoryIndex].click();
}

// 모달 외부 클릭시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('assetModal');
    if (event.target == modal) {
        closeModal();
    }
}

// 데이터 내보내기
function exportData() {
    const dataStr = JSON.stringify(assets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `자산현황_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 페이지 종료시 리스너 정리
window.addEventListener('beforeunload', () => {
    if (assetsListener) {
        database.ref('assets').off('value', assetsListener);
    }
    if (historyListener) {
        database.ref('history').off('value', historyListener);
    }
});
