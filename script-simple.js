// 간단한 로컬 버전 - Firebase 없음

let assets = {
    cash: [],
    stock: [],
    crypto: [],
    realEstate: []
};

let pieChart = null;
let trendChart = null;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('앱 시작');
    loadData();
    updateDashboard();
    initCharts();
    showTabContent('cash');

    document.getElementById('assetForm').addEventListener('submit', handleFormSubmit);
});

// 데이터 저장 (localStorage)
function saveData() {
    localStorage.setItem('assetData', JSON.stringify(assets));

    const today = new Date().toISOString().split('T')[0];
    let history = JSON.parse(localStorage.getItem('assetHistory') || '{}');
    history[today] = calculateTotal();
    localStorage.setItem('assetHistory', JSON.stringify(history));
}

// 데이터 불러오기
function loadData() {
    const saved = localStorage.getItem('assetData');
    if (saved) {
        assets = JSON.parse(saved);
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

function calculateCategoryTotal(category) {
    return assets[category].reduce((sum, item) => sum + item.amount, 0);
}

function calculateTotal() {
    return Object.keys(assets).reduce((sum, category) => {
        return sum + calculateCategoryTotal(category);
    }, 0);
}

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
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } }
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
            plugins: { legend: { display: true } },
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

function updateCharts() {
    if (!pieChart || !trendChart) return;

    pieChart.data.datasets[0].data = [
        calculateCategoryTotal('cash'),
        calculateCategoryTotal('stock'),
        calculateCategoryTotal('crypto'),
        calculateCategoryTotal('realEstate')
    ];
    pieChart.update();

    const history = JSON.parse(localStorage.getItem('assetHistory') || '{}');
    const dates = Object.keys(history).sort().slice(-30);
    const values = dates.map(date => history[date]);

    trendChart.data.labels = dates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    trendChart.data.datasets[0].data = values;
    trendChart.update();
}

// 탭 전환
function showTab(event, category) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    showTabContent(category);
}

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

function closeModal() {
    document.getElementById('assetModal').style.display = 'none';
}

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

function deleteAsset(category, index) {
    if (confirm('정말 삭제하시겠습니까?')) {
        assets[category].splice(index, 1);
        saveData();
        updateDashboard();
        showTabContent(category);
    }
}

function handleFormSubmit(e) {
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

    saveData();
    updateDashboard();
    closeModal();
    showTabContent(category);
}

window.onclick = function(event) {
    const modal = document.getElementById('assetModal');
    if (event.target == modal) {
        closeModal();
    }
}
