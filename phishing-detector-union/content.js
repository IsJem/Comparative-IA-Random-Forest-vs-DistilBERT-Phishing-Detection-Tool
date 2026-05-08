// content.js - Extracción de texto mejorada
// Utilice la IA Deepseek para desarrollar el mismo
console.log("Phishing Detector - Content script cargado");

// Escuchar mensajes del popup (por si se necesita en el futuro)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSelectedText") {
        let texto = "";

        // Método 1: Texto seleccionado directamente
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            texto = selection.toString().trim();
            console.log("✅ Texto obtenido por selección:", texto.substring(0, 50));
        }

        // Método 2: Buscar en Gmail (por si el usuario selecciona poco)
        if (!texto && window.location.hostname.includes("mail.google.com")) {
            const emailBody = document.querySelector('.a3s.aiL') ||
                             document.querySelector('.gs') ||
                             document.querySelector('div[role="textbox"]');
            if (emailBody) {
                texto = emailBody.innerText || emailBody.textContent;
                console.log("✅ Texto obtenido de Gmail:", texto.substring(0, 50));
            }
        }

        sendResponse({ text: texto });
        return true;
    }
});