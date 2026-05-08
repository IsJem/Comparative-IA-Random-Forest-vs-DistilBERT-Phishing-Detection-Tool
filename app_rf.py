# app_rf.py - Servidor para Random Forest con SpaPhish
# Desarrollado con la ayuda de DeepSeekV3

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import os
import numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIGURACIÓN
# ============================================

FEEDBACK_FILE = 'rf_feedback.json'
LEARNING_FILE = 'rf_learning.json'
MODEL_PATH = 'output/random_forest/rf_model_spaphish.pkl'
VECTORIZER_PATH = 'output/random_forest/vectorizer_spaphish.pkl'

# ============================================
# CARGAR MODELO
# ============================================

print("=" * 50)
print("🌲 Cargando Random Forest con SpaPhish...")
print("=" * 50)

if not os.path.exists(MODEL_PATH):
    print(f"❌ ERROR: No se encuentra {MODEL_PATH}")
    print("   Verifica que el modelo entrenado exista")
    exit(1)

try:
    rf_model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    print("✅ Random Forest cargado correctamente")
    print(f"📊 Clases del modelo: {rf_model.classes_}")
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
    
    # Mantener solo los últimos 1000 ejemplos
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
        # Vectorizar y predecir
        vec = vectorizer.transform([text])
        proba = rf_model.predict_proba(vec)[0]
        pred = rf_model.predict(vec)[0]
        
        # CORREGIDO: Manejo robusto de probabilidades
        if len(proba) == 2:
            prob_phishing = float(proba[1])
            prob_seguro = float(proba[0])
        else:
            # Si solo tiene una clase, inferir
            if len(rf_model.classes_) == 1:
                unique_class = rf_model.classes_[0]
                if unique_class == 1 or unique_class == 'PHISHING':
                    prob_phishing = 1.0
                    prob_seguro = 0.0
                    pred = 1
                else:
                    prob_phishing = 0.0
                    prob_seguro = 1.0
                    pred = 0
            else:
                prob_phishing = 0.5
                prob_seguro = 0.5
        
        resultado = "PHISHING" if pred == 1 else "SEGURO"
        
        # Confianza = probabilidad de la clase predicha
        if resultado == "PHISHING":
            confianza = prob_phishing
        else:
            confianza = prob_seguro
        
        # Sanitizar: evitar NaN, None, valores fuera de rango
        if confianza is None or np.isnan(confianza) or np.isinf(confianza):
            confianza = 0.95 if resultado == "PHISHING" else 0.95
            print(f"⚠️ [RF] Se detectó valor inválido, usando default: {confianza}")
        
        # Limitar entre 0.5 y 0.99 para evitar extremos
        confianza = max(0.5, min(0.99, confianza))
        
        print(f"🌲 [RF] '{text[:60]}...' → {resultado} (conf: {confianza:.3f})")
        
        return jsonify({
            "result": resultado,
            "confidence": round(confianza, 4),
            "model": "Random Forest (SpaPhish)"
        })
        
    except Exception as e:
        print(f"❌ [RF] Error en análisis: {e}")
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
        
        print(f"📝 [RF] Feedback: {correccion} - {texto[:50]}...")
        return jsonify({"success": True, "message": "Feedback guardado"})
        
    except Exception as e:
        print(f"❌ [RF] Error en feedback: {str(e)}")
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
        "model": "Random Forest (SpaPhish)",
        "puerto": 5001
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 RANDOM FOREST - SERVIDOR")
    print("=" * 50)
    print(f"🌐 Puerto: 5001")
    print(f"📊 Clases: {rf_model.classes_}")
    print("=" * 50)
    print("✅ Servidor listo para recibir peticiones")
    print("=" * 50)
    app.run(host='127.0.0.1', port=5001, debug=False, threaded=True)