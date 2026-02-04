// Variables
let scanner = null;
let isScanning = false;
let results = JSON.parse(localStorage.getItem('scanResults')) || [];

// Elements
const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsList = document.getElementById('resultsList');
const toast = document.getElementById('toast');
const scannerBox = document.querySelector('.scanner-box');

// Init
document.addEventListener('DOMContentLoaded', renderResults);

// Toggle Scan
scanBtn.addEventListener('click', () => {
    isScanning ? stopScan() : startScan();
});

// Start Scan
async function startScan() {
    try {
        scanner = new Html5Qrcode("reader");
        
        await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            onSuccess,
            () => {}
        );
        
        isScanning = true;
        scanBtn.classList.add('active');
        scanBtn.querySelector('.btn-text').textContent = 'Arrêter';
        scanBtn.querySelector('.btn-icon').textContent = '■';
        scannerBox.classList.add('scanning');
        
    } catch (err) {
        showToast('❌ Erreur caméra');
        console.error(err);
    }
}

// Stop Scan
async function stopScan() {
    if (scanner) {
        await scanner.stop();
        scanner.clear();
        scanner = null;
    }
    
    isScanning = false;
    scanBtn.classList.remove('active');
    scanBtn.querySelector('.btn-text').textContent = 'Scanner';
    scanBtn.querySelector('.btn-icon').textContent = '▶';
    scannerBox.classList.remove('scanning');
}

// On Success
function onSuccess(code, details) {
    // Éviter doublons
    const lastResult = results[0];
    if (lastResult && lastResult.code === code && Date.now() - lastResult.id < 2000) {
        return;
    }
    
    const result = {
        id: Date.now(),
        code: code,
        format: details.result.format?.formatName || 'Code',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    results.unshift(result);
    if (results.length > 50) results.pop(); // Limite 50
    
    saveResults();
    renderResults();
    
    // Feedback
    if (navigator.vibrate) navigator.vibrate(100);
    showToast('✅ Code scanné !', 'success');
}

// Render Results
function renderResults() {
    if (results.length === 0) {
        resultsList.innerHTML = '<p class="empty">Aucun scan</p>';
        return;
    }
    
    resultsList.innerHTML = results.map(r => `
        <div class="result-item">
            <div class="result-info">
                <div class="result-code">${r.code}</div>
                <div class="result-meta">${r.format} • ${r.time}</div>
            </div>
            <div class="result-actions">
                <button class="action-btn" onclick="copyCode('${r.code}')" title="Copier">📋</button>
                <button class="action-btn" onclick="deleteResult(${r.id})" title="Supprimer">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Copy Code
function copyCode(code) {
    navigator.clipboard.writeText(code)
        .then(() => showToast('📋 Copié !', 'success'))
        .catch(() => showToast('❌ Erreur'));
}

// Delete Result
function deleteResult(id) {
    results = results.filter(r => r.id !== id);
    saveResults();
    renderResults();
}

// Clear All
clearBtn.addEventListener('click', () => {
    if (results.length === 0) return;
    if (confirm('Effacer tout l\'historique ?')) {
        results = [];
        saveResults();
        renderResults();
        showToast('🗑️ Historique effacé');
    }
});

// Save
function saveResults() {
    localStorage.setItem('scanResults', JSON.stringify(results));
}

// Toast
function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 2500);
}
