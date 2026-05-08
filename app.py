# app_db.py - Servidor para DistilBERT con SpaPhish (español)
# Desarrollado con la ayuda de DeepSeekV3

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import os
import json
import numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIGURACIÓN
# ============================================

FEEDBACK_FILE = 'db_feedback.json'
LEARNING_FILE = 'db_learning.json'
MODEL_PATH = 'output/distilbert'

# ============================================
# CARGAR MODELO DISTILBERT
# ============================================

print("=" * 50)
print("🤖 Cargando DistilBERT con SpaPhish (español)...")
print("=" * 50)

if not os.path.exists(MODEL_PATH):
    print(f"❌ ERROR: No se encuentra la carpeta '{MODEL_PATH}'")
    print("   Verifica que el modelo entrenado exista")
    exit(1)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"📱 Dispositivo: {device}")

try:
    tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
    model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()
    print("✅ DistilBERT cargado correctamente")
    print(f"📊 Configuración: {model.config.num_labels} clases")
    print(f"📊 Modelo entrenado con SpaPhish (1,395 emails en español)")
except Exception as e:
    print(f"❌ Error cargando modelo: {e}")
    exit(1)

# ============================================
# FUNCIONES
# ============================================

def guardar_feedback(texto, prediccion, correccion, confianza):
    feedbacks = []
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
            feedbacks = json.load(f)
    
    feedbacks.append({
        "texto": texto,
        "prediccion": prediccion,
        "correccion": correccion,
        "confianza": confianza,
        "timestamp": datetime.now().isoformat()
    })
    
    with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
        json.dump(feedbacks, f, indent=2, ensure_ascii=False)
    
    return len(feedbacks)

def guardar_ejemplo_aprendizaje(texto, categoria, prediccion_original, confianza):
    ejemplos = []
    if os.path.exists(LEARNING_FILE):
        with open(LEARNING_FILE, 'r', encoding='utf-8') as f:
            ejemplos = json.load(f)
    
    ejemplos.append({
        "texto": texto,
        "categoria": categoria,
        "prediccion_original": prediccion_original,
        "confianza": confianza,
        "timestamp": datetime.now().isoformat()
    })
    
    if len(ejemplos) > 1000:
        ejemplos = ejemplos[-1000:]
    
    with open(LEARNING_FILE, 'w', encoding='utf-8') as f:
        json.dump(ejemplos, f, indent=2, ensure_ascii=False)
    
    return len(ejemplos)

# ============================================
# ENDPOINTS
# ============================================

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')
    
    if not text or len(text) < 5:
        return jsonify({
            "result": "SEGURO",
            "confidence": 0.5,
            "error": "Texto muy corto (mínimo 5 caracteres)"
        }), 200
    
    try:
        # Tokenizar
        encoding = tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=256,
            return_tensors='pt'
        )
        
        # Mover a dispositivo
        encoding = {k: v.to(device) for k, v in encoding.items()}
        
        # Inferencia
        with torch.no_grad():
            output = model(**encoding)
        
        logits = output.logits
        probs = torch.softmax(logits, dim=1)[0]
        
        # Obtener clase y probabilidad
        pred = torch.argmax(probs).item()
        prob = probs[pred].item()
        
        resultado = "PHISHING" if pred == 1 else "SEGURO"
        confianza = float(prob)
        
        # Sanitizar: evitar NaN o valores inválidos
        if confianza is None or np.isnan(confianza) or np.isinf(confianza):
            confianza = 0.9 if resultado == "PHISHING" else 0.9
            print(f"⚠️ [DB] Se detectó valor inválido, usando default: {confianza}")
        
        # Limitar entre 0.5 y 0.99
        confianza = max(0.5, min(0.99, confianza))
        
        print(f"🤖 [DB] '{text[:60]}...' → {resultado} (conf: {confianza:.3f})")
        
        return jsonify({
            "result": resultado,
            "confidence": round(confianza, 4),
            "model": "DistilBERT (SpaPhish)"
        })
        
    except Exception as e:
        print(f"❌ [DB] Error en análisis: {e}")
        return jsonify({
            "result": "SEGURO",
            "confidence": 0.5,
            "error": "Error interno del modelo"
        }), 200

@app.route('/feedback', methods=['POST'])
def feedback():
    try:
        data = request.json
        texto = data.get('text', '')
        prediccion = data.get('original_prediction', '')
        correccion = data.get('correction', '')
        confianza = data.get('confidence', 0)
        
        if not texto or not correccion:
            return jsonify({"error": "Faltan datos"}), 400
        
        guardar_feedback(texto, prediccion, correccion, confianza)
        
        if correccion != 'correct':
            categoria = 'deberia_ser_seguro' if correccion == 'falso_positivo' else 'deberia_ser_phishing'
            guardar_ejemplo_aprendizaje(texto, categoria, prediccion, confianza)
        
        print(f"📝 [DB] Feedback: {correccion} - {texto[:50]}...")
        return jsonify({"success": True, "message": "Feedback guardado"})
        
    except Exception as e:
        print(f"❌ [DB] Error en feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/feedback/stats', methods=['GET'])
def feedback_stats():
    feedbacks = []
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
            feedbacks = json.load(f)
    
    correctos = sum(1 for f in feedbacks if f.get('correccion') == 'correct')
    falsos_positivos = sum(1 for f in feedbacks if f.get('correccion') == 'falso_positivo')
    falsos_negativos = sum(1 for f in feedbacks if f.get('correccion') == 'falso_negativo')
    
    return jsonify({
        "total": len(feedbacks),
        "correctos": correctos,
        "falsos_positivos": falsos_positivos,
        "falsos_negativos": falsos_negativos
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model": "DistilBERT (SpaPhish)",
        "puerto": 5000,
        "device": str(device)
    })
    
@app.route('/comparator')
def comparator_page():
    file_path = os.path.join(os.path.dirname(__file__), 'comparator.html')
    if not os.path.exists(file_path):
        return f"❌ Archivo no encontrado: {file_path}", 404
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 DISTILBERT - SERVIDOR")
    print("=" * 50)
    print(f"🌐 Puerto: 5000")
    print(f"📱 Dispositivo: {device}")
    print(f"📊 Clases: {model.config.num_labels}")
    print("=" * 50)
    print("✅ Servidor listo para recibir peticiones")
    print("=" * 50)
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)