# ⚖️ Phishing Detector - Sistema Híbrido de Detección de Phishing con ÁRBITRO

## 📌 Descripción General

Phishing Detector es un sistema completo de detección de phishing en tiempo real, integrado en una extensión de Google Chrome. El sistema compara dos enfoques complementarios: un modelo ligero de **Random Forest** desarrollado desde cero y un modelo avanzado de **DistilBERT** fine-tuneado con el dataset SpaPhish (1,395 correos en español).

Una contribución original de este trabajo es la implementación de un **ÁRBITRO**, un módulo que resuelve automáticamente las discrepancias entre ambos modelos cuando sus predicciones difieren. El ÁRBITRO pondera tres criterios: confianza de cada modelo (40%), características heurísticas del texto como idioma o presencia de URLs (35%) e historial de aciertos previos (25%). Basado en los resultados experimentales, Random Forest tiene prioridad por defecto por su superioridad en textos en español, detección de URLs y manejo de textos largos.

> 💡 **Herramienta individual de Random Forest**: Además del sistema comparativo completo, este proyecto ofrece una **extensión independiente** que utiliza exclusivamente el modelo Random Forest (modelo destacado de la investigación). Esta versión ligera está disponible para usuarios que prefieran una herramienta más simple, rápida y con menor consumo de recursos, manteniendo todas las capacidades de detección y el sistema de retroalimentación continua. [Ver sección de instalación](#-herramienta-individual-random-forest)

## 🚀 Características Principales

- **Extensión de Chrome funcional**: Analiza correos electrónicos directamente desde Gmail u Outlook con un clic derecho
- **Dos modelos en paralelo**: Compara resultados de Random Forest y DistilBERT lado a lado
- **⚖️ ÁRBITRO (Sistema de Desempate)**: Resuelve automáticamente discrepancias entre modelos cuando difieren sus predicciones
- **Explicaciones legibles**: Muestra al usuario por qué el ÁRBITRO decidió a favor de un modelo (ej: "Random Forest gana: texto en español + URL")
- **Sistema de retroalimentación continua**: Los usuarios pueden corregir al ÁRBITRO y el sistema aprende para futuras decisiones
- **Reentrenamiento automático**: Random Forest se reentrena al acumular 5 errores sin intervención manual
- **🌲 Herramienta individual Random Forest**: Versión ligera de la extensión que utiliza solo el modelo destacado de la investigación
- **Comparador web interactivo**: Visualiza estadísticas históricas, gráficos y tablas comparativas
- **Modo oscuro/claro**: Interfaz adaptable a las preferencias del usuario
- **Feedback al ÁRBITRO**: Opciones para indicar si acertó (✅) o falló (❌) cuando los modelos discrepan

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.12 | Backend y modelos ML |
| Flask | 3.1.2 | Servidores web |
| PyTorch | 2.5.1 | Deep learning para DistilBERT |
| Transformers (Hugging Face) | 4.47.1 | Modelo DistilBERT |
| scikit-learn | 1.6.1 | Random Forest y vectorización |
| Chrome Extensions API | Manifest V3 | Extensión de navegador |
| SpaPhish Dataset | - | 1,395 emails en español |

## 📊 Resultados Clave

| Métrica | Random Forest | DistilBERT |
|---------|---------------|------------|
| Precisión | 100% | 100% |
| Recall | 75.0% | 58.3% |
| F1-Score | 85.7% | 73.7% |
| Accuracy | 87.5% | 79.2% |
| Tiempo entrenamiento | 1.5 min | 35 min |
| Tamaño modelo | 5 MB | 260 MB |
| Inferencia | 0.05 seg | 0.5 seg |

### 🏆 Resultado del ÁRBITRO

| Métrica del ÁRBITRO | Valor |
|---------------------|-------|
| Precisión en desempate | 66.7% - 100% |
| Casos de discrepancia resueltos | Sí |
| Prioridad por defecto | Random Forest |
| Áreas de expertise DB | Inglés puro + texto muy corto |

```## 📁 Estructura del Proyecto
Phishing-Detector/
├── app_db.py # Servidor DistilBERT (puerto 5000)
├── app_rf.py # Servidor Random Forest (puerto 5001)
├── comparator.html # Página de estadísticas comparativas
├── phishing-detector-union/ # Extensión de Chrome (versión completa)
│ ├── manifest.json
│ ├── popup.html
│ ├── popup.js # Contiene el ÁRBITRO integrado
│ ├── content.js
│ └── background.js
├── phishing-detector-RF/ # 🌲 Extensión individual de Random Forest
│ ├── manifest.json
│ ├── popup.html
│ ├── popup.js # Versión simplificada (solo RF)
│ ├── content.js
│ └── background.js
├── output/ # Modelos entrenados y gráficas
│ ├── random_forest/
│ │ ├── rf_model.pkl
│ │ └── vectorizer.pkl
│ ├── distilbert/
│ │ ├── config.json
│ │ ├── model.safetensors
│ │ └── tokenizer.json
│ └── *.png # Gráficas y diagramas del paper
├── notebooks/
│ └── main.ipynb # Notebook principal (entrenamiento + gráficas)
├── iniciar_servidores.bat # Script para iniciar servidores
└── requirements.txt # Dependencias Python
```


## 🌲 Herramienta Individual: Random Forest

Como resultado de la investigación, donde Random Forest demostró ser el modelo superior en términos de eficiencia y rendimiento para entornos CPU, se pone a disposición una **extensión independiente** que utiliza exclusivamente este modelo.

### Ventajas de la versión individual (solo RF)

| Aspecto | Ventaja |
|---------|---------|
| **Simplicidad** | Interfaz más sencilla, solo muestra un resultado |
| **Velocidad** | Inferencia más rápida (solo un modelo) |
| **Recursos** | Menor consumo de CPU y memoria |
| **Tamaño** | Extensión más liviana |
| **Mantenimiento** | Solo requiere el servidor RF (puerto 5001) |

### ¿Cuándo usar cada versión?

| Situación | Versión recomendada |
|-----------|---------------------|
| Quieres comparar ambos modelos | 🔬 Versión completa (con ÁRBITRO) |
| Necesitas máxima velocidad y simplicidad | 🌲 Versión individual (solo RF) |
| Tienes recursos limitados en tu PC | 🌲 Versión individual (solo RF) |
| Quieres ver explicaciones detalladas | 🔬 Versión completa (con ÁRBITRO) |
| Eres usuario avanzado que quiere experimentar | 🔬 Versión completa |

## 🔧 Instalación y Uso

### Requisitos Previos
- Python 3.12 o superior
- Google Chrome

### Instalación Completa (con ÁRBITRO y ambos modelos)

1. **Clonar el repositorio**
```bash
git clone https://github.com/tuusuario/phishing-detector.git
cd phishing-detector
Crear y activar entorno virtual 

bash
python -m venv phishing-env
phishing-env\Scripts\activate  # Windows
Instalar dependencias

bash
pip install -r requirements.txt
Ejecutar servidores

bash
python app_rf.py     # Random Forest (puerto 5001)
python app_db.py     # DistilBERT (puerto 5000)
Cargar extensión completa en Chrome
```

Abrir chrome://extensions/

Activar "Modo de desarrollador"

Clic en "Cargar extensión sin empaquetar"

Seleccionar carpeta phishing-detector-union

🌲 Instalación Individual (solo Random Forest)
Si prefieres la versión ligera con solo el modelo Random Forest:

Ejecutar solo el servidor de Random Forest
```
bash
python app_rf.py     # Puerto 5001
Cargar extensión individual en Chrome
```
Abrir chrome://extensions/

Activar "Modo de desarrollador"

Clic en "Cargar extensión sin empaquetar"

Seleccionar carpeta phishing-detector-RF

Uso (ambas versiones)
Abrir Gmail u Outlook o cualquier tipo de texto que le gustaría analizar 

Seleccionar texto de un email (mínimo 10 caracteres)

Clic derecho → "Analizar con Phishing Detector"

Ver resultado del modelo

Marcar ✅ Correcto o ❌ Incorrecto para mejorar el modelo

(Versión completa) Visitar http://127.0.0.1:5000/comparator para estadísticas

🧠 Funcionamiento del ÁRBITRO (versión completa)
Cuando Random Forest y DistilBERT discrepan, el ÁRBITRO (integrado en popup.js) decide basado en:

Criterio	Peso	Detalle
Confianza	40%	El modelo con mayor confianza tiene ventaja
Heurísticas	35%	Español (+20% RF), URLs (+25% RF), inglés+corto (+15% DB)
Historial	25%	Registro de aciertos previos del usuario
Decisión por defecto: Random Forest gana (respaldado por resultados experimentales)

📈 Próximas Mejoras
Segunda capa de seguridad con análisis de URLs (como entidades independientes)

Mejora de la precisión de ambos modelos con más feedback de usuarios

Optimización de hiperparámetros para reducir falsos negativos

Detección automática sin selección manual de texto

Alertas en tiempo real al abrir emails

Análisis de adjuntos maliciosos

Despliegue en Chrome Web Store (ambas versiones)

👨‍🎓 Autor
Isaac J. Cruz Nieves - Estudiante de Seguridad Cibernética

Universidad Interamericana de Puerto Rico - Recinto de Bayamón

Curso: CYSC 4500 - Capstone Project

Profesor: Hacniel Cardona

🙏 Agradecimientos
Al profesor Hacniel Cardona de la Universidad Interamericana de Puerto Rico - Recinto de Bayamón por su guía durante el desarrollo del proyecto.

📚 Referencias
Artículos Académicos

Arroyabe, M. F., Arranz, N., & Fernandez de Arroyabe, J. C. (2024). Revealing the realities of cybercrime in small and medium enterprises: Understanding fear and taxonomic perspectives. Computers & Security, 124, Article 102954.

Halim, M. I., Hasan, M. Z., Kabir, M. H., Hasan, M. N., Jaki, H., Ahmad, H., & Hasan, H. (2025). Enhancing phishing detection: A machine learning approach to predicting malicious emails, URLs, and SMS messages. Applied Computational Intelligence and Soft Computing, 2025, Article 6633979.

Jafar, M. T. (2025). An innovative practical roadmap for optimal control strategies in malware propagation through the integration of RL with MPC. Computers & Security, 136, Article 103491.

Luo, Q. (2024). Cybercrime as an industry: Examining the organisational structure of Chinese cybercrime. Humanities and Social Sciences Communications, 11, Article 4042.

Pedregosa, F., et al. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825–2830.

Razzaq, K. (2025). Empowering machine learning for robust cyber-attack prevention in online retail: An integrative analysis. Humanities and Social Sciences Communications, 12, Article 4636.

Sufi, F. (2023). A global cyber-threat intelligence system with artificial intelligence and convolutional neural network. Computers & Electrical Engineering, 112, Article 108921.

Tarapiah, S., et al. (2025). Evaluating the effectiveness of large language models (LLMs) versus machine learning (ML) in identifying and detecting phishing email attempts. Algorithms, 18(10), Article 599.

Wolf, T., et al. (2020). Transformers: State-of-the-art natural language processing. In Proceedings of EMNLP 2020: System Demonstrations (pp. 38–45). ACL.

Libros

Sahoo, A. K. (Ed.). (2023). Building intelligent systems using machine learning and deep learning: Security, applications and its challenges. Nova Science Publishers.

Proyectos de Inspiración

Martinez, N. E., Vazquez, E. M., & Negron, C. (2023). Phishing Identification and Decision Support System (PIDSS). GitHub.

Datasets

SpaPhish Dataset. (2025). SpaPhish: A Spanish phishing email dataset. Mendeley Data.

Software y Frameworks

Facebook AI Research. (2023). PyTorch 2.0.

Grinberg, M. (2018). Flask 2.x.

Hugging Face. (2023). Transformers 4.x.

Google. (2023). Chrome Extensions API (Manifest V3).
