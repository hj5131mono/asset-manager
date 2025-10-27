// 전체 자산 로데이터

let allAssets = [];
let filteredAssets = [];
let exchangeRate = 1350; // 기본 환율
let currentUser = null;
let rawAssetsData = null; // Firebase 원본 데이터 저장

document.addEventListener('DOMContentLoaded', function() {
    initFirebase();

    // 로그인 확인
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.replace('login.html');
            return;
        }

        currentUser = user;
        await loadAllData();
    });

    // 폼 제출 이벤트
    document.getElementById('assetForm').addEventListener('submit', handleAssetFormSubmit);
});

// 모든 데이터 로드
async function loadAllData() {
    try {
        // 자산 데이터 로드
        const assetsSnapshot = await database.ref('assets').once('value');
        const assets = assetsSnapshot.val() || {
            cash: [],
            stock: [],
            crypto: [],
            realEstate: []
        };

        // Firebase 원본 데이터 저장
        rawAssetsData = assets;

        // 환율 로드 (실시간)
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            if (data.rates && data.rates.KRW) {
                exchangeRate = data.rates.KRW;
                console.log('[EXCHANGE] 환율 조회 성공:', exchangeRate);
            }
        } catch (error) {
            console.error('[EXCHANGE] 환율 조회 실패:', error);
            exchangeRate = 1400; // 기본값
        }

        // 전체 자산을 하나의 배열로 변환
        allAssets = [];

        const categoryNames = {
            cash: '현금/예금',
            stock: '주식/ETF',
            crypto: '채권/원자재',
            realEstate: '가상화폐'
        };

        Object.keys(assets).forEach(category => {
            assets[category].forEach((asset, index) => {
                // 원화 환산
                const amountKRW = asset.currency === 'USD' ? asset.amount * exchangeRate : asset.amount;
                const purchaseAmountKRW = asset.purchaseAmount ?
                    (asset.currency === 'USD' ? asset.purchaseAmount * exchangeRate : asset.purchaseAmount) : 0;

                // 평가손익 및 수익률
                const profitLoss = purchaseAmountKRW > 0 ? amountKRW - purchaseAmountKRW : 0;
                const returnRate = purchaseAmountKRW > 0 ? (profitLoss / purchaseAmountKRW) * 100 : 0;

                allAssets.push({
                    // 기본 정보
                    owner: asset.owner || '-',
                    currency: asset.currency || 'KRW',
                    country: asset.country || '-',
                    institution: asset.institution || '-',
                    accountType: asset.accountType || '-',
                    assetType: categoryNames[category],
                    assetTypeKey: category,
                    liquidity: asset.liquidity || '유동',

                    // 자산 정보
                    name: asset.name,
                    ticker: asset.ticker || '-',
                    quantity: asset.quantity || '-',
                    purchasePrice: asset.purchasePrice || '-',

                    // 투자 정보 (원화/외화)
                    purchaseAmount: asset.purchaseAmount || 0,
                    purchaseAmountKRW: purchaseAmountKRW,

                    // 평가 정보
                    currentPrice: asset.quantity && asset.amount ? (asset.amount / asset.quantity).toFixed(2) : '-',
                    amount: asset.amount,
                    amountKRW: amountKRW,

                    // 수익 정보
                    profitLoss: profitLoss,
                    returnRate: returnRate,

                    // 비중 (나중에 계산)
                    weight: 0,

                    // CRUD를 위한 원본 참조
                    originalCategory: category,
                    originalIndex: index
                });
            });
        });

        // 자산 비중 계산
        const totalAssetValue = allAssets.reduce((sum, asset) => sum + asset.amountKRW, 0);
        allAssets.forEach(asset => {
            asset.weight = totalAssetValue > 0 ? (asset.amountKRW / totalAssetValue) * 100 : 0;
        });

        // 금액 기준 내림차순 정렬
        allAssets.sort((a, b) => b.amountKRW - a.amountKRW);

        filteredAssets = [...allAssets];

        renderTable();
        updateSummary();

    } catch (error) {
        console.error('[LOAD] 데이터 로드 실패:', error);
        document.getElementById('tableContainer').innerHTML = '<div class="no-data">데이터를 불러오는데 실패했습니다.</div>';
    }
}

