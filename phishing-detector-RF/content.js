// content.js - Extracción de texto mejorada para Phishing Detector con Random Forest
// Modelo superior: más rápido, ligero y preciso para CPU local

console.log("🌲 Phishing Detector (Random Forest) - Content script cargado");

// ==================== CONSTANTES ====================
const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 5000; // Límite para no sobrecargar el modelo

// ==================== EXTRACCIÓN DE TEXTO PRINCIPAL ====================
function extractSelectedText() {
    let texto = "";
    let fuente = "";

    // Método 1: Texto seleccionado directamente por el usuario
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
        texto = selection.toString().trim();
        fuente = "selección directa";
        console.log(`✅ Texto obtenido por ${fuente}: ${texto.substring(0, 50)}... (${texto.length} chars)`);
        return { texto, fuente };
    }

    // Método 2: Gmail - cuerpo del email
    if (window.location.hostname.includes("mail.google.com")) {
        // Selectores comunes para el cuerpo del email en Gmail
        const gmailSelectors = [
            '.a3s.aiL',           // Cuerpo del email (clásico)
            '.ii.gt',             // Contenedor de mensajes
            '.adn .gs',           // Cuerpo en conversaciones
            'div[role="textbox"]', // Editor de redacción
            '.Ak .aCi',           // Fragmentos de texto
            '.yh .y6'             // Vista de conversación
        ];
        
        for (const selector of gmailSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText && element.innerText.trim().length > MIN_TEXT_LENGTH) {
                texto = element.innerText.trim();
                fuente = `Gmail (${selector})`;
                console.log(`✅ Texto obtenido de ${fuente}: ${texto.substring(0, 50)}... (${texto.length} chars)`);
                return { texto, fuente };
            }
        }
    }

    // Método 3: Outlook / Hotmail
    if (window.location.hostname.includes("outlook.com") || window.location.hostname.includes("hotmail.com")) {
        const outlookSelectors = [
            '[role="presentation"] ._1ZJqF',  // Cuerpo de email
            '.x_ee8dabf5',                    // Contenedor de mensajes
            '.ms-Fabric div[role="textbox"]'  // Editor
        ];
        
        for (const selector of outlookSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText && element.innerText.trim().length > MIN_TEXT_LENGTH) {
                texto = element.innerText.trim();
                fuente = `Outlook (${selector})`;
                console.log(`✅ Texto obtenido de ${fuente}: ${texto.substring(0, 50)}... (${texto.length} chars)`);
                return { texto, fuente };
            }
        }
    }

    // Método 4: Yahoo Mail
    if (window.location.hostname.includes("mail.yahoo.com")) {
        const yahooSelectors = [
            '.message-body',
            '.body-content',
            '[data-test-id="message-view-body"]'
        ];
        
        for (const selector of yahooSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText && element.innerText.trim().length > MIN_TEXT_LENGTH) {
                texto = element.innerText.trim();
                fuente = `Yahoo Mail (${selector})`;
                console.log(`✅ Texto obtenido de ${fuente}: ${texto.substring(0, 50)}... (${texto.length} chars)`);
                return { texto, fuente };
            }
        }
    }

    // Método 5: Fallback - cualquier elemento con texto largo
    const allElements = document.querySelectorAll('p, div, span, article, section');
    for (const element of allElements) {
        const elementText = element.innerText?.trim();
        if (elementText && elementText.length > MIN_TEXT_LENGTH && elementText.length < MAX_TEXT_LENGTH) {
            // Evitar duplicados (elementos padres que contienen hijos ya procesados)
            const hasRelevantChild = element.querySelectorAll('p, div, article').length > 0;
            if (!hasRelevantChild || elementText.split(' ').length > 50) {
                texto = elementText;
                fuente = "fallback (elemento largo)";
                console.log(`✅ Texto obtenido por ${fuente}: ${texto.substring(0, 50)}... (${texto.length} chars)`);
                return { texto, fuente };
            }
        }
    }

    console.warn("⚠️ No se pudo extraer ningún texto válido");
    return { texto: "", fuente: "ninguna" };
}

