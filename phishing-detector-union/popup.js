// popup.js - Con ÁRBITRO integrado y sistema completo de feedback

console.log("⚖️ Popup con ÁRBITRO integrado cargado");

// ==================== VARIABLES GLOBALES ====================
let textoActual = '';
let rfConfianzaActual = 0;
let dbConfianzaActual = 0;
let rfPrediccion = '';
let dbPrediccion = '';
let feedbackEnviado = false;
let ultimaDecicionArbitro = null;

// ==================== ESTADO DE FEEDBACK ====================
let feedbackState = {
    rf_acerto: null,
    db_acerto: null,
    arbitro_acerto: null,
    ambos_correctos: null,
    ambos_incorrectos: null
};

// ==================== ÁRBITRO INTEGRADO ====================
const ARBITRO_CONFIG = {
    pesos: {
        expertise_rf: 0.55,
        expertise_db: 0.25,
        confianza: 0.10,
        historial: 0.10
    },
    umbral_db_gana: 0.65,
    bonus_rf: 0.15
};

let historialArbitro = {
    rf_aciertos: 0,
    db_aciertos: 0,
    total_discrepancias: 0,
    aciertos_arbitro: 0
};

function cargarHistorial() {
    chrome.storage.local.get(['historialArbitro'], (result) => {
        if (result.historialArbitro) {
            historialArbitro = result.historialArbitro;
            console.log("📊 Historial cargado:", historialArbitro);
        }
    });
}

function guardarHistorial() {
    chrome.storage.local.set({ historialArbitro: historialArbitro });
}

function arbitroDecidir(texto, rf_conf, db_conf, rf_pred, db_pred) {
    const texto_lower = texto.toLowerCase();
    const largo = texto.length;
    
    const palabras_es = ['el', 'la', 'los', 'las', 'de', 'y', 'que', 'en', 'un', 'por', 'para'];
    const palabras_en = ['the', 'a', 'an', 'and', 'of', 'to', 'in', 'for', 'on', 'with'];
    
    let es_espanol = 0;
    let es_ingles = 0;
    
    palabras_es.forEach(p => { if (texto_lower.includes(p)) es_espanol++; });
    palabras_en.forEach(p => { if (texto_lower.includes(p)) es_ingles++; });
    
    es_espanol = es_espanol > 2;
    const es_ingles_puro = (es_ingles > 3) && !es_espanol;
    
    const tiene_url = texto_lower.includes('http') || texto_lower.includes('www.') || texto_lower.includes('.com');
    const tiene_errores = ['verifiy', 'acount', 'passwrod', 'suspendid', 'verify', 'account'].some(e => texto_lower.includes(e));
    const tiene_urgencia = ['urgente', 'inmediato', 'warning', 'alert', 'suspendido'].some(u => texto_lower.includes(u));
    const texto_muy_corto = largo < 100;
    const texto_largo = largo > 500;
    const lenguaje_neutral = !tiene_url && !tiene_urgencia && !tiene_errores;
    
    let puntaje_rf = 0.60 + ARBITRO_CONFIG.bonus_rf;
    let razones_rf = ["benchmark MDPI (RF superior)"];
    
    if (es_espanol) { puntaje_rf += 0.15; razones_rf.push("español"); }
    if (tiene_url) { puntaje_rf += 0.12; razones_rf.push("URLs"); }
    if (texto_largo) { puntaje_rf += 0.08; razones_rf.push("texto largo"); }
    if (tiene_errores) { puntaje_rf += 0.10; razones_rf.push("errores ortográficos"); }
    if (tiene_urgencia) { puntaje_rf += 0.08; razones_rf.push("lenguaje urgente"); }
    puntaje_rf = Math.min(0.95, puntaje_rf);
    
    let puntaje_db = 0;
    let razones_db = [];
    
    if (es_ingles_puro && texto_muy_corto) {
        puntaje_db = 0.80;
        razones_db.push("inglés puro + texto corto");
    } else if (texto_muy_corto && lenguaje_neutral) {
        puntaje_db = 0.60;
        razones_db.push("texto corto y neutral");
    } else {
        puntaje_db = 0.20;
    }
    
    let confianza_score = 0.5;
    if (rf_conf > db_conf) confianza_score = 0.6;
    else if (db_conf > rf_conf) confianza_score = 0.4;
    
    let ganador = 'rf';
    let confianza_arbitro = 70;
    let razon = "";
    
    if (puntaje_db >= ARBITRO_CONFIG.umbral_db_gana) {
        ganador = 'db';
        confianza_arbitro = Math.round(puntaje_db * 100);
        razon = `DistilBERT: ${razones_db[0]}`;
    } else {
        ganador = 'rf';
        confianza_arbitro = Math.round((puntaje_rf * 0.7 + 0.3) * 100);
        razon = `Random Forest: ${razones_rf.slice(0, 2).join(', ')}`;
    }
    
    console.log(`⚖️ ÁRBITRO: ${ganador === 'rf' ? 'RF gana' : 'DB gana'} - ${razon}`);
    
    return { ganador, confianza_arbitro, razon };
}