// 테이블 렌더링
function renderTable() {
    const container = document.getElementById('tableContainer');

    if (filteredAssets.length === 0) {
        container.innerHTML = '<div class="no-data">표시할 자산이 없습니다.</div>';
        return;
    }

    let html = `
        <table class="assets-table">
            <thead>
                <tr>
                    <th>소유자</th>
                    <th>통화</th>
                    <th>국가</th>
                    <th>금융사</th>
                    <th>계좌유형</th>
                    <th>자산유형</th>
                    <th>유동구분</th>
                    <th>자산명</th>
                    <th>Ticker</th>
                    <th>보유량</th>
                    <th>매입가</th>
                    <th>투자원금</th>
                    <th>투자원금(₩)</th>
                    <th>현재가</th>
                    <th>평가금액</th>
                    <th>평가금액(₩)</th>
                    <th>평가손익</th>
                    <th>수익률</th>
                    <th>자산비중</th>
                    <th>작업</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredAssets.forEach(asset => {
        const profitClass = asset.profitLoss > 0 ? 'positive' : asset.profitLoss < 0 ? 'negative' : '';

        html += `
            <tr>
                <td><span class="owner-badge owner-${asset.owner}">${asset.owner}</span></td>
                <td><span class="currency-badge currency-${asset.currency}">${asset.currency}</span></td>
                <td>${asset.country}</td>
                <td>${asset.institution}</td>
                <td>${asset.accountType}</td>
                <td>${asset.assetType}</td>
                <td>${asset.liquidity}</td>
                <td><strong>${asset.name}</strong></td>
                <td>${asset.ticker}</td>
                <td>${asset.quantity !== '-' ? Number(asset.quantity).toLocaleString() : '-'}</td>
                <td>${asset.purchasePrice !== '-' ? Number(asset.purchasePrice).toLocaleString() : '-'}</td>
                <td>${asset.purchaseAmount > 0 ? Number(asset.purchaseAmount).toLocaleString() : '-'}</td>
                <td>${asset.purchaseAmountKRW > 0 ? '₩' + Math.round(asset.purchaseAmountKRW).toLocaleString() : '-'}</td>
                <td>${asset.currentPrice !== '-' ? Number(asset.currentPrice).toLocaleString() : '-'}</td>
                <td>${asset.currency === 'USD' ? '$' : '₩'}${Number(asset.amount).toLocaleString()}</td>
                <td>₩${Math.round(asset.amountKRW).toLocaleString()}</td>
                <td class="${profitClass}">${asset.profitLoss !== 0 ? (asset.profitLoss > 0 ? '+' : '') + '₩' + Math.round(asset.profitLoss).toLocaleString() : '-'}</td>
                <td class="${profitClass}">${asset.returnRate !== 0 ? (asset.returnRate > 0 ? '+' : '') + asset.returnRate.toFixed(2) + '%' : '-'}</td>
                <td>${asset.weight.toFixed(2)}%</td>
                <td>
                    <button onclick="openEditAssetModal('${asset.originalCategory}', ${asset.originalIndex})" class="edit-btn" style="padding: 5px 10px; margin-right: 5px;">수정</button>
                    <button onclick="deleteAsset('${asset.originalCategory}', ${asset.originalIndex})" class="delete-btn" style="padding: 5px 10px;">삭제</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// 요약 정보 업데이트
function updateSummary() {
    const totalAssetValue = filteredAssets.reduce((sum, asset) => sum + asset.amountKRW, 0);
    const totalInvestment = filteredAssets.reduce((sum, asset) => sum + asset.purchaseAmountKRW, 0);
    const totalProfit = totalAssetValue - totalInvestment;
    const avgReturn = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    document.getElementById('totalAssets').textContent = '₩' + Math.round(totalAssetValue).toLocaleString();
    document.getElementById('totalCount').textContent = filteredAssets.length + '개';
    document.getElementById('avgReturn').textContent = (avgReturn > 0 ? '+' : '') + avgReturn.toFixed(2) + '%';
    document.getElementById('totalInvestment').textContent = '₩' + Math.round(totalInvestment).toLocaleString();

    // 색상 적용
    const returnElement = document.getElementById('avgReturn');
    if (avgReturn > 0) {
        returnElement.style.color = '#28a745';
    } else if (avgReturn < 0) {
        returnElement.style.color = '#dc3545';
    }
}

// 필터링
function filterAssets() {
    const ownerFilter = document.getElementById('filterOwner').value;
    const currencyFilter = document.getElementById('filterCurrency').value;
    const countryFilter = document.getElementById('filterCountry').value;
    const assetTypeFilter = document.getElementById('filterAssetType').value;

    filteredAssets = allAssets.filter(asset => {
        if (ownerFilter !== 'all' && asset.owner !== ownerFilter) return false;
        if (currencyFilter !== 'all' && asset.currency !== currencyFilter) return false;
        if (countryFilter !== 'all' && asset.country !== countryFilter) return false;
        if (assetTypeFilter !== 'all' && asset.assetTypeKey !== assetTypeFilter) return false;
        return true;
    });

    renderTable();
    updateSummary();
}

// 필터 초기화
function resetFilters() {
    document.getElementById('filterOwner').value = 'all';
    document.getElementById('filterCurrency').value = 'all';
    document.getElementById('filterCountry').value = 'all';
    document.getElementById('filterAssetType').value = 'all';

    filteredAssets = [...allAssets];
    renderTable();
    updateSummary();
}

// Excel 다운로드 (19개 컬럼)
function exportFullDataToExcel() {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"><title>전체 자산 로데이터</title></head>';
    html += '<body>';
    html += '<table border="1">';

    // 헤더
    html += '<tr style="background-color: #667eea; color: white; font-weight: bold;">';
    html += '<th>소유자</th>';
    html += '<th>통화</th>';
    html += '<th>국가</th>';
    html += '<th>금융사</th>';
    html += '<th>계좌유형</th>';
    html += '<th>자산유형</th>';
    html += '<th>유동구분</th>';
    html += '<th>자산명</th>';
    html += '<th>Ticker</th>';
    html += '<th>보유량</th>';
    html += '<th>매입가</th>';
    html += '<th>투자원금</th>';
    html += '<th>투자원금(원화환산)</th>';
    html += '<th>현재가</th>';
    html += '<th>평가금액</th>';
    html += '<th>평가금액(원화환산)</th>';
    html += '<th>평가손익</th>';
    html += '<th>수익률(%)</th>';
    html += '<th>자산비중(%)</th>';
    html += '</tr>';

    // 데이터
    filteredAssets.forEach(asset => {
        html += '<tr>';
        html += `<td>${asset.owner}</td>`;
        html += `<td>${asset.currency}</td>`;
        html += `<td>${asset.country}</td>`;
        html += `<td>${asset.institution}</td>`;
        html += `<td>${asset.accountType}</td>`;
        html += `<td>${asset.assetType}</td>`;
        html += `<td>${asset.liquidity}</td>`;
        html += `<td>${asset.name}</td>`;
        html += `<td>${asset.ticker}</td>`;
        html += `<td>${asset.quantity !== '-' ? asset.quantity : ''}</td>`;
        html += `<td>${asset.purchasePrice !== '-' ? asset.purchasePrice : ''}</td>`;
        html += `<td>${asset.purchaseAmount > 0 ? asset.purchaseAmount : ''}</td>`;
        html += `<td>${asset.purchaseAmountKRW > 0 ? Math.round(asset.purchaseAmountKRW) : ''}</td>`;
        html += `<td>${asset.currentPrice !== '-' ? asset.currentPrice : ''}</td>`;
        html += `<td>${asset.amount}</td>`;
        html += `<td>${Math.round(asset.amountKRW)}</td>`;
        html += `<td>${asset.profitLoss !== 0 ? Math.round(asset.profitLoss) : ''}</td>`;
        html += `<td>${asset.returnRate !== 0 ? asset.returnRate.toFixed(2) : ''}</td>`;
        html += `<td>${asset.weight.toFixed(2)}</td>`;
        html += '</tr>';
    });

    // 합계
    const totalAssetValue = filteredAssets.reduce((sum, asset) => sum + asset.amountKRW, 0);
    const totalInvestment = filteredAssets.reduce((sum, asset) => sum + asset.purchaseAmountKRW, 0);
    const totalProfit = totalAssetValue - totalInvestment;
    const avgReturn = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    html += '<tr style="font-weight: bold; background-color: #f0f0f0;">';
    html += '<td colspan="12">합계</td>';
    html += `<td>${Math.round(totalInvestment).toLocaleString()}</td>`;
    html += '<td></td>';
    html += '<td></td>';
    html += `<td>${Math.round(totalAssetValue).toLocaleString()}</td>`;
    html += `<td>${Math.round(totalProfit).toLocaleString()}</td>`;
    html += `<td>${avgReturn.toFixed(2)}</td>`;
    html += '<td>100.00</td>';
    html += '</tr>';

    html += '</table>';
    html += '</body></html>';

    // 다운로드
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `전체자산로데이터_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('[EXPORT] Excel 다운로드 완료');
}

// ========== CRUD 기능 ==========

// 자산 추가 모달 열기
function openAddAssetModal() {
    document.getElementById('modalTitle').textContent = '자산 추가';
    document.getElementById('assetForm').reset();
    document.getElementById('editCategory').value = '';
    document.getElementById('editIndex').value = '';
    document.getElementById('assetModal').style.display = 'block';
}

// 자산 수정 모달 열기
function openEditAssetModal(category, index) {
    // 인덱스가 유효한지 확인
    if (!rawAssetsData[category] || !rawAssetsData[category][index]) {
        alert('자산을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    const asset = rawAssetsData[category][index];

    document.getElementById('modalTitle').textContent = '자산 수정';
    document.getElementById('editCategory').value = category;
    document.getElementById('editIndex').value = index;

    document.getElementById('assetOwner').value = asset.owner || '희준';
    document.getElementById('assetCountry').value = asset.country || '한국';
    document.getElementById('assetInstitution').value = asset.institution || '';
    document.getElementById('assetAccountType').value = asset.accountType || '';
    document.getElementById('assetType').value = category;
    document.getElementById('assetLiquidity').value = asset.liquidity || '유동';
    document.getElementById('assetName').value = asset.name;
    document.getElementById('assetCurrency').value = asset.currency || 'KRW';
    document.getElementById('assetTicker').value = asset.ticker || '';
    document.getElementById('assetQuantity').value = asset.quantity || '';
    document.getElementById('assetPurchasePrice').value = asset.purchasePrice || '';
    document.getElementById('assetPurchaseAmount').value = asset.purchaseAmount || '';
    document.getElementById('assetAmount').value = asset.amount;
    document.getElementById('assetNote').value = asset.note || '';

    document.getElementById('assetModal').style.display = 'block';
}

// 모달 닫기
function closeAssetModal() {
    document.getElementById('assetModal').style.display = 'none';
}

// 폼 제출 처리
async function handleAssetFormSubmit(e) {
    e.preventDefault();

    const category = document.getElementById('editCategory').value || document.getElementById('assetType').value;
    const editIndex = document.getElementById('editIndex').value;

    const assetData = {
        owner: document.getElementById('assetOwner').value,
        country: document.getElementById('assetCountry').value,
        institution: document.getElementById('assetInstitution').value.trim(),
        accountType: document.getElementById('assetAccountType').value,
        assetType: category,
        liquidity: document.getElementById('assetLiquidity').value,
        name: document.getElementById('assetName').value,
        currency: document.getElementById('assetCurrency').value,
        ticker: document.getElementById('assetTicker').value.trim(),
        quantity: parseFloat(document.getElementById('assetQuantity').value) || null,
        purchasePrice: parseFloat(document.getElementById('assetPurchasePrice').value) || null,
        purchaseAmount: parseFloat(document.getElementById('assetPurchaseAmount').value) || null,
        amount: parseFloat(document.getElementById('assetAmount').value),
        note: document.getElementById('assetNote').value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (editIndex === '') {
            // 추가
            rawAssetsData[category].push(assetData);
            console.log('[ADD] 자산 추가:', assetData.name);
        } else {
            // 수정
            rawAssetsData[category][parseInt(editIndex)] = assetData;
            console.log('[EDIT] 자산 수정:', assetData.name);
        }

        // Firebase에 저장
        await database.ref('assets').set(rawAssetsData);

        alert('✅ 저장되었습니다!');
        closeAssetModal();

        // 데이터 다시 로드
        await loadAllData();

    } catch (error) {
        console.error('[SAVE] 저장 실패:', error);
        alert('저장에 실패했습니다.');
    }
}

// 자산 삭제
async function deleteAsset(category, index) {
    // 인덱스가 유효한지 확인
    if (!rawAssetsData[category] || !rawAssetsData[category][index]) {
        alert('자산을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    const asset = rawAssetsData[category][index];

    if (!confirm(`"${asset.name}"을(를) 삭제하시겠습니까?`)) {
        return;
    }

    try {
        rawAssetsData[category].splice(index, 1);
        await database.ref('assets').set(rawAssetsData);

        console.log('[DELETE] 자산 삭제:', asset.name);
        alert('✅ 삭제되었습니다!');

        // 데이터 다시 로드
        await loadAllData();

    } catch (error) {
        console.error('[DELETE] 삭제 실패:', error);
        alert('삭제에 실패했습니다.');
    }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('assetModal');
    if (event.target == modal) {
        closeAssetModal();
    }
}
