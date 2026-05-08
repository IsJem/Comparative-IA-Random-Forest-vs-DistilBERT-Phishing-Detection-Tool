// popup.js - Sistema de detección de phishing con Random Forest (modelo superior)
// Compatible con tema oscuro/claro y servidor Flask en puerto 5001

console.log("🌲 Popup de Random Forest cargado");

// ==================== VARIABLES ====================
let textoActual = '';
let rfConfianzaActual = 0;
let rfPrediccion = '';
let feedbackEnviado = false;

// ==================== INICIALIZAR TEMA ====================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const savedTheme = localStorage.getItem('phishing_theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
}

// ==================== CAMBIAR TEMA ====================
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('phishing_theme', 'light');
            themeToggle.textContent = '🌙';
            console.log("🌞 Tema claro activado");
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('phishing_theme', 'dark');
            themeToggle.textContent = '☀️';
            console.log("🌙 Tema oscuro activado");
        }
    });
}

// ==================== RECIBIR TEXTO DEL MENÚ CONTEXTUAL ====================
function loadSelectedText() {
    chrome.storage.local.get(['selectedText'], async (result) => {
        console.log("📦 Texto recuperado del storage:", result.selectedText ? "Sí" : "No");
        
        if (result.selectedText && result.selectedText.length > 0) {
            textoActual = result.selectedText;
            await analizarTexto(textoActual);
            // Limpiar después de usar
            chrome.storage.local.remove('selectedText');
        } else {
            console.log("⚠️ No hay texto seleccionado para analizar");
            const statusDiv = document.getElementById('status');
            if (statusDiv) {
                statusDiv.innerHTML = '⚠️ Selecciona un texto → Clic derecho → Analizar con Random Forest';
            }
        }
    });
}

// ==================== ACTUALIZAR BARRA DE CONFIANZA ====================
function actualizarBarraConfianza(confidence, esPhishing) {
    const fill = document.getElementById('confidenceFill');
    if (!fill) return;
    
    const porcentaje = (confidence * 100).toFixed(1);
    fill.style.width = `${porcentaje}%`;
    
    // Cambiar color según tipo de predicción
    if (esPhishing) {
        fill.className = 'confidence-fill phishing';
    } else {
        fill.className = 'confidence-fill safe';
    }
    
    console.log(`📊 Barra de confianza actualizada: ${porcentaje}% (${esPhishing ? 'PHISHING' : 'SEGURO'})`);
}

// ==================== MOSTRAR RESULTADO ====================
function mostrarResultadoRF(data) {
    const isPhishing = data.result === 'PHISHING';
    const confidence = (data.confidence * 100).toFixed(1);
    
    const verdictElement = document.getElementById('rfVerdict');
    const confidenceElement = document.getElementById('rfConfidence');
    
    if (verdictElement) {
        verdictElement.innerHTML = isPhishing ? '🚨 PHISHING' : '✅ SEGURO';
        verdictElement.className = `verdict ${isPhishing ? 'phishing' : 'safe'}`;
    }
    
    if (confidenceElement) {
        confidenceElement.innerHTML = `Confianza: ${confidence}%`;
    }
    
    // Actualizar barra de confianza
    actualizarBarraConfianza(data.confidence, isPhishing);
}

// ==================== MOSTRAR SECCIÓN DE FEEDBACK ====================
function mostrarFeedback() {
    if (!rfPrediccion) return;
    
    const feedbackSection = document.getElementById('feedbackSection');
    if (feedbackSection) {
        feedbackSection.style.display = 'block';
        document.getElementById('feedbackMsg').innerHTML = '';
        console.log("📝 Sección de feedback mostrada");
    }
}

// ==================== ANÁLISIS CON RANDOM FOREST ====================
async function analizarTexto(texto) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.innerHTML = '🔄 Analizando con Random Forest...';
    
    feedbackEnviado = false;
    rfPrediccion = '';
    
    console.log(`🔍 Analizando texto (${texto.length} caracteres):`, texto.substring(0, 100));

    try {
        const res = await fetch('http://127.0.0.1:5001/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texto })
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("📡 Respuesta del servidor RF:", data);
        
        rfPrediccion = data.result;
        rfConfianzaActual = data.confidence;
        mostrarResultadoRF(data);
        
        // Mostrar sección de feedback
        mostrarFeedback();
        
        if (statusDiv) statusDiv.innerHTML = '✅ Análisis completado con Random Forest';
        
    } catch (error) {
        console.error('❌ Error al analizar con Random Forest:', error);
        document.getElementById('rfVerdict').innerHTML = '❌ Error de conexión';
        document.getElementById('rfConfidence').innerHTML = 'No se pudo conectar con el servidor RF (puerto 5001)';
        if (statusDiv) statusDiv.innerHTML = '❌ Error: Verifica que el servidor Flask esté corriendo en puerto 5001';
    }
}