// ==================== FUNCIONES DE UI ====================
function actualizarBarraConfianza(modelo, confianza, esPhishing) {
    const fill = document.getElementById(`${modelo}ConfidenceFill`);
    if (fill) {
        fill.style.width = `${(confianza * 100).toFixed(1)}%`;
        fill.className = `confidence-fill ${esPhishing ? 'phishing' : 'safe'}`;
    }
}

function mostrarResultadoRF(prediccion, confianza) {
    const isPhishing = prediccion === 'PHISHING';
    const verdictEl = document.getElementById('rfVerdict');
    const confidenceEl = document.getElementById('rfConfidence');
    
    if (verdictEl) {
        verdictEl.innerHTML = isPhishing ? '🚨 PHISHING' : '✅ SEGURO';
        verdictEl.className = `verdict ${isPhishing ? 'phishing' : 'safe'}`;
    }
    if (confidenceEl) {
        confidenceEl.innerHTML = `Confianza: ${(confianza * 100).toFixed(1)}%`;
    }
    actualizarBarraConfianza('rf', confianza, isPhishing);
}

function mostrarResultadoDB(prediccion, confianza) {
    const isPhishing = prediccion === 'PHISHING';
    const verdictEl = document.getElementById('dbVerdict');
    const confidenceEl = document.getElementById('dbConfidence');
    
    if (verdictEl) {
        verdictEl.innerHTML = isPhishing ? '🚨 PHISHING' : '✅ SEGURO';
        verdictEl.className = `verdict ${isPhishing ? 'phishing' : 'safe'}`;
    }
    if (confidenceEl) {
        confidenceEl.innerHTML = `Confianza: ${(confianza * 100).toFixed(1)}%`;
    }
    actualizarBarraConfianza('db', confianza, isPhishing);
}

function mostrarResultadoArbitro(arbitraje, resultadoFinal) {
    const card = document.getElementById('arbitroCard');
    if (card) card.style.display = 'block';
    
    const ganadorSpan = document.getElementById('arbitroGanador');
    const razonSpan = document.getElementById('arbitroRazon');
    const confianzaSpan = document.getElementById('arbitroConfianza');
    const resultadoSpan = document.getElementById('resultadoFinal');
    
    if (ganadorSpan) {
        ganadorSpan.innerHTML = arbitraje.ganador === 'rf' ? '🌲 Random Forest' : '🤖 DistilBERT';
        ganadorSpan.style.color = arbitraje.ganador === 'rf' ? '#2e7d32' : '#1565c0';
    }
    if (razonSpan) razonSpan.innerHTML = arbitraje.razon;
    if (confianzaSpan) confianzaSpan.innerHTML = `Confianza del Árbitro: ${arbitraje.confianza_arbitro}%`;
    if (resultadoSpan) {
        resultadoSpan.innerHTML = resultadoFinal === 'PHISHING' ? '🚨 PHISHING' : '✅ SEGURO';
        resultadoSpan.style.color = resultadoFinal === 'PHISHING' ? '#dc3545' : '#28a745';
    }
}

