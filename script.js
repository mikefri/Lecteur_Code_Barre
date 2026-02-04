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

// Détecter si c'est un lien
function isURL(str) {
    const pattern = /^(https?:\/\/|www\.)[^\s]+$/i;
    return pattern.test(str);
}

// Formater le lien pour l'affichage
function formatURL(url) {
    // Ajouter https:// si commence par www.
    if (url.startsWith('www.')) {
        return 'https://' + url;
    }
    return url;
}

// Obtenir un affichage court du lien
function getShortURL(url) {
    try {
        const urlObj = new URL(formatURL(url));
        return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname.substring(0, 20) + '...' : '');
    } catch {
        return url.substring(0, 30) + '...';
    }
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
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        isLink: isURL(code)
    };
    
    results.unshift(result);
    if (results.length > 50) results.pop();
    
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
    
    resultsList.innerHTML = results.map(r => {
        const isLink = r.isLink || isURL(r.code);
        const fullURL = isLink ? formatURL(r.code) : null;
        
        return `
            <div class="result-item ${isLink ? 'is-link' : ''}">
                <div class="result-info">
                    ${isLink ? `
                        <a href="${fullURL}" target="_blank" rel="noopener" class="result-code result-link">
                            🔗 ${r.code}
                        </a>
                    ` : `
                        <div class="result-code">${r.code}</div>
                    `}
                    <div class="result-meta">${r.format} • ${r.time}</div>
                </div>
                <div class="result-actions">
                    ${isLink ? `
                        <button class="action-btn open-btn" onclick="openLink('${fullURL}')" title="Ouvrir">🌐</button>
                    ` : ''}
                    <button class="action-btn" onclick="copyCode('${r.code}')" title="Copier">📋</button>
                    <button class="action-btn" onclick="deleteResult(${r.id})" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Open Link
function openLink(url) {
    window.open(url, '_blank', 'noopener');
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
