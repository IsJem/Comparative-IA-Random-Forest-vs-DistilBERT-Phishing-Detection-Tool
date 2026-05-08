// background.js - Menú contextual y manejo de clics
// Utilice la IA Deepseek para ponerlo en ORDEN y no perderme
console.log("🔍 Phishing Detector - Background script cargado");

// Crear menú contextual al instalar la extensión
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "analyzePhishing",
        title: "🔍 Analizar con Phishing Detector",
        contexts: ["selection"]
    });
    console.log("✅ Menú contextual creado");
});

// Manejar clic en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "analyzePhishing") {
        const selectedText = info.selectionText;
        
        if (selectedText && selectedText.length >= 10) {
            // Guardar el texto seleccionado y abrir el popup
            chrome.storage.local.set({ selectedText: selectedText }, () => {
                chrome.action.openPopup();
            });
        } else {
            // Mostrar notificación si el texto es muy corto
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon48.png",
                title: "Phishing Detector",
                message: "Selecciona más texto (mínimo 10 caracteres)."
            });
        }
    }
});