// ==================== FUNCIONES DE FEEDBACK UI ====================
function resetFeedbackState() {
    feedbackState = {
        rf_acerto: null,
        db_acerto: null,
        arbitro_acerto: null,
        ambos_correctos: null,
        ambos_incorrectos: null
    };
    
    document.querySelectorAll('.feedback-btn').forEach(btn => {
        if (btn) {
            btn.style.opacity = '1';
            btn.style.border = 'none';
        }
    });
}

function mostrarFeedbackStatus(mensaje, tipo) {
    const statusMsg = document.getElementById('feedbackStatusMsg');
    if (statusMsg) {
        statusMsg.innerHTML = mensaje;
        statusMsg.style.color = tipo === 'success' ? '#4caf50' : (tipo === 'error' ? '#f44336' : '#ff9800');
        setTimeout(() => {
            statusMsg.innerHTML = '';
        }, 3000);
    } else {
        alert(mensaje);
    }
}

function deshabilitarBotonesFeedback() {
    const btns = ['feedbackRFCorrect', 'feedbackDBCorrect', 'feedbackBothCorrect', 
                  'feedbackBothWrong', 'feedbackArbitroCorrect', 'feedbackArbitroWrong',
                  'submitFeedbackBtn'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    });
}

function marcarRFCorrecto() {
    resetFeedbackState();
    feedbackState.rf_acerto = true;
    feedbackState.db_acerto = false;
    const btn = document.getElementById('feedbackRFCorrect');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

function marcarDBCorrecto() {
    resetFeedbackState();
    feedbackState.rf_acerto = false;
    feedbackState.db_acerto = true;
    const btn = document.getElementById('feedbackDBCorrect');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

function marcarAmbosCorrectos() {
    resetFeedbackState();
    feedbackState.ambos_correctos = true;
    feedbackState.rf_acerto = true;
    feedbackState.db_acerto = true;
    const btn = document.getElementById('feedbackBothCorrect');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

function marcarAmbosIncorrectos() {
    resetFeedbackState();
    feedbackState.ambos_incorrectos = true;
    feedbackState.rf_acerto = false;
    feedbackState.db_acerto = false;
    const btn = document.getElementById('feedbackBothWrong');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

function marcarArbitroCorrecto() {
    feedbackState.arbitro_acerto = true;
    const btn = document.getElementById('feedbackArbitroCorrect');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

function marcarArbitroIncorrecto() {
    feedbackState.arbitro_acerto = false;
    const btn = document.getElementById('feedbackArbitroWrong');
    if (btn) btn.style.border = '3px solid #ffeb3b';
}

// ==================== MOSTRAR SECCIÓN DE FEEDBACK ====================
function mostrarFeedbackSection(coinciden) {
    const feedbackSection = document.getElementById('feedbackSection');
    const modelosCoincidenSection = document.getElementById('modelosCoincidenFeedback');
    const modelosDiscrepanSection = document.getElementById('modelosDiscrepanFeedback');
    const arbitroSubsection = document.getElementById('arbitroFeedbackSubsection');
    const arbitroDecisionDisplay = document.getElementById('arbitroDecisionDisplay');
    
    if (!feedbackSection) return;
    
    feedbackSection.style.display = 'block';
    
    if (coinciden) {
        if (modelosCoincidenSection) modelosCoincidenSection.style.display = 'block';
        if (modelosDiscrepanSection) modelosDiscrepanSection.style.display = 'none';
        if (arbitroSubsection) arbitroSubsection.style.display = 'none';
    } else {
        if (modelosCoincidenSection) modelosCoincidenSection.style.display = 'none';
        if (modelosDiscrepanSection) modelosDiscrepanSection.style.display = 'block';
        if (arbitroSubsection) arbitroSubsection.style.display = 'block';
        
        if (arbitroDecisionDisplay && ultimaDecicionArbitro) {
            arbitroDecisionDisplay.innerHTML = `🏆 El ÁRBITRO decidió que ganaba: <strong>${ultimaDecicionArbitro.ganador === 'rf' ? 'Random Forest' : 'DistilBERT'}</strong><br>📝 Razón: ${ultimaDecicionArbitro.razon}`;
        }
    }
    
    resetFeedbackState();
}

// ==================== ENVIAR FEEDBACK A LOS SERVIDORES ====================
async function enviarFeedbackCompleto() {
    console.log("🔍 Enviando feedback a servidores...");
    
    if (!textoActual) {
        mostrarFeedbackStatus('No hay texto para evaluar', 'error');
        return;
    }
    
    const haySeleccionModelos = (feedbackState.rf_acerto !== null || 
                                   feedbackState.ambos_correctos !== null || 
                                   feedbackState.ambos_incorrectos !== null);
    
    if (!haySeleccionModelos) {
        mostrarFeedbackStatus('Por favor, indica si RF y/o DB acertaron', 'warning');
        return;
    }
    
    if (feedbackEnviado) {
        mostrarFeedbackStatus('Feedback ya enviado para este análisis', 'warning');
        return;
    }
    
    // Determinar correcciones para cada modelo
    let rfCorreccion = null;
    let dbCorreccion = null;
    
    if (feedbackState.ambos_correctos) {
        rfCorreccion = 'correct';
        dbCorreccion = 'correct';
    } else if (feedbackState.ambos_incorrectos) {
        rfCorreccion = rfPrediccion === 'PHISHING' ? 'falso_positivo' : 'falso_negativo';
        dbCorreccion = dbPrediccion === 'PHISHING' ? 'falso_positivo' : 'falso_negativo';
    } else {
        // Solo uno acertó
        if (feedbackState.rf_acerto === true) {
            rfCorreccion = 'correct';
            dbCorreccion = dbPrediccion === 'PHISHING' ? 'falso_positivo' : 'falso_negativo';
        } else if (feedbackState.db_acerto === true) {
            dbCorreccion = 'correct';
            rfCorreccion = rfPrediccion === 'PHISHING' ? 'falso_positivo' : 'falso_negativo';
        }
    }
    
    console.log("📤 RF corrección:", rfCorreccion);
    console.log("📤 DB corrección:", dbCorreccion);
    
    let exitoRF = true;
    let exitoDB = true;
    
    // Enviar feedback a Random Forest (puerto 5001)
    if (rfCorreccion) {
        try {
            const rfRes = await fetch('http://127.0.0.1:5001/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textoActual,
                    original_prediction: rfPrediccion,
                    correction: rfCorreccion,
                    confidence: rfConfianzaActual
                })
            });
            exitoRF = rfRes.ok;
            console.log("📡 RF feedback:", exitoRF ? "✅" : "❌");
        } catch (e) {
            exitoRF = false;
            console.error("Error RF:", e);
        }
    }
    
    // Enviar feedback a DistilBERT (puerto 5000)
    if (dbCorreccion) {
        try {
            const dbRes = await fetch('http://127.0.0.1:5000/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textoActual,
                    original_prediction: dbPrediccion,
                    correction: dbCorreccion,
                    confidence: dbConfianzaActual
                })
            });
            exitoDB = dbRes.ok;
            console.log("📡 DB feedback:", exitoDB ? "✅" : "❌");
        } catch (e) {
            exitoDB = false;
            console.error("Error DB:", e);
        }
    }
    
    if (exitoRF && exitoDB) {
        mostrarFeedbackStatus('✅ Feedback guardado en los servidores', 'success');
        feedbackEnviado = true;
        deshabilitarBotonesFeedback();
        
        // Actualizar historial local
        historialArbitro.rf_aciertos += (feedbackState.rf_acerto === true || feedbackState.ambos_correctos) ? 1 : 0;
        historialArbitro.db_aciertos += (feedbackState.db_acerto === true || feedbackState.ambos_correctos) ? 1 : 0;
        guardarHistorial();
        
    } else {
        mostrarFeedbackStatus('❌ Error al guardar feedback en los servidores', 'error');
    }
}

