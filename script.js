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

// 필터 상태
let currentOwnerFilter = 'all';

// 환율 정보
let exchangeRates = {
    USD: 1350 // 기본값
};

// 기준일자
let baseDate = null;

// 페이지 로드 시 단 한 번만 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('[INIT] 페이지 로드');

    // Firebase 초기화
    if (!initFirebase()) {
        alert('Firebase 설정이 필요합니다.');
        return;
    }

    console.log('[INIT] Firebase 초기화 완료');

    // 허용된 이메일 목록
    const allowedEmails = [
        'ahnhj1996@naver.com'
        // 추가로 허용할 이메일이 있으면 여기에 추가
    ];

    // 인증 상태 확인 - 단 한 번만 처리
    const unsubscribe = auth.onAuthStateChanged(user => {
        console.log('[AUTH] 인증 상태 변경:', user ? user.email : '로그인 안 됨');

        if (!user) {
            console.log('[AUTH] 로그인 필요 - login.html로 이동');
            window.location.replace('login.html');
            return;
        }

        // 허용된 이메일인지 확인
        if (!allowedEmails.includes(user.email)) {
            console.log('[AUTH] 접근 권한 없음:', user.email);
            alert('접근 권한이 없습니다. 관리자에게 문의하세요.');
            auth.signOut();
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

    console.log('[APP] 기준일자 초기화');
    initBaseDate();

    console.log('[APP] Firebase 데이터 리스너 등록');
    setupFirebaseListeners();

    console.log('[APP] 폼 이벤트 등록');
    document.getElementById('assetForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('baseDate').addEventListener('change', handleBaseDateChange);

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
        cash: calculateCategoryTotalFiltered('cash'),
        stock: calculateCategoryTotalFiltered('stock'),
        crypto: calculateCategoryTotalFiltered('crypto'),
        realEstate: calculateCategoryTotalFiltered('realEstate')
    };

    document.getElementById('cashTotal').textContent = formatMoney(totals.cash);
    document.getElementById('stockTotal').textContent = formatMoney(totals.stock);
    document.getElementById('cryptoTotal').textContent = formatMoney(totals.crypto);
    document.getElementById('realEstateTotal').textContent = formatMoney(totals.realEstate);

    const total = calculateTotalFiltered();
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
    let items = assets[category];

    // 필터 적용
    if (currentOwnerFilter !== 'all') {
        items = items.filter(item => item.owner === currentOwnerFilter);
    }

    if (items.length === 0) {
        content.innerHTML = '<div class="empty-state">등록된 자산이 없습니다.</div>';
        return;
    }

    // 자산 규모순으로 정렬
    const itemsWithKRW = items.map((item, index) => ({
        ...item,
        originalIndex: assets[category].indexOf(item),
        amountKRW: convertToKRW(item.amount, item.currency || 'KRW')
    }));
    itemsWithKRW.sort((a, b) => b.amountKRW - a.amountKRW);

    let html = '<ul class="asset-list">';
    itemsWithKRW.forEach((item) => {
        const returnInfo = calculateReturn(item.amount, item.purchaseAmount, item.currency || 'KRW');
        const profitClass = returnInfo.profit > 0 ? 'positive' : returnInfo.profit < 0 ? 'negative' : '';

        html += `
            <li class="asset-item">
                <div class="asset-info">
                    <strong>${item.name}</strong>
                    ${item.owner ? `<span class="owner-badge">${item.owner}</span>` : ''}
                    ${item.ticker ? `<span class="ticker-badge">${item.ticker}</span>` : ''}
                    ${item.currency === 'USD' ? `<span class="currency-badge">$${item.amount.toLocaleString()}</span>` : ''}
                    ${item.note ? `<div class="note">${item.note}</div>` : ''}
                </div>
                <div class="asset-details">
                    <div class="asset-amount">${formatMoney(item.amountKRW)}</div>
                    ${returnInfo.returnRate !== 0 ? `
                        <div class="asset-return ${profitClass}">
                            ${returnInfo.profit > 0 ? '+' : ''}${formatMoney(returnInfo.profit)}
                            (${returnInfo.returnRate > 0 ? '+' : ''}${returnInfo.returnRate.toFixed(2)}%)
                        </div>
                    ` : ''}
                </div>
                <div class="asset-actions">
                    <button class="edit-btn" onclick="editAsset('${category}', ${item.originalIndex})">수정</button>
                    <button class="delete-btn" onclick="deleteAsset('${category}', ${item.originalIndex})">삭제</button>
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
    document.getElementById('assetOwner').value = item.owner || '희준';
    document.getElementById('assetName').value = item.name;
    document.getElementById('assetCurrency').value = item.currency || 'KRW';
    document.getElementById('assetAmount').value = item.amount;
    document.getElementById('assetPurchaseAmount').value = item.purchaseAmount || '';
    document.getElementById('assetTicker').value = item.ticker || '';
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
    const owner = document.getElementById('assetOwner').value;
    const name = document.getElementById('assetName').value;
    const currency = document.getElementById('assetCurrency').value;
    const amount = parseFloat(document.getElementById('assetAmount').value);
    const purchaseAmount = parseFloat(document.getElementById('assetPurchaseAmount').value) || null;
    const ticker = document.getElementById('assetTicker').value.trim();
    const note = document.getElementById('assetNote').value;

    const assetData = {
        owner,
        name,
        currency,
        amount,
        purchaseAmount,
        ticker,
        note
    };

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

// CSV로 내보내기
function exportToCSV() {
    const categoryNames = {
        cash: '현금/예금',
        stock: '주식/펀드',
        crypto: '암호화폐',
        realEstate: '부동산/기타'
    };

    // CSV 헤더
    let csv = '\uFEFF카테고리,항목명,금액,메모\n'; // \uFEFF는 UTF-8 BOM

    // 데이터 추가
    Object.keys(assets).forEach(category => {
        assets[category].forEach(item => {
            const row = [
                categoryNames[category],
                item.name,
                item.amount,
                item.note || ''
            ];
            csv += row.map(field => `"${field}"`).join(',') + '\n';
        });
    });

    // 다운로드
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `자산현황_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// 엑셀로 내보내기 (HTML 테이블 방식)
function exportToExcel() {
    const categoryNames = {
        cash: '현금/예금',
        stock: '주식/펀드',
        crypto: '암호화폐',
        realEstate: '부동산/기타'
    };

    // HTML 테이블 생성
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"><title>자산 현황</title></head>';
    html += '<body>';
    html += '<table border="1">';

    // 헤더
    html += '<tr><th>카테고리</th><th>항목명</th><th>금액</th><th>메모</th></tr>';

    // 데이터
    Object.keys(assets).forEach(category => {
        assets[category].forEach(item => {
            html += '<tr>';
            html += `<td>${categoryNames[category]}</td>`;
            html += `<td>${item.name}</td>`;
            html += `<td>${item.amount}</td>`;
            html += `<td>${item.note || ''}</td>`;
            html += '</tr>';
        });
    });

    // 합계 행
    html += '<tr style="font-weight:bold;background-color:#f0f0f0;">';
    html += '<td colspan="2">총 자산</td>';
    html += `<td>${calculateTotal()}</td>`;
    html += '<td></td>';
    html += '</tr>';

    html += '</table>';
    html += '</body></html>';

    // 다운로드
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `자산현황_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
}

// 기준일자 초기화
function initBaseDate() {
    const baseDateInput = document.getElementById('baseDate');
    baseDate = new Date().toISOString().split('T')[0];
    baseDateInput.value = baseDate;
    fetchExchangeRate(baseDate);
}

// 기준일자 변경 처리
function handleBaseDateChange(e) {
    baseDate = e.target.value;
    console.log('[DATE] 기준일자 변경:', baseDate);
    fetchExchangeRate(baseDate);
    updateDashboard();
}

// 환율 조회 (한국수출입은행 API)
async function fetchExchangeRate(date) {
    try {
        // 한국수출입은행 API 사용 (무료, 인증키 필요)
        // 실제 구현 시 API 키 필요
        // 임시로 고정값 사용

        // TODO: 실제 API 연동
        // const apiKey = 'YOUR_API_KEY';
        // const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${apiKey}&searchdate=${date.replace(/-/g, '')}&data=AP01`;

        // 임시 환율 (실제로는 API에서 가져와야 함)
        exchangeRates.USD = 1350;

        document.getElementById('exchangeRate').textContent = `$1 = ${formatMoney(exchangeRates.USD)}`;

        console.log('[EXCHANGE] 환율 조회:', exchangeRates);
    } catch (error) {
        console.error('[EXCHANGE] 환율 조회 실패:', error);
        exchangeRates.USD = 1350; // 기본값
    }
}

// 소유자 필터
function filterByOwner(owner) {
    currentOwnerFilter = owner;

    // 탭 활성화
    document.querySelectorAll('.owner-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    console.log('[FILTER] 소유자 필터:', owner);
    updateDashboard();
}

// 카테고리별 합계 계산 (필터 적용)
function calculateCategoryTotalFiltered(category) {
    return assets[category]
        .filter(item => currentOwnerFilter === 'all' || item.owner === currentOwnerFilter)
        .reduce((sum, item) => {
            const amount = convertToKRW(item.amount, item.currency || 'KRW');
            return sum + amount;
        }, 0);
}

// 전체 합계 계산 (필터 적용)
function calculateTotalFiltered() {
    return Object.keys(assets).reduce((sum, category) => {
        return sum + calculateCategoryTotalFiltered(category);
    }, 0);
}

// 통화 변환 (원화로)
function convertToKRW(amount, currency) {
    if (currency === 'KRW') {
        return amount;
    } else if (currency === 'USD') {
        return amount * exchangeRates.USD;
    }
    return amount;
}

// 수익률 계산
function calculateReturn(currentAmount, purchaseAmount, currency) {
    if (!purchaseAmount || purchaseAmount === 0) {
        return { profit: 0, returnRate: 0 };
    }

    const current = convertToKRW(currentAmount, currency);
    const purchase = convertToKRW(purchaseAmount, currency);
    const profit = current - purchase;
    const returnRate = (profit / purchase) * 100;

    return { profit, returnRate };
}
