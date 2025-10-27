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
    const unsubscribe = auth.onAuthStateChanged(async user => {
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

        // 2FA 확인
        try {
            const tfaSnapshot = await database.ref('users/' + user.uid + '/2fa').once('value');
            const tfaData = tfaSnapshot.val();

            if (tfaData && tfaData.enabled) {
                // 2FA 인증 완료 여부 확인
                const verified = sessionStorage.getItem('2fa_verified');
                const verifiedAt = sessionStorage.getItem('2fa_verified_at');

                // 2FA 인증이 안 되어있거나 1시간 지났으면 재인증
                if (!verified || !verifiedAt || (Date.now() - parseInt(verifiedAt) > 3600000)) {
                    console.log('[2FA] 2단계 인증 필요');
                    window.location.replace('2fa-verify.html');
                    return;
                }
            }
        } catch (error) {
            console.error('[2FA] 확인 오류:', error);
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
    document.getElementById('assetCountry').value = item.country || '한국';
    document.getElementById('assetInstitution').value = item.institution || '';
    document.getElementById('assetAccountType').value = item.accountType || '';
    document.getElementById('assetName').value = item.name;
    document.getElementById('assetCurrency').value = item.currency || 'KRW';
    document.getElementById('assetLiquidity').value = item.liquidity || '유동';
    document.getElementById('assetTicker').value = item.ticker || '';
    document.getElementById('assetQuantity').value = item.quantity || '';
    document.getElementById('assetPurchasePrice').value = item.purchasePrice || '';
    document.getElementById('assetPurchaseAmount').value = item.purchaseAmount || '';
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
    const owner = document.getElementById('assetOwner').value;
    const country = document.getElementById('assetCountry').value;
    const institution = document.getElementById('assetInstitution').value.trim();
    const accountType = document.getElementById('assetAccountType').value;
    const name = document.getElementById('assetName').value;
    const currency = document.getElementById('assetCurrency').value;
    const liquidity = document.getElementById('assetLiquidity').value;
    const ticker = document.getElementById('assetTicker').value.trim();
    const quantity = parseFloat(document.getElementById('assetQuantity').value) || null;
    const purchasePrice = parseFloat(document.getElementById('assetPurchasePrice').value) || null;
    const purchaseAmount = parseFloat(document.getElementById('assetPurchaseAmount').value) || null;
    const amount = parseFloat(document.getElementById('assetAmount').value);
    const note = document.getElementById('assetNote').value;

    const assetData = {
        owner,
        country,
        institution,
        accountType,
        assetType: category,
        liquidity,
        name,
        currency,
        ticker,
        quantity,
        purchasePrice,
        purchaseAmount,
        amount,
        note,
        updatedAt: new Date().toISOString()
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
        // 세션 관리가 있으면 그걸 사용
        if (typeof logoutWithSession !== 'undefined') {
            await logoutWithSession();
        } else {
            await auth.signOut();
            window.location.replace('login.html');
        }
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
async function handleBaseDateChange(e) {
    baseDate = e.target.value;
    console.log('[DATE] 기준일자 변경:', baseDate);

    // 환율 조회 완료 대기
    await fetchExchangeRate(baseDate);

    // 환율이 변경되었으므로 대시보드 전체 갱신
    updateDashboard();

    // 현재 활성화된 탭 새로고침
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const tabIndex = Array.from(document.querySelectorAll('.tab')).indexOf(activeTab);
        const categories = ['cash', 'stock', 'crypto', 'realEstate'];
        if (categories[tabIndex]) {
            showTabContent(categories[tabIndex]);
        }
    }
}

// 환율 조회 (한국은행 API)
async function fetchExchangeRate(date) {
    try {
        const apiKey = 'Z5CBL8XPHXY06Y3YBKT2';

        // 날짜 형식 변환 (YYYYMMDD)
        const formattedDate = date.replace(/-/g, '');

        // 한국은행 API: 일별 환율
        // https://ecos.bok.or.kr/api/StatisticSearch/{인증키}/json/kr/1/1/036Y001/DD/{날짜}/{날짜}/0000001/?/?
        const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/036Y001/DD/${formattedDate}/${formattedDate}/0000001`;

        console.log('[EXCHANGE] 환율 조회 요청:', formattedDate);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('환율 조회 실패');
        }

        const data = await response.json();

        // 응답 확인
        if (data.StatisticSearch && data.StatisticSearch.row && data.StatisticSearch.row.length > 0) {
            const rate = parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            exchangeRates.USD = rate;
            exchangeRates.lastUpdated = date;

            document.getElementById('exchangeRate').textContent = `$1 = ₩${Math.round(rate).toLocaleString()} (${date})`;

            console.log('[EXCHANGE] 환율 조회 성공:', rate);
        } else {
            // 데이터 없음 (주말/공휴일) - 이전 영업일 찾기
            console.log('[EXCHANGE] 해당일 데이터 없음, 이전 영업일 검색');
            await fetchPreviousBusinessDayRate(date);
        }
    } catch (error) {
        console.error('[EXCHANGE] 환율 조회 실패:', error);
        exchangeRates.USD = 1350; // 기본값
        document.getElementById('exchangeRate').textContent = `$1 = ₩${exchangeRates.USD.toLocaleString()} (기본값)`;
    }
}

// 이전 영업일 환율 조회 (주말/공휴일 처리)
async function fetchPreviousBusinessDayRate(date) {
    const apiKey = 'Z5CBL8XPHXY06Y3YBKT2';

    // 최대 7일 전까지 검색
    const targetDate = new Date(date);
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const startDate = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = date.replace(/-/g, '');

    try {
        const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/10/036Y001/DD/${startDate}/${endDate}/0000001`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.StatisticSearch && data.StatisticSearch.row && data.StatisticSearch.row.length > 0) {
            // 가장 최근 데이터 사용
            const latestData = data.StatisticSearch.row[data.StatisticSearch.row.length - 1];
            const rate = parseFloat(latestData.DATA_VALUE);
            const actualDate = latestData.TIME;

            exchangeRates.USD = rate;
            exchangeRates.lastUpdated = actualDate;

            // YYYYMMDD → YYYY-MM-DD 변환
            const formattedActualDate = actualDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

            document.getElementById('exchangeRate').textContent = `$1 = ₩${Math.round(rate).toLocaleString()} (${formattedActualDate})`;

            console.log('[EXCHANGE] 이전 영업일 환율 사용:', formattedActualDate, rate);
        } else {
            throw new Error('이전 영업일 환율도 없음');
        }
    } catch (error) {
        console.error('[EXCHANGE] 이전 영업일 조회 실패:', error);
        exchangeRates.USD = 1350;
        document.getElementById('exchangeRate').textContent = `$1 = ₩${exchangeRates.USD.toLocaleString()} (기본값)`;
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

// 엑셀/CSV 업로드 처리
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const rows = parseExcelData(text);

            if (rows.length === 0) {
                alert('파일에서 데이터를 읽을 수 없습니다.');
                return;
            }

            // 확인 메시지
            const confirmed = confirm(`${rows.length}개의 자산 데이터를 가져왔습니다.\n\n기존 데이터에 추가하시겠습니까?`);
            if (!confirmed) return;

            let importCount = 0;
            rows.forEach(row => {
                const category = mapAssetTypeToCategory(row.assetType || row.assetNature);
                if (category && row.name && row.amount) {
                    assets[category].push(row);
                    importCount++;
                }
            });

            await saveToFirebase();
            alert(`${importCount}개의 자산이 성공적으로 추가되었습니다!`);
            updateDashboard();

            // 파일 입력 초기화
            event.target.value = '';
        } catch (error) {
            console.error('[UPLOAD] 업로드 오류:', error);
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };

    reader.readAsText(file, 'UTF-8');
}

// 엑셀 데이터 파싱
function parseExcelData(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const rows = [];

    // 헤더 스킵 (첫 줄)
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('\t');
        if (cells.length < 13) continue; // 최소 필드 수 체크

        const row = {
            owner: cells[0] || '희준',
            currency: cells[1] || 'KRW',
            country: cells[2] || '한국',
            institution: cells[3] || '',
            accountType: cells[4] || '',
            assetType: cells[5] || '',
            liquidity: cells[6] || '유동',
            assetNature: cells[7] || '',
            name: cells[8] || '',
            ticker: cells[9] || '',
            quantity: parseFloat(cells[10]) || null,
            purchasePrice: parseFloat(cells[11]) || null,
            purchaseAmount: parseFloat(cells[12]) || null,
            amount: parseFloat(cells[15]) || 0, // 평가금액 열
            note: '',
            updatedAt: new Date().toISOString()
        };

        rows.push(row);
    }

    return rows;
}

// 자산 유형을 카테고리로 매핑
function mapAssetTypeToCategory(assetType) {
    const mapping = {
        '현금': 'cash',
        '예금': 'cash',
        '적금': 'cash',
        '주식': 'stock',
        '펀드': 'stock',
        'ETF': 'stock',
        '국내주식': 'stock',
        '해외주식': 'stock',
        '암호화폐': 'crypto',
        '코인': 'crypto',
        '비트코인': 'crypto',
        '부동산': 'realEstate',
        '아파트': 'realEstate',
        '토지': 'realEstate'
    };

    return mapping[assetType] || 'cash';
}

// 포트폴리오 스냅샷 캡처
async function captureSnapshot() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 이미 오늘 스냅샷이 있는지 확인
        const existingSnapshot = await database.ref('snapshots/' + today).once('value');

        if (existingSnapshot.exists()) {
            const overwrite = confirm('오늘 날짜의 스냅샷이 이미 존재합니다.\n덮어쓰시겠습니까?');
            if (!overwrite) return;
        }

        // 현재 포트폴리오 전체 복사
        const snapshot = {
            date: today,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            exchangeRate: exchangeRates.USD,
            assets: JSON.parse(JSON.stringify(assets)), // 깊은 복사
            totals: {
                cash: calculateCategoryTotal('cash'),
                stock: calculateCategoryTotal('stock'),
                crypto: calculateCategoryTotal('crypto'),
                realEstate: calculateCategoryTotal('realEstate'),
                total: calculateTotal()
            },
            metadata: {
                totalAssetCount: Object.values(assets).reduce((sum, arr) => sum + arr.length, 0),
                byOwner: {
                    희준: calculateOwnerTotal('희준'),
                    영은: calculateOwnerTotal('영은')
                },
                byCurrency: {
                    KRW: calculateCurrencyTotal('KRW'),
                    USD: calculateCurrencyTotal('USD')
                }
            }
        };

        // Firebase에 저장
        await database.ref('snapshots/' + today).set(snapshot);

        // history도 함께 업데이트 (기존 방식 호환)
        await database.ref('history/' + today).set(snapshot.totals.total);

        console.log('[SNAPSHOT] 스냅샷 저장 완료:', today);
        alert(`✅ ${today} 포트폴리오 스냅샷이 저장되었습니다!\n\n총 자산: ${formatMoney(snapshot.totals.total)}\n자산 항목 수: ${snapshot.metadata.totalAssetCount}개`);

        // 차트 업데이트
        updateCharts();

    } catch (error) {
        console.error('[SNAPSHOT] 스냅샷 저장 실패:', error);
        alert('스냅샷 저장에 실패했습니다.');
    }
}

// 소유자별 총 자산 계산
function calculateOwnerTotal(owner) {
    let total = 0;
    Object.keys(assets).forEach(category => {
        assets[category].forEach(item => {
            if (item.owner === owner) {
                total += convertToKRW(item.amount, item.currency || 'KRW');
            }
        });
    });
    return total;
}

// 통화별 총 자산 계산
function calculateCurrencyTotal(currency) {
    let total = 0;
    Object.keys(assets).forEach(category => {
        assets[category].forEach(item => {
            if ((item.currency || 'KRW') === currency) {
                total += item.amount;
            }
        });
    });
    return total;
}