// ==================== LIMPIAR Y PREPROCESAR TEXTO ====================
function limpiarTexto(texto) {
    if (!texto) return "";
    
    let cleaned = texto
        // Eliminar espacios múltiples
        .replace(/\s+/g, ' ')
        // Eliminar URLs (opcional, a veces son relevantes)
        // .replace(/https?:\/\/[^\s]+/g, '[URL]')
        // Eliminar caracteres especiales repetidos
        .replace(/[^\w\s\u00C0-\u00FF@.,!?¿¡-]/g, ' ')
        // Normalizar espacios
        .trim();
    
    // Limitar longitud máxima
    if (cleaned.length > MAX_TEXT_LENGTH) {
        cleaned = cleaned.substring(0, MAX_TEXT_LENGTH);
        console.log(`✂️ Texto truncado a ${MAX_TEXT_LENGTH} caracteres`);
    }
    
    return cleaned;
}

// ==================== ENVIAR TEXTO AL BACKGROUND ====================
function enviarTextoAlBackground(texto, fuente) {
    if (!texto || texto.length < MIN_TEXT_LENGTH) {
        console.warn(`⚠️ Texto muy corto (${texto?.length || 0}/${MIN_TEXT_LENGTH} chars) para analizar`);
        
        // Notificar al usuario mediante el background
        chrome.runtime.sendMessage({
            type: "TEXTO_DEMASIADO_CORTO",
            length: texto?.length || 0,
            minRequired: MIN_TEXT_LENGTH
        });
        
        return false;
    }
    
    const textoLimpio = limpiarTexto(texto);
    
    chrome.storage.local.set({ 
        selectedText: textoLimpio,
        fuente: fuente,
        timestamp: Date.now(),
        url: window.location.href
    }, () => {
        console.log(`📦 Texto guardado en storage (${textoLimpio.length} chars) - Fuente: ${fuente}`);
        
        // Opcional: abrir popup automáticamente
        chrome.runtime.sendMessage({ type: "ABRIR_POPUP" });
    });
    
    return true;
}

// ==================== MANEJADOR DE SELECCIÓN DE TEXTO ====================
let timeoutSeleccion = null;

document.addEventListener('mouseup', (event) => {
    // Delay para asegurar que la selección está completa
    if (timeoutSeleccion) clearTimeout(timeoutSeleccion);
    
    timeoutSeleccion = setTimeout(() => {
        const selection = window.getSelection();
        const textoSeleccionado = selection?.toString()?.trim();
        
        if (textoSeleccionado && textoSeleccionado.length >= MIN_TEXT_LENGTH) {
            console.log(`🖱️ Texto seleccionado por mouse: ${textoSeleccionado.substring(0, 50)}...`);
            
            // Opcional: mostrar un pequeño tooltip o notificación
            mostrarTooltip(event.clientX, event.clientY, textoSeleccionado.length);
        }
    }, 100);
});

// ==================== TOOLTIP INFORMATIVO (OPCIONAL) ====================
function mostrarTooltip(x, y, length) {
    // Eliminar tooltip anterior si existe
    const tooltipAnterior = document.querySelector('.phishing-tooltip');
    if (tooltipAnterior) tooltipAnterior.remove();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'phishing-tooltip';
    tooltip.innerHTML = `
        <div style="
            position: fixed;
            top: ${y + 15}px;
            left: ${x + 10}px;
            background: #2e7d32;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
            animation: fadeOut 2s ease forwards;
        ">
            🌲 ${length} caracteres - Clic derecho para analizar
        </div>
        <style>
            @keyframes fadeOut {
                0% { opacity: 1; }
                70% { opacity: 1; }
                100% { opacity: 0; visibility: hidden; }
            }
        </style>
    `;
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
        if (tooltip && tooltip.remove) tooltip.remove();
    }, 2000);
}

// ==================== ESCUCHAR MENSAJES DEL POPUP ====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("📨 Mensaje recibido en content script:", request);
    
    if (request.action === "getSelectedText") {
        const { texto, fuente } = extractSelectedText();
        sendResponse({ 
            text: texto, 
            fuente: fuente,
            url: window.location.href,
            timestamp: Date.now()
        });
        return true;
    }
    
    if (request.action === "analizarSeleccionActual") {
        const { texto, fuente } = extractSelectedText();
        if (texto) {
            enviarTextoAlBackground(texto, fuente);
            sendResponse({ success: true, length: texto.length });
        } else {
            sendResponse({ success: false, error: "No se pudo extraer texto" });
        }
        return true;
    }
});

// ==================== INICIALIZACIÓN ====================
console.log(`🌲 Content script activo en: ${window.location.hostname}`);
console.log("💡 Selecciona texto → Clic derecho → 'Detectar Phishing con Random Forest'");

// Notificar que el content script está listo
chrome.runtime.sendMessage({ 
    type: "CONTENT_SCRIPT_READY", 
    url: window.location.href 
});