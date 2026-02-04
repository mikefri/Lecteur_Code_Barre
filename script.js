// Configuration
let html5QrcodeScanner = null;
let scanResults = [];
let totalScans = 0;
let successfulScans = 0;
let currentCamera = 0;
let cameras = [];

// Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const clearBtn = document.getElementById('clearBtn');
const formatSelect = document.getElementById('formatSelect');
const resultsList = document.getElementById('resultsList');
const toast = document.getElementById('toast');

// Formats de codes-barres supportés
const barcodeFormats = {
    all: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.PDF_417,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX
    ],
    qr: [Html5QrcodeSupportedFormats.QR_CODE],
    ean13: [Html5QrcodeSupportedFormats.EAN_13],
    ean8: [Html5QrcodeSupportedFormats.EAN_8],
    code128: [Html5QrcodeSupportedFormats.CODE_128],
    code39: [Html5QrcodeSupportedFormats.CODE_39],
    upc: [Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E],
    datamatrix: [Html5QrcodeSupportedFormats.DATA_MATRIX]
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateStats();
    getCameras();
});

// Obtenir les caméras disponibles
async function getCameras() {
    try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
            cameras = devices;
            if (cameras.length > 1) {
                switchCameraBtn.style.display = 'flex';
            }
        }
    } catch (err) {
        console.error('Erreur lors de la détection des caméras:', err);
    }
}

// Démarrer le scan
startBtn.addEventListener('click', async () => {
    try {
        const selectedFormat = formatSelect.value;
        const formats = barcodeFormats[selectedFormat] || barcodeFormats.all;

        html5QrcodeScanner = new Html5Qrcode("reader");
        
        const cameraId = cameras.length > 0 ? cameras[currentCamera].id : { facingMode: "environment" };
        
        await html5QrcodeScanner.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                formatsToSupport: formats
            },
            onScanSuccess,
            onScanError
        );

        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        if (cameras.length > 1) {
            switchCameraBtn.style.display = 'flex';
        }
        
        showToast('✓ Scanner démarré avec succès', 'success');
    } catch (err) {
        console.error('Erreur de démarrage:', err);
        showToast('✗ Erreur: Impossible de démarrer la caméra', 'error');
    }
});

// Arrêter le scan
stopBtn.addEventListener('click', async () => {
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            
            startBtn.style.display = 'flex';
            stopBtn.style.display = 'none';
            switchCameraBtn.style.display = 'none';
            
            showToast('✓ Scanner arrêté', 'info');
        } catch (err) {
            console.error('Erreur lors de l\'arrêt:', err);
        }
    }
});

// Changer de caméra
switchCameraBtn.addEventListener('click', async () => {
    if (html5QrcodeScanner && cameras.length > 1) {
        await html5QrcodeScanner.stop();
        currentCamera = (currentCamera + 1) % cameras.length;
        
        const selectedFormat = formatSelect.value;
        const formats = barcodeFormats[selectedFormat] || barcodeFormats.all;
        
        await html5QrcodeScanner.start(
            cameras[currentCamera].id,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                formatsToSupport: formats
            },
            onScanSuccess,
            onScanError
        );
        
        showToast(`✓ Caméra changée: ${cameras[currentCamera].label}`, 'info');
    }
});

// Callback succès
function onScanSuccess(decodedText, decodedResult) {
    totalScans++;
    successfulScans++;
    
    const result = {
        id: Date.now(),
        code: decodedText,
        format: decodedResult.result.format.formatName || 'Inconnu',
        timestamp: new Date().toLocaleString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR')
    };
    
    // Éviter les doublons dans les 2 dernières secondes
    const isDuplicate = scanResults.some(r => 
        r.code === result.code && 
        (Date.now() - r.id) < 2000
    );
    
    if (!isDuplicate) {
        scanResults.unshift(result);
        addResultToDOM(result);
        saveToLocalStorage();
        updateStats();
        
        // Vibration si supportée
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        showToast('✓ Code scanné avec succès!', 'success');
    }
}

// Callback erreur
function onScanError(errorMessage) {
    // Les erreurs de scan sont normales, on ne les affiche pas
}

// Ajouter un résultat au DOM
function addResultToDOM(result) {
    const emptyState = resultsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item';
    resultDiv.innerHTML = `
        <div class="result-header">
            <span class="result-type">${result.format}</span>
            <span class="result-time">${result.time}</span>
        </div>
        <div class="result-code">${result.code}</div>
        <div class="result-actions">
            <button class="btn-icon" onclick="copyToClipboard('${result.code}')">
                📋 Copier
            </button>
            <button class="btn-icon" onclick="searchCode('${result.code}')">
                🔍 Rechercher
            </button>
            <button class="btn-icon" onclick="deleteResult(${result.id})">
                🗑️ Supprimer
            </button>
        </div>
    `;
    
    resultsList.insertBefore(resultDiv, resultsList.firstChild);
}

// Copier dans le presse-papier
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Copié dans le presse-papier!', 'success');
    }).catch(err => {
        showToast('✗ Erreur de copie', 'error');
    });
}

// Rechercher le code
function searchCode(code) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(code)}`, '_blank');
}

// Supprimer un résultat
function deleteResult(id) {
    scanResults = scanResults.filter(r => r.id !== id);
    saveToLocalStorage();
    renderResults();
    updateStats();
    showToast('✓ Résultat supprimé', 'info');
}

// Effacer tous les résultats
clearBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment effacer tous les résultats ?')) {
        scanResults = [];
        totalScans = 0;
        successfulScans = 0;
        saveToLocalStorage();
        renderResults();
        updateStats();
        showToast('✓ Tous les résultats ont été effacés', 'info');
    }
});

// Afficher tous les résultats
function renderResults() {
    resultsList.innerHTML = '';
    
    if (scanResults.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <rect x="10" y="20" width="6" height="40" fill="#E8E8E8"/>
                    <rect x="20" y="20" width="4" height="40" fill="#E8E8E8"/>
                    <rect x="28" y="20" width="8" height="40" fill="#E8E8E8"/>
                    <rect x="40" y="20" width="4" height="40" fill="#E8E8E8"/>
                    <rect x="48" y="20" width="6" height="40" fill="#E8E8E8"/>
                    <rect x="58" y="20" width="4" height="40" fill="#E8E8E8"/>
                    <rect x="66" y="20" width="8" height="40" fill="#E8E8E8"/>
                </svg>
                <p>Aucun code scanné</p>
                <span>Cliquez sur "Démarrer le scan" pour commencer</span>
            </div>
        `;
    } else {
        scanResults.forEach(result => addResultToDOM(result));
    }
}

// Mettre à jour les statistiques
function updateStats() {
    document.getElementById('totalScans').textContent = totalScans;
    
    const rate = totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 0;
    document.getElementById('successRate').textContent = `${rate}%`;
    
    const lastTime = scanResults.length > 0 ? scanResults[0].time : '--';
    document.getElementById('lastScanTime').textContent = lastTime;
}

// Toast notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Sauvegarder dans LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('scanResults', JSON.stringify(scanResults));
    localStorage.setItem('totalScans', totalScans);
    localStorage.setItem('successfulScans', successfulScans);
}

// Charger depuis LocalStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('scanResults');
    if (saved) {
        scanResults = JSON.parse(saved);
        renderResults();
    }
    
    totalScans = parseInt(localStorage.getItem('totalScans')) || 0;
    successfulScans = parseInt(localStorage.getItem('successfulScans')) || 0;
}
