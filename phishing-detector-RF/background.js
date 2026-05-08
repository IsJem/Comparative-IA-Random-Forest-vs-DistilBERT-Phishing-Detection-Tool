// background.js - Menú contextual para detección de phishing con Random Forest
// Modelo superior: más rápido, ligero y preciso para CPU local

console.log("🌲 Phishing Detector (Random Forest) - Background script cargado");

// ==================== CONSTANTES ====================
const MIN_TEXT_LENGTH = 10;
const CONTEXT_MENU_ID = "analyzePhishingRF";

// ==================== CREAR MENÚ CONTEXTUAL ====================
chrome.runtime.onInstalled.addListener(() => {
    // Eliminar menú anterior si existe (por si acaso)
    chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
        // Crear nuevo menú
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: "🌲 Detectar Phishing con Random Forest",
            contexts: ["selection"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error al crear menú contextual:", chrome.runtime.lastError);
            } else {
                console.log("✅ Menú contextual creado correctamente");
            }
        });
    });
});

// ==================== MANEJAR CLIC EN EL MENÚ ====================
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
        const selectedText = info.selectionText;
        
        if (!selectedText) {
            mostrarNotificacion(
                "Texto no válido",
                "No se ha seleccionado ningún texto."
            );
            return;
        }
        
        const trimmedText = selectedText.trim();
        const textLength = trimmedText.length;
        
        if (textLength >= MIN_TEXT_LENGTH) {
            // Guardar el texto seleccionado y abrir el popup
            chrome.storage.local.set({ 
                selectedText: trimmedText,
                timestamp: Date.now()
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error al guardar texto:", chrome.runtime.lastError);
                    mostrarNotificacion(
                        "Error",
                        "No se pudo procesar el texto seleccionado."
                    );
                } else {
                    console.log(`✅ Texto guardado (${textLength} caracteres)`);
                    chrome.action.openPopup();
                }
            });
        } else {
            // Texto demasiado corto
            mostrarNotificacion(
                "⚠️ Texto muy corto",
                `Selecciona al menos ${MIN_TEXT_LENGTH} caracteres. (Actual: ${textLength})`
            );
        }
    }
});

// ==================== FUNCIÓN PARA NOTIFICACIONES ====================
function mostrarNotificacion(titulo, mensaje) {
    // Verificar si la API de notificaciones está disponible
    if (chrome.notifications) {
        chrome.notifications.create(
            {
                type: "basic",
                iconUrl: "icon48.png",
                title: titulo,
                message: mensaje,
                priority: 2
            },
            (notificationId) => {
                if (chrome.runtime.lastError) {
                    console.error("Error al crear notificación:", chrome.runtime.lastError);
                } else {
                    console.log(`Notificación creada: ${notificationId}`);
                    
                    // Auto-cerrar después de 3 segundos
                    setTimeout(() => {
                        chrome.notifications.clear(notificationId, () => {});
                    }, 3000);
                }
            }
        );
    } else {
        console.log(`[Notificación] ${titulo}: ${mensaje}`);
    }
}

// ==================== ESCUCHAR CUANDO EL POPUP SE ABRE ====================
chrome.action.onClicked.addListener((tab) => {
    // Esto se ejecuta cuando se hace clic en el ícono sin texto seleccionado
    console.log("Ícono clickeado - esperando selección de texto");
    chrome.storage.local.get(['selectedText'], (result) => {
        if (!result.selectedText) {
            mostrarNotificacion(
                "💡 Consejo rápido",
                "Selecciona un email o texto sospechoso, haz clic derecho y elige 'Detectar Phishing con Random Forest'"
            );
        }
    });
});

// ==================== LIMPIAR TEXTO ANTIGUO AL CERRAR POPUP ====================
// Opcional: limpiar el texto guardado después de que el popup se cierre
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "popup") {
        port.onDisconnect.addListener(() => {
            // Pequeño delay para evitar conflictos
            setTimeout(() => {
                chrome.storage.local.get(['selectedText'], (result) => {
                    if (result.selectedText) {
                        // No borramos inmediatamente por si el popup se reabre rápido
                        // En su lugar, marcamos como "leído"
                        console.log("Popup cerrado - texto marcado como leído");
                    }
                });
            }, 1000);
        });
    }
});

// ==================== MANEJO DE ERRORES GLOBAL ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_SELECTED_TEXT") {
        chrome.storage.local.get(['selectedText'], (result) => {
            sendResponse({ text: result.selectedText || null });
        });
        return true; // Respuesta asíncrona
    }
    
    if (message.type === "CLEAR_SELECTED_TEXT") {
        chrome.storage.local.remove('selectedText', () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

console.log("✅ Background script de Random Forest listo para usar");
console.log("📌 Instrucciones: Selecciona texto → Clic derecho → '🌲 Detectar Phishing con Random Forest'");