// ==================== CONFIGURAR EVENTOS ====================
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('phishing_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
            themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        });
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            mostrarResultadoRF('⏳ Esperando...', 0);
            mostrarResultadoDB('⏳ Esperando...', 0);
            const arbitroCard = document.getElementById('arbitroCard');
            if (arbitroCard) arbitroCard.style.display = 'none';
            const feedbackSection = document.getElementById('feedbackSection');
            if (feedbackSection) feedbackSection.style.display = 'none';
            const statusDiv = document.getElementById('status');
            if (statusDiv) statusDiv.innerHTML = '✅ Listo. Selecciona texto → Clic derecho → Analizar';
            feedbackEnviado = false;
            textoActual = '';
            resetFeedbackState();
        });
    }
    
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            window.open("http://127.0.0.1:5000/comparator", "_blank");
        });
    }
}

function setupFeedbackEvents() {
    document.getElementById('feedbackRFCorrect')?.addEventListener('click', marcarRFCorrecto);
    document.getElementById('feedbackDBCorrect')?.addEventListener('click', marcarDBCorrecto);
    document.getElementById('feedbackBothCorrect')?.addEventListener('click', marcarAmbosCorrectos);
    document.getElementById('feedbackBothWrong')?.addEventListener('click', marcarAmbosIncorrectos);
    document.getElementById('feedbackArbitroCorrect')?.addEventListener('click', marcarArbitroCorrecto);
    document.getElementById('feedbackArbitroWrong')?.addEventListener('click', marcarArbitroIncorrecto);
    document.getElementById('submitFeedbackBtn')?.addEventListener('click', enviarFeedbackCompleto);
    document.getElementById('clearFeedbackBtn')?.addEventListener('click', resetFeedbackState);
}