// ==================== ENVIAR FEEDBACK ====================
async function enviarFeedback(esCorrecto) {
    if (feedbackEnviado) {
        const msgDiv = document.getElementById('feedbackMsg');
        if (msgDiv) msgDiv.innerHTML = '⚠️ Ya enviaste feedback para este análisis';
        return false;
    }
    
    if (!textoActual) {
        alert('No hay texto para evaluar');
        return false;
    }
    
    // Determinar tipo de corrección
    let correccion = '';
    if (esCorrecto) {
        correccion = 'correct';
    } else {
        // Si es incorrecto, determinar si fue falso positivo o falso negativo
        correccion = rfPrediccion === 'PHISHING' ? 'falso_positivo' : 'falso_negativo';
    }
    
    console.log(`📝 Enviando feedback: ${correccion} para predicción ${rfPrediccion}`);
    
    try {
        const res = await fetch('http://127.0.0.1:5001/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textoActual,
                original_prediction: rfPrediccion,
                correction: correccion,
                confidence: rfConfianzaActual
            })
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const result = await res.json();
        
        if (result && result.success) {
            feedbackEnviado = true;
            const msgDiv = document.getElementById('feedbackMsg');
            if (msgDiv) {
                const mensaje = esCorrecto 
                    ? '✅ ¡Gracias! El modelo acertó. Tu feedback ayuda a mejorar.'
                    : `✅ Feedback guardado. ${rfPrediccion === 'PHISHING' ? 'Falso positivo' : 'Falso negativo'} reportado.`;
                msgDiv.innerHTML = mensaje;
            }
            
            // Deshabilitar botones
            const correctBtn = document.getElementById('feedbackCorrect');
            const wrongBtn = document.getElementById('feedbackWrong');
            if (correctBtn) correctBtn.disabled = true;
            if (wrongBtn) wrongBtn.disabled = true;
            
            console.log("✅ Feedback enviado correctamente");
            return true;
        } else {
            throw new Error('Respuesta del servidor indica fallo');
        }
        
    } catch (error) {
        console.error('❌ Error al enviar feedback:', error);
        const msgDiv = document.getElementById('feedbackMsg');
        if (msgDiv) msgDiv.innerHTML = '❌ Error al guardar feedback. ¿El servidor está corriendo?';
        return false;
    }
}

// ==================== LIMPIAR RESULTADOS ====================
function setupClearButton() {
    const clearBtn = document.getElementById('clearBtn');
    if (!clearBtn) return;
    
    clearBtn.addEventListener('click', () => {
        document.getElementById('rfVerdict').innerHTML = '⏳ Esperando...';
        document.getElementById('rfConfidence').innerHTML = '';
        document.getElementById('confidenceFill').style.width = '0%';
        document.getElementById('feedbackSection').style.display = 'none';
        document.getElementById('feedbackMsg').innerHTML = '';
        textoActual = '';
        rfConfianzaActual = 0;
        rfPrediccion = '';
        feedbackEnviado = false;
        
        const statusDiv = document.getElementById('status');
        if (statusDiv) statusDiv.innerHTML = '✅ Listo. Selecciona texto → Clic derecho → Analizar con Random Forest';
        
        console.log("🗑️ Resultados limpiados");
    });
}

// ==================== BOTÓN DE ESTADÍSTICAS ====================
function setupStatsButton() {
    const statsBtn = document.getElementById('statsBtn');
    if (!statsBtn) return;
    
    statsBtn.addEventListener('click', () => {
        console.log("📊 Abriendo página de estadísticas");
        window.open("http://127.0.0.1:5001/stats", "_blank");
    });
}

// ==================== CONFIGURAR BOTONES DE FEEDBACK ====================
function setupFeedbackButtons() {
    const feedbackCorrect = document.getElementById('feedbackCorrect');
    const feedbackWrong = document.getElementById('feedbackWrong');
    
    if (feedbackCorrect) {
        feedbackCorrect.addEventListener('click', async () => {
            console.log("👍 Usuario marcó como correcto");
            await enviarFeedback(true);
        });
    }
    
    if (feedbackWrong) {
        feedbackWrong.addEventListener('click', async () => {
            console.log("👎 Usuario marcó como incorrecto");
            await enviarFeedback(false);
        });
    }
}

// ==================== INICIALIZACIÓN ====================
function init() {
    console.log("🚀 Inicializando popup...");
    
    // Inicializar tema
    initTheme();
    setupThemeToggle();
    
    // Configurar botones
    setupClearButton();
    setupStatsButton();
    setupFeedbackButtons();
    
    // Cargar texto seleccionado
    loadSelectedText();
    
    console.log("✅ Popup.js de Random Forest inicializado correctamente");
    console.log("📡 Conectando a servidor RF en http://127.0.0.1:5001");
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}