// ==================== ANÁLISIS PRINCIPAL ====================
async function analizarTexto(texto) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.innerHTML = '🔄 Analizando con RF y DB...';
    
    feedbackEnviado = false;
    
    mostrarResultadoRF('⏳ Esperando...', 0);
    mostrarResultadoDB('⏳ Esperando...', 0);
    const arbitroCard = document.getElementById('arbitroCard');
    if (arbitroCard) arbitroCard.style.display = 'none';
    const feedbackSection = document.getElementById('feedbackSection');
    if (feedbackSection) feedbackSection.style.display = 'none';
    
    try {
        const rfRes = await fetch('http://127.0.0.1:5001/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texto })
        });
        const rfData = await rfRes.json();
        
        const dbRes = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texto })
        });
        const dbData = await dbRes.json();
        
        rfPrediccion = rfData.result;
        rfConfianzaActual = rfData.confidence;
        dbPrediccion = dbData.result;
        dbConfianzaActual = dbData.confidence;
        
        mostrarResultadoRF(rfPrediccion, rfConfianzaActual);
        mostrarResultadoDB(dbPrediccion, dbConfianzaActual);
        
        const coinciden = rfPrediccion === dbPrediccion;
        
        if (!coinciden) {
            const arbitraje = arbitroDecidir(texto, rfConfianzaActual, dbConfianzaActual, rfPrediccion, dbPrediccion);
            ultimaDecicionArbitro = arbitraje;
            const resultadoFinal = arbitraje.ganador === 'rf' ? rfPrediccion : dbPrediccion;
            mostrarResultadoArbitro(arbitraje, resultadoFinal);
        } else {
            ultimaDecicionArbitro = null;
        }
        
        mostrarFeedbackSection(coinciden);
        
        if (statusDiv) statusDiv.innerHTML = '✅ Análisis completado';
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarResultadoRF('Error', 0);
        mostrarResultadoDB('Error', 0);
        if (statusDiv) statusDiv.innerHTML = '❌ Error: Verifica servidores (puertos 5001 y 5000)';
    }
}

// ==================== INICIALIZAR ====================
function init() {
    console.log("🚀 Inicializando popup con ÁRBITRO integrado...");
    
    const savedTheme = localStorage.getItem('phishing_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = '☀️';
    }
    
    setupEventListeners();
    setupFeedbackEvents();  // ⭐ IMPORTANTE: Conecta los botones de feedback
    cargarHistorial();
    
    chrome.storage.local.get(['selectedText'], async (result) => {
        if (result.selectedText && result.selectedText.length > 0) {
            textoActual = result.selectedText;
            console.log(`📝 Texto: ${textoActual.substring(0, 80)}...`);
            await analizarTexto(textoActual);
            chrome.storage.local.remove('selectedText');
        }
    });
    
    console.log("✅ Popup.js listo - ÁRBITRO integrado");